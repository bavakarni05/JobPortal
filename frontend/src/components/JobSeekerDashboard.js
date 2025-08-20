import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Chats from './Chats';
import { useLanguage } from '../LanguageContext';
import { translateText } from '../utils/translateText';
import womenImage from '../women1.jpg';

function JobSeekerDashboard({ onLogout }) {
  const [section, setSection] = useState('home'); // home | view | applications | chats
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [query, setQuery] = useState('');
  const [expandedJob, setExpandedJob] = useState(null);
  const [showApply, setShowApply] = useState(false);
  const [applyForJob, setApplyForJob] = useState(null);
  const [applyForm, setApplyForm] = useState({ applicantName: '', age: '', address: '', email: '' });
  const [resume, setResume] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Filters (Internshala-like)
  const [showFilters, setShowFilters] = useState(false);
  const [filterJobType, setFilterJobType] = useState(''); // '' | 'job' | 'internship'
  const [filterWorkMode, setFilterWorkMode] = useState(''); // '' | 'onsite' | 'remote' | 'hybrid'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinStipend, setFilterMinStipend] = useState('');
  const [filterDurationMax, setFilterDurationMax] = useState('');
  const [filterStartFrom, setFilterStartFrom] = useState('');
  const [filterSkillsCsv, setFilterSkillsCsv] = useState('');
  const [filterPerksCsv, setFilterPerksCsv] = useState('');

  const { t, locale } = useLanguage();

  const username = localStorage.getItem('username') || 'JobSeeker';
  const navigate = useNavigate();

  useEffect(() => {
    if (section === 'view') fetchJobs();
    if (section === 'applications') fetchApplications();
    if (section === 'saved') fetchSaved();
    // eslint-disable-next-line
  }, [section]);

  const fetchJobs = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/all-jobs');
      const data = await res.json();
      if (res.ok) {
        setAllJobs(data); setJobs(data);
        const appRes = await fetch(`/api/my-applications?username=${username}`);
        const appData = await appRes.json();
        if (appRes.ok) setAppliedJobIds(appData.map(a => a.job?._id));
      } else setError(data.error || 'Failed to fetch jobs');
    } catch {
      setError(t('error_network'));
    }
    setLoading(false);
  };

  const fetchSaved = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/saved?username=${username}`);
      const data = await res.json();
      if (res.ok) {
        setSavedJobs(data);
        setSavedJobIds(data.map(j => j._id));
      } else setError(data.error || 'Failed to fetch saved jobs');
    } catch {
      setError(t('error_network'));
    }
    setLoading(false);
  };

  const fetchApplications = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/my-applications?username=${username}`);
      const data = await res.json();
      if (res.ok) setApplications(data);
      else setError(data.error || 'Failed to fetch applications');
    } catch {
      setError(t('error_network'));
    }
    setLoading(false);
  };

  const handleSearch = (text) => {
    setQuery(text);
    const q = text.trim().toLowerCase();
    if (!q) { setJobs(allJobs); return; }
    setJobs(allJobs.filter(j => {
      const original = j.title?.toLowerCase() || '';
      const translatedTitle = translatedMap[j._id]?.title?.toLowerCase() || '';
      return original.includes(q) || translatedTitle.includes(q);
    }));
  };

  const applyFilters = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (filterJobType) params.set('jobType', filterJobType);
      if (filterWorkMode) params.set('workMode', filterWorkMode);
      if (filterCategory.trim()) params.set('category', filterCategory.trim());
      if (filterLocation.trim()) params.set('location', filterLocation.trim());
      if (filterMinStipend) params.set('minStipend', filterMinStipend);
      if (filterDurationMax) params.set('durationMax', filterDurationMax);
      if (filterStartFrom) params.set('startFrom', filterStartFrom);
      if (filterSkillsCsv.trim()) params.set('skills', filterSkillsCsv.trim());
      if (filterPerksCsv.trim()) params.set('perks', filterPerksCsv.trim());
      const res = await fetch(`/api/all-jobs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) { setAllJobs(data); setJobs(data); }
      else setError(data.error || 'Failed to filter jobs');
    } catch {
      setError(t('error_network'));
    }
    setLoading(false);
  };

  const clearFilters = async () => {
    setFilterJobType('');
    setFilterWorkMode('');
    setFilterCategory('');
    setFilterLocation('');
    setFilterMinStipend('');
    setFilterDurationMax('');
    setFilterStartFrom('');
    setFilterSkillsCsv('');
    setFilterPerksCsv('');
    await fetchJobs();
  };

  const toggleSave = async (jobId) => {
    try {
      if (savedJobIds.includes(jobId)) {
        const res = await fetch(`/api/saved/${jobId}?username=${username}`, { method: 'DELETE' });
        if (res.ok) {
          setSavedJobIds(ids => ids.filter(id => id !== jobId));
          setSavedJobs(list => list.filter(j => j._id !== jobId));
        }
      } else {
        const res = await fetch('/api/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, jobId }) });
        if (res.ok) {
          setSavedJobIds(ids => [...ids, jobId]);
        }
      }
    } catch {}
  };

  const [translatedMap, setTranslatedMap] = useState({}); // jobId -> { title, description, company, location }
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!allJobs.length) return;
      // translate only if non-English
      const langMap = { en: 'en', ta: 'ta', hi: 'hi', te: 'te' };
      // derive from LanguageContext rather than locale slice to avoid 'auto' detection issues
      const target = langMap[(locale || 'en').startsWith('ta') ? 'ta' : (locale || 'en').startsWith('hi') ? 'hi' : (locale || 'en').startsWith('te') ? 'te' : 'en'];
      if (target === 'en') { setTranslatedMap({}); return; }
      const entries = await Promise.all(allJobs.map(async (j) => {
        const [title, description, company, location] = await Promise.all([
          translateText(j.title, target),
          translateText(j.description, target),
          translateText(j.company, target),
          translateText(j.location, target)
        ]);
        return [j._id, { title, description, company, location }];
      }));
      if (!cancelled) setTranslatedMap(Object.fromEntries(entries));
    }
    run();
    return () => { cancelled = true; };
  }, [allJobs, locale]);

  const handleApplyOpen = (job) => {
    setApplyForJob(job);
    setShowApply(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!applyForJob) return;
    if (applyForJob.requireResume && !resume) {
      setError('Resume is required for this job. Please upload your resume.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('jobId', applyForJob._id);
      formData.append('username', username);
      formData.append('applicantName', applyForm.applicantName);
      formData.append('age', applyForm.age);
      formData.append('address', applyForm.address);
      formData.append('email', applyForm.email);
      if (resume) formData.append('resume', resume);

      const res = await fetch('/api/apply', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setSuccess(t('application_submitted'));
        setAppliedJobIds(ids => [...ids, applyForJob._id]);
        setShowApply(false);
        setApplyForJob(null);
        setApplyForm({ applicantName: '', age: '', address: '', email: '' });
        setResume(null);
      } else setError(data.error || 'Failed to apply');
    } catch {
      setError(t('error_network'));
    }
  };

  // Voice Recognition (Web Speech API)
  const ensureRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    if (!recognitionRef.current) {
      const recog = new SpeechRecognition();
      recog.lang = locale;
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(transcript);
      };
      recog.onend = () => setIsListening(false);
      recog.onerror = () => setIsListening(false);
      recognitionRef.current = recog;
    } else {
      recognitionRef.current.lang = locale;
    }
    return recognitionRef.current;
  };

  const toggleListening = () => {
    const recog = ensureRecognition();
    if (!recog) {
      alert('Speech recognition not supported in this browser');
      return;
    }
    if (isListening) {
      try { recog.stop(); } catch {}
      setIsListening(false);
      return;
    }
    setIsListening(true);
    try { recog.start(); } catch { setIsListening(false); }
  };

  const handleVoiceCommand = (text) => {
    // Basic intents
    // e.g., "search for nurse", "find teacher", "apply to cashier", "open details for designer"
    if (text.startsWith('search for ') || text.startsWith('find ')) {
      const term = text.replace('search for ', '').replace('find ', '').trim();
      handleSearch(term);
      setSection('view');
      return;
    }
    if (text.startsWith('open details for ') || text.startsWith('open ')) {
      const term = text.replace('open details for ', '').replace('open ', '').trim();
      const match = allJobs.find(j => j.title.toLowerCase().includes(term));
      if (match) navigate(`/jobs/${match._id}`);
      setSection('view');
      return;
    }
    if (text.startsWith('apply to ') || text.startsWith('apply for ')) {
      const term = text.replace('apply to ', '').replace('apply for ', '').trim();
      const match = allJobs.find(j => j.title.toLowerCase().includes(term));
      if (match && !appliedJobIds.includes(match._id)) {
        handleApplyOpen(match);
      }
      setSection('view');
      return;
    }
    if (text.includes('home')) { setSection('home'); return; }
    if (text.includes('view jobs')) { setSection('view'); return; }
    if (text.includes('applications')) { setSection('applications'); return; }
    if (text.includes('chats')) { setSection('chats'); return; }

    // Fallback: treat as search query
    handleSearch(text);
    setSection('view');
  };

  return (
    <div className="dashboard-container" style={{ paddingTop: 64 }}>
      <div className="header-bar">
        <div className="header-title">{t('app_title')}</div>
        <div className="header-nav">
          <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}>{t('home')}</button>
          <button className={section === 'view' ? 'active' : ''} onClick={() => setSection('view')}>{t('view_jobs')}</button>
          <button className={section === 'saved' ? 'active' : ''} onClick={() => setSection('saved')}>{t('saved')}</button>
          <button className={section === 'applications' ? 'active' : ''} onClick={() => setSection('applications')}>{t('my_applications')}</button>
          <button className={section === 'chats' ? 'active' : ''} onClick={() => setSection('chats')}>{t('chats')}</button>
        </div>
        <div className="header-profile" onClick={() => setShowProfileMenu(v => !v)}>
          <div className="profile-icon">{username[0]?.toUpperCase() || 'S'}</div>
          {showProfileMenu && (
            <div style={{ position: 'absolute', top: 56, right: 24, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', borderRadius: 8, padding: 12, zIndex: 200 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>{username}</div>
              <button onClick={onLogout} style={{ background: '#e75480', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>{t('logout')}</button>
            </div>
          )}
        </div>
      </div>

      {section === 'home' && (
        <div style={{ width: '100%', margin: 0 }}>
          <div className="hero-banner hero-full" style={{ backgroundImage: `url(${womenImage})` }}>
            <div className="hero-overlay"></div>
            <div className="hero-text">{t('discover')}</div>
          </div>
        </div>
      )}

      {section === 'view' && (
        <div style={{ width: '100%', maxWidth: 720, margin: '24px auto' }}>
          <h3>{t('available_jobs')}</h3>
          <div className="search-bar">
            <input className="search-input" placeholder={t('search_placeholder')} value={query} onChange={(e) => handleSearch(e.target.value)} />
            <button className="search-button" onClick={() => handleSearch('')}>{t('reset')}</button>
            <button className="search-button" onClick={toggleListening} title="Voice Search" style={{ background: isListening ? '#fde68a' : undefined }}>
              {isListening ? '🎙️' : '🎤'}
            </button>
            <button className="search-button" onClick={() => setShowFilters(v => !v)}>{t('filters')}</button>
          </div>
          {showFilters && (
            <div className="form-card" style={{ marginTop: 12 }}>
              <div className="form-grid">
                <div>
                  <label className="label">{t('job_type')}</label>
                  <select className="input" value={filterJobType} onChange={e => setFilterJobType(e.target.value)}>
                    <option value="">--</option>
                    <option value="job">{t('job')}</option>
                    <option value="internship">{t('internship')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('work_mode')}</label>
                  <select className="input" value={filterWorkMode} onChange={e => setFilterWorkMode(e.target.value)}>
                    <option value="">--</option>
                    <option value="onsite">{t('onsite')}</option>
                    <option value="remote">{t('remote')}</option>
                    <option value="hybrid">{t('hybrid')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('category')}</label>
                  <input className="input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('location_filter')}</label>
                  <input className="input" value={filterLocation} onChange={e => setFilterLocation(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('min_stipend')}</label>
                  <input className="input" type="number" value={filterMinStipend} onChange={e => setFilterMinStipend(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('duration_max_weeks')}</label>
                  <input className="input" type="number" value={filterDurationMax} onChange={e => setFilterDurationMax(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('start_from')}</label>
                  <input className="input" type="date" value={filterStartFrom} onChange={e => setFilterStartFrom(e.target.value)} />
                </div>
                <div className="full">
                  <label className="label">{t('skills_csv')}</label>
                  <input className="input" value={filterSkillsCsv} onChange={e => setFilterSkillsCsv(e.target.value)} />
                </div>
                <div className="full">
                  <label className="label">{t('perks_csv')}</label>
                  <input className="input" value={filterPerksCsv} onChange={e => setFilterPerksCsv(e.target.value)} />
                </div>
              </div>
              <div className="actions">
                <button className="btn-secondary" onClick={clearFilters}>{t('clear_filters')}</button>
                <button className="btn-primary" onClick={applyFilters}>{t('filter')}</button>
              </div>
            </div>
          )}
          {loading ? <div>{t('loading')}</div> : jobs.length === 0 ? <div>{t('no_jobs_available')}</div> : (
            <ul className="title-list">
              {jobs.map(job => {
                const tr = translatedMap[job._id];
                return (
                  <li key={job._id} className="title-item" onClick={() => setExpandedJob(expandedJob === job._id ? null : job._id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{tr?.title || job.title}</span>
                      {job.requireResume ? <span className="badge">{t('resume_required')}</span> : <span className="badge" style={{ background: '#ecfdf5', color: '#065f46' }}>{t('resume_optional')}</span>}
                    </div>
                    {expandedJob === job._id && (
                      <div style={{ marginTop: 10, fontWeight: 400 }}>
                        <div style={{ color: '#6b7280', marginBottom: 6 }}>{tr?.company || job.company} • {tr?.location || job.location}</div>
                        <div style={{ marginBottom: 10 }}>{tr?.description || job.description}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          {job.jobType && <span className="badge">{t('job_type')}: {job.jobType}</span>}
                          {job.workMode && <span className="badge">{t('work_mode')}: {job.workMode}</span>}
                          {typeof job.durationWeeks === 'number' && <span className="badge">{t('duration_weeks')}: {job.durationWeeks}</span>}
                          {(job.stipendMin || job.stipendMax) && <span className="badge">{t('stipend')}: {job.stipendMin || 0}-{job.stipendMax || 0}</span>}
                          {job.openings && <span className="badge">{t('openings')}: {job.openings}</span>}
                          {job.startDate && <span className="badge">{t('start_date')}: {new Date(job.startDate).toLocaleDateString()}</span>}
                          {job.applyBy && <span className="badge">{t('apply_by')}: {new Date(job.applyBy).toLocaleDateString()}</span>}
                        </div>
                        {(Array.isArray(job.skills) && job.skills.length > 0) && (
                          <div style={{ marginBottom: 8 }}>
                            <b>Skills:</b> {job.skills.join(', ')}
                          </div>
                        )}
                        {(Array.isArray(job.perks) && job.perks.length > 0) && (
                          <div style={{ marginBottom: 8 }}>
                            <b>Perks:</b> {job.perks.join(', ')}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn-primary" disabled={appliedJobIds.includes(job._id)} onClick={(e) => { e.stopPropagation(); handleApplyOpen(job); }}>
                            {appliedJobIds.includes(job._id) ? t('applied') : t('apply')}
                          </button>
                          <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job._id}`); }}>{t('view_details')}</button>
                          <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); toggleSave(job._id); }}>
                            {savedJobIds.includes(job._id) ? t('unsave') : t('save')}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: 10 }}>{success}</div>}
        </div>
      )}

      {section === 'saved' && (
        <div style={{ width: '100%', maxWidth: 720, margin: '24px auto' }}>
          <h3>{t('saved_jobs')}</h3>
          {loading ? <div>{t('loading')}</div> : savedJobs.length === 0 ? <div>{t('no_saved')}</div> : (
            <ul className="title-list">
              {savedJobs.map(job => (
                <li key={job._id} className="title-item" onClick={() => setExpandedJob(expandedJob === job._id ? null : job._id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{job.title}</span>
                    <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job._id}`); }}>{t('view_details')}</button>
                  </div>
                  {expandedJob === job._id && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#6b7280', marginBottom: 6 }}>{job.company} • {job.location}</div>
                      <div style={{ marginBottom: 10 }}>{job.description}</div>
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); toggleSave(job._id); }}>
                        {savedJobIds.includes(job._id) ? t('unsave') : t('save')}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {section === 'applications' && (
        <div style={{ width: '100%', maxWidth: 600, margin: '24px auto' }}>
          <h3>{t('my_applications')}</h3>
          {loading ? <div>{t('loading')}</div> : applications.length === 0 ? <div>{t('no_applications_yet')}</div> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {applications.map(app => (
                <li key={app._id} style={{ border: '1px solid #eee', borderRadius: 6, margin: '16px 0', padding: 16 }}>
                  <div><b>{app.job?.title}</b> at {app.job?.company} ({app.job?.location})</div>
                  <div>Status: <b>{app.status}</b></div>
                </li>
              ))}
            </ul>
          )}
          {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
        </div>
      )}

      {section === 'chats' && (
        <Chats />
      )}

      {showApply && (
        <div className="modal-overlay" onClick={() => setShowApply(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{t('apply_for')} {applyForJob?.title}</h3>
            {applyForJob?.requireResume ? (
              <div style={{ marginBottom: 10 }} className="badge">{t('resume_required')}</div>
            ) : (
              <div className="badge" style={{ marginBottom: 10, background: '#ecfdf5', color: '#065f46' }}>{t('resume_optional')}</div>
            )}
            <form onSubmit={handleApplySubmit}>
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
                  <label className="label">Email (optional)</label>
                  <input className="input" type="email" value={applyForm.email} onChange={e => setApplyForm({ ...applyForm, email: e.target.value })} />
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
            {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default JobSeekerDashboard; 