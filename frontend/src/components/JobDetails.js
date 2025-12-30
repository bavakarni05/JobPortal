import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { translateText } from '../utils/translateText';
import '../job-details.css';

function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applied, setApplied] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({ applicantName: '', age: '', address: '', contactNo: '' });
  const [resume, setResume] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { t, locale, language } = useLanguage();
  const [translated, setTranslated] = useState(null);
  const username = localStorage.getItem('username');

  useEffect(() => {
    fetchJob();
    // Check if already applied
    if (username) {
      fetch(`/api/my-applications?username=${username}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.some(a => a.job?._id === jobId)) setApplied(true);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line
  }, [jobId]);

  useEffect(() => {
    return () => {
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  // Re-translate when language changes or job loads
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!job) { setTranslated(null); return; }
      const target = language === 'ta' ? 'ta' : language === 'hi' ? 'hi' : language === 'te' ? 'te' : 'en';
      if (target === 'en') { setTranslated(null); return; }
      const [title, description, company, location] = await Promise.all([
        translateText(job.title, target),
        translateText(job.description, target),
        translateText(job.company, target),
        translateText(job.location, target)
      ]);
      if (!cancelled) setTranslated({ title, description, company, location });
    }
    run();
    return () => { cancelled = true; };
  }, [job, language]);

  const fetchJob = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/all-jobs');
      const data = await res.json();
      if (res.ok) {
        const found = data.find(j => j._id === jobId);
        setJob(found);
        if (!found) setError(t('job_not_found'));
        else {
          // trigger translation if needed
          const target = language === 'ta' ? 'ta' : language === 'hi' ? 'hi' : language === 'te' ? 'te' : 'en';
          if (target !== 'en') {
            const [title, description, company, location] = await Promise.all([
              translateText(found.title, target),
              translateText(found.description, target),
              translateText(found.company, target),
              translateText(found.location, target)
            ]);
            setTranslated({ title, description, company, location });
          } else {
            setTranslated(null);
          }
        }
      } else setError(data.error || 'Failed to fetch job');
    } catch {
      setError(t('error_network'));
    }
    setLoading(false);
  };

  const openApply = () => {
    setShowApply(true);
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('jobId', jobId);
      formData.append('username', username || '');
      formData.append('applicantName', applyForm.applicantName);
      formData.append('age', applyForm.age);
      formData.append('address', applyForm.address);
      formData.append('contactNo', applyForm.contactNo);
      if (resume) formData.append('resume', resume);

      const res = await fetch('/api/apply', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setSuccess(t('application_submitted'));
        setApplied(true);
        setShowApply(false);
      } else setError(data.error || 'Failed to apply');
    } catch {
      setError(t('error_network'));
    }
  };

  const speakText = () => {
    if (!job) return;
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported in this browser');
      return;
    }
    const title = translated?.title || job.title;
    const company = translated?.company || job.company;
    const location = translated?.location || job.location;
    const description = translated?.description || job.description;
    const text = `${title}. ${company}. ${location}. ${description}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.onend = () => setIsSpeaking(false);
    try { window.speechSynthesis.cancel(); } catch {}
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const stopSpeech = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    setIsSpeaking(false);
  };

  if (loading) return <div className="dashboard-container">{t('loading')}</div>;
  if (error) return <div className="dashboard-container" style={{ color: 'red' }}>{error}</div>;
  if (!job) return <div className="dashboard-container">{t('job_not_found')}</div>;

  return (
    <div className="dashboard-container" style={{ paddingTop: 64 }}>
      <div className="header-bar">
        <div className="header-title" style={{ cursor: 'pointer' }} onClick={() => navigate(-1)}>{t('app_title')}</div>
      </div>
      <div className="job-details">
        <h2 className="job-title-lg">{translated?.title || job.title}</h2>
        <div className="meta-item"><span className="meta-label">{t('company')}:</span><span className="meta-value">{translated?.company || job.company}</span></div>
        <div className="meta-item"><span className="meta-label">{t('location')}:</span><span className="meta-value">{translated?.location || job.location}</span></div>
        <div className="description"><span className="meta-label">{t('description')}:</span> <span className="meta-value">{translated?.description || job.description}</span></div>
        <div className="badge-group">
          {job.jobType && <span className="badge">{t('job_type')}: {job.jobType}</span>}
          {job.workMode && <span className="badge">{t('work_mode')}: {job.workMode}</span>}
          {typeof job.durationWeeks === 'number' && <span className="badge">{t('duration_weeks')}: {job.durationWeeks}</span>}
          {(job.stipendMin || job.stipendMax) && <span className="badge">{t('stipend')}: {job.stipendMin || 0}-{job.stipendMax || 0}</span>}
          {job.openings && <span className="badge">{t('openings')}: {job.openings}</span>}
          {job.startDate && <span className="badge">{t('start_date')}: {new Date(job.startDate).toLocaleDateString()}</span>}
          {job.applyBy && <span className="badge">{t('apply_by')}: {new Date(job.applyBy).toLocaleDateString()}</span>}
        </div>
        {(Array.isArray(job.skills) && job.skills.length > 0) && (
          <div className="meta-item" style={{ marginBottom: 8 }}>
            <span className="meta-label">{t('skills')}:</span><span className="meta-value">{job.skills.join(', ')}</span>
          </div>
        )}
        {(Array.isArray(job.perks) && job.perks.length > 0) && (
          <div className="meta-item" style={{ marginBottom: 8 }}>
            <span className="meta-label">{t('perks')}:</span><span className="meta-value">{job.perks.join(', ')}</span>
          </div>
        )}
        <div className="action-row">
          <button onClick={isSpeaking ? stopSpeech : speakText} style={{ marginTop: 8 }}>
            {isSpeaking ? t('stop') : t('listen')}
          </button>
        </div>
        <div className="muted">{t('posted_by')} {job.postedBy?.username || 'Unknown'}</div>
        {!applied && username && (
          <button onClick={openApply} className="btn-primary" style={{ marginTop: 12 }}>{t('apply')}</button>
        )}
        {applied && <div className="success" style={{ marginTop: 12 }}>{t('applied')}</div>}
        {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
        {success && <div className="success" style={{ marginTop: 10 }}>{success}</div>}
        <div className="action-row" style={{ marginTop: 16 }}>
          <button onClick={() => navigate(-1)} className="btn-secondary">{t('back')}</button>
        </div>
      </div>

      {showApply && (
        <div className="modal-overlay" onClick={() => setShowApply(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{t('apply_for')} {job.title}</h3>
            <form onSubmit={submitApplication}>
              <div className="form-grid">
                <div className="full">
                  <label className="label">{t('full_name')}</label>
                  <input className="input" value={applyForm.applicantName} onChange={e => setApplyForm({ ...applyForm, applicantName: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{t('age')}</label>
                  <input className="input" type="number" value={applyForm.age} onChange={e => setApplyForm({ ...applyForm, age: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{t('contact_no')}</label>
                  <input className="input" value={applyForm.contactNo} onChange={e => setApplyForm({ ...applyForm, contactNo: e.target.value })} required />
                </div>
                <div className="full">
                  <label className="label">{t('address')}</label>
                  <textarea className="textarea" value={applyForm.address} onChange={e => setApplyForm({ ...applyForm, address: e.target.value })} required />
                </div>
                <div className="full">
                  <label className="label">{t('resume_upload')}</label>
                  <input className="input" type="file" accept=".pdf,.doc,.docx" onChange={e => setResume(e.target.files[0])} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowApply(false)}>{t('cancel')}</button>
                <button type="submit" className="btn-primary">{t('submit_application')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobDetails; 