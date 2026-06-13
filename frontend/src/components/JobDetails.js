import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { translateText } from '../utils/translateText';
import '../job-details.css';
import CompanyReview from './CompanyReview';

const BACKEND_URL = 'https://jobportal-5-b3v6.onrender.com';

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
  const { t, language } = useLanguage();
  const [translated, setTranslated] = useState(null);
  const username = localStorage.getItem('username');

  useEffect(() => {
    fetchJob();
    // Check if already applied
    if (username) {
      fetch(`${BACKEND_URL}/api/my-applications?username=${username}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.some(a => a.job?._id === jobId)) setApplied(true);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line
  }, [jobId]);

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
      const res = await fetch(`${BACKEND_URL}/api/all-jobs`);
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

      const res = await fetch(`${BACKEND_URL}/api/apply`, { method: 'POST', body: formData });
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

  if (loading) return <div className="dashboard-container">{t('loading')}</div>;
  if (error) return <div className="dashboard-container" style={{ color: 'red' }}>{error}</div>;
  if (!job) return <div className="dashboard-container">{t('job_not_found')}</div>;

  return ( /* The main container now uses the landing class for background and orbs */
    <div className="dashboard-container landing">
      <div className="hero__bg">
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />
        <div className="hero__orb hero__orb--3" />
      </div>
      
      <div className="landing-nav landing-nav--scrolled">
        <div className="landing-nav__inner">
          <div className="landing-nav__logo" style={{ cursor: 'pointer' }} onClick={() => navigate(-1)}>
            <div className="landing-nav__logo-icon">JD</div> {/* Job Details logo icon */}
            {t('app_title')}
          </div>
          <div className="landing-nav__right-section">
            <button className="btn-secondary" onClick={() => navigate(-1)}>{t('back')}</button>
          </div>
        </div>
      </div>

      <div className="job-details feature-card" style={{ maxWidth: 800, margin: '0 auto', textAlign: 'left' }}>
        <h2 className="job-title">{translated?.title || job.title}</h2>
        <div className="job-meta">{translated?.company || job.company} • {translated?.location || job.location}</div>
        <div className="description" style={{ marginBottom: 16, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{translated?.description || job.description}</div>
        
        <div className="badge-group">
          {job.jobType && <span className="badge">{t('job_type')}: {job.jobType}</span>}
          {job.workMode && <span className="badge">{t('work_mode')}: {job.workMode}</span>}
          {typeof job.durationWeeks === 'number' && <span className="badge">{t('duration_weeks')}: {job.durationWeeks}</span>}
          {(job.stipendMin || job.stipendMax) && <span className="badge">{t('stipend')}: {job.stipendMin || 0}-{job.stipendMax || 0}</span>}
          {job.openings && <span className="badge">{t('openings')}: {job.openings}</span>}
          {job.startDate && <span className="badge">{t('start_date')}: {new Date(job.startDate).toLocaleDateString()}</span>}
          {job.applyBy && <span className="badge">{t('apply_by')}: {new Date(job.applyBy).toLocaleDateString()}</span>}
        </div>
        {job.skills && job.skills.length > 0 && (
          <div className="job-meta" style={{ marginTop: 16 }}>
            <span style={{ fontWeight: 600 }}>{t('skills')}:</span> {job.skills.join(', ')}
          </div>
        )}
        {job.perks && job.perks.length > 0 && (
          <div className="job-meta">
            <span style={{ fontWeight: 600 }}>{t('perks')}:</span> {job.perks.join(', ')}
          </div>
        )}
        <div className="job-meta" style={{ marginTop: 16 }}>{t('posted_by')} {job.postedBy?.username || 'Unknown'}</div>
        {!applied && username && (
          <button onClick={openApply} className="btn-primary" style={{ marginTop: 24 }}>{t('apply')}</button>
        )}
        {applied && <div className="success" style={{ marginTop: 12 }}>{t('applied')}</div>}
        {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
        {success && <div className="success" style={{ marginTop: 10 }}>{success}</div>}
        <CompanyReview companyName={job.company} />
      </div>

      {showApply && (
        <div className="modal-overlay" onClick={() => setShowApply(false)} style={{ zIndex: 1000 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <h3>{t('apply_for')} {job.title}</h3>
            <form onSubmit={submitApplication}>
              <div className="form-grid">
                <div className="full">
                  <label className="label">{t('full_name')}</label> {/* Added label class */}
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
              </div> {/* Moved modal-actions to use the new class */}
              <div className="modal-actions" style={{ marginTop: 32 }}>
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