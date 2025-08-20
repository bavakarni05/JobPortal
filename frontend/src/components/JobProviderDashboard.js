import React, { useState, useEffect } from 'react';
import Chats from './Chats';
import { useLanguage } from '../LanguageContext';
import womenImage from '../women1.jpg';

function JobProviderDashboard({ onLogout }) {
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]); // unfiltered source
  const [applications, setApplications] = useState({});
  const [expandedJob, setExpandedJob] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', company: '', location: '', requireResume: false });
  const [optional, setOptional] = useState({ jobType: 'job', workMode: 'onsite', category: '', durationWeeks: '', stipendMin: '', stipendMax: '', openings: '', skills: '', perks: '', startDate: '', applyBy: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('home'); // home | add | view | chats
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [showAppModal, setShowAppModal] = useState(false);
  const [activeApp, setActiveApp] = useState(null);
  const [initialChatId, setInitialChatId] = useState(null);

  const { t } = useLanguage();
  const username = localStorage.getItem('username') || 'JobProvider';

  useEffect(() => {
    if (section === 'view') fetchJobs();
    // eslint-disable-next-line
  }, [section]);

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs?username=${username}`);
      const data = await res.json();
      if (res.ok) {
        setAllJobs(data);
        setJobs(data);
        setExpandedJob(null);
      } else setError(data.error || 'Failed to fetch jobs');
    } catch {
      setError(t('error_network'));
    }
    setLoading(false);
  };

  const handleSearch = (text) => {
    setQuery(text);
    const q = text.trim().toLowerCase();
    if (!q) { setJobs(allJobs); return; }
    setJobs(allJobs.filter(j => j.title.toLowerCase().includes(q)));
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleOptionalChange = e => {
    const { name, value } = e.target;
    setOptional(prev => ({ ...prev, [name]: value }));
  };

  const handleAddJob = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...optional, username })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Job posted!');
        setForm({ title: '', description: '', company: '', location: '', requireResume: false });
        setOptional({ jobType: 'job', workMode: 'onsite', category: '', durationWeeks: '', stipendMin: '', stipendMax: '', openings: '', skills: '', perks: '', startDate: '', applyBy: '' });
        setSection('view');
      } else setError(data.error || 'Failed to post job');
    } catch {
      setError(t('error_network'));
    }
  };

  const handleToggleDetails = async (jobId) => {
    if (expandedJob === jobId) { setExpandedJob(null); return; }
    setExpandedJob(jobId);
    if (!applications[jobId]) {
      try {
        const res = await fetch(`/api/jobs/${jobId}/applications`);
        const data = await res.json();
        if (res.ok) setApplications(apps => ({ ...apps, [jobId]: data }));
        else setError(data.error || 'Failed to fetch applications');
      } catch {
        setError(t('error_network'));
      }
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Delete this job? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) fetchJobs();
      else alert(data.error || 'Failed to delete');
    } catch {
      alert(t('error_network'));
    }
  };

  const openApplication = async (applicationId) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      const data = await res.json();
      if (res.ok) { setActiveApp(data); setShowAppModal(true); }
      else alert(data.error || 'Failed to load application');
    } catch { alert(t('error_network')); }
  };

  return (
    <div className="dashboard-container" style={{ paddingTop: 64 }}>
      <div className="header-bar">
        <div className="header-title">{t('app_title')}</div>
        <div className="header-nav">
          <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}>{t('home')}</button>
          <button className={section === 'add' ? 'active' : ''} onClick={() => setSection('add')}>{t('add_job')}</button>
          <button className={section === 'view' ? 'active' : ''} onClick={() => setSection('view')}>{t('view_jobs')}</button>
          <button className={section === 'chats' ? 'active' : ''} onClick={() => setSection('chats')}>{t('chats')}</button>
        </div>
        <div className="header-profile" onClick={() => setShowProfileMenu(v => !v)}>
          <div className="profile-icon">{username[0]?.toUpperCase() || 'P'}</div>
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
            <div className="hero-text">{t('empowering')}</div>
          </div>
        </div>
      )}

      {section === 'add' && (
        <div className="form-card">
          <h3>{t('post_new_job')}</h3>
          <form onSubmit={handleAddJob}>
            <div className="form-grid">
              <div className="full">
                <label className="label">{t('job_title')}</label>
                <input className="input" name="title" value={form.title} onChange={handleFormChange} required />
              </div>
              <div>
                <label className="label">{t('company')}</label>
                <input className="input" name="company" value={form.company} onChange={handleFormChange} required />
              </div>
              <div>
                <label className="label">{t('location')}</label>
                <input className="input" name="location" value={form.location} onChange={handleFormChange} required />
              </div>
              <div className="full">
                <label className="label">{t('description')}</label>
                <textarea className="textarea" name="description" value={form.description} onChange={handleFormChange} required />
              </div>
              <div>
                <label className="label">{t('job_type')}</label>
                <select className="input" name="jobType" value={optional.jobType} onChange={handleOptionalChange}>
                  <option value="job">{t('job')}</option>
                  <option value="internship">{t('internship')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('work_mode')}</label>
                <select className="input" name="workMode" value={optional.workMode} onChange={handleOptionalChange}>
                  <option value="onsite">{t('onsite')}</option>
                  <option value="remote">{t('remote')}</option>
                  <option value="hybrid">{t('hybrid')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('category')}</label>
                <input className="input" name="category" value={optional.category} onChange={handleOptionalChange} />
              </div>
              <div>
                <label className="label">{t('duration_weeks')}</label>
                <input className="input" type="number" name="durationWeeks" value={optional.durationWeeks} onChange={handleOptionalChange} />
              </div>
              <div>
                <label className="label">{t('stipend')} Min</label>
                <input className="input" type="number" name="stipendMin" value={optional.stipendMin} onChange={handleOptionalChange} />
              </div>
              <div>
                <label className="label">{t('stipend')} Max</label>
                <input className="input" type="number" name="stipendMax" value={optional.stipendMax} onChange={handleOptionalChange} />
              </div>
              <div>
                <label className="label">{t('openings')}</label>
                <input className="input" type="number" name="openings" value={optional.openings} onChange={handleOptionalChange} />
              </div>
              <div className="full">
                <label className="label">{t('skills_csv')}</label>
                <input className="input" name="skills" value={optional.skills} onChange={handleOptionalChange} placeholder="e.g. React, Node.js" />
              </div>
              <div className="full">
                <label className="label">{t('perks_csv')}</label>
                <input className="input" name="perks" value={optional.perks} onChange={handleOptionalChange} placeholder="e.g. Certificate, Letter of recommendation" />
              </div>
              <div>
                <label className="label">{t('start_date')}</label>
                <input className="input" type="date" name="startDate" value={optional.startDate} onChange={handleOptionalChange} />
              </div>
              <div>
                <label className="label">{t('apply_by')}</label>
                <input className="input" type="date" name="applyBy" value={optional.applyBy} onChange={handleOptionalChange} />
              </div>
              <div className="full">
                <label className="label">{t('require_resume')}</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label><input type="radio" name="requireResume" value={true} checked={form.requireResume === true} onChange={() => setForm(f => ({ ...f, requireResume: true }))} /> {t('yes')}</label>
                  <label><input type="radio" name="requireResume" value={false} checked={form.requireResume === false} onChange={() => setForm(f => ({ ...f, requireResume: false }))} /> {t('no')}</label>
                </div>
              </div>
            </div>
            <div className="actions">
              <button type="button" className="btn-secondary" onClick={() => setSection('view')}>{t('cancel')}</button>
              <button type="submit" className="btn-primary">{t('add')}</button>
            </div>
          </form>
          {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: 10 }}>{success}</div>}
        </div>
      )}

      {section === 'view' && (
        <div style={{ width: '100%', maxWidth: 720, margin: '24px auto' }}>
          <h3>{t('my_jobs')}</h3>
          <div className="search-bar">
            <input className="search-input" placeholder={t('search_placeholder')} value={query} onChange={(e) => handleSearch(e.target.value)} />
            <button className="search-button" onClick={() => handleSearch('')}>{t('reset')}</button>
          </div>
          {loading ? <div>{t('loading')}</div> : jobs.length === 0 ? <div>No jobs posted yet.</div> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {jobs.map(job => (
                <li key={job._id} className="job-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="job-title" onClick={() => handleToggleDetails(job._id)}>
                        {job.title}
                      </div>
                      <div className="job-meta">{job.company} • {job.location} {job.requireResume && <span className="badge" style={{ marginLeft: 8 }}>{t('resume_required')}</span>}</div>
                    </div>
                    <button className="btn-secondary" onClick={() => handleDeleteJob(job._id)}>Delete</button>
                  </div>
                  {expandedJob === job._id && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 8 }}>{job.description}</div>
                      <div className="badge">{t('applications')}</div>
                      <div style={{ marginTop: 8 }}>
                        {applications[job._id] ? (
                          applications[job._id].length === 0 ? <div>{t('no_applications_yet')}</div> : (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                              {applications[job._id].map(app => (
                                <li key={app._id} style={{ borderBottom: '1px solid #f1f5f9', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => openApplication(app._id)}>{app.applicant?.username}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{app.email || app.applicant?.profile?.email || 'No email'}</div>
                                    <div style={{ fontSize: '0.9rem' }}>Status: <b>{app.status}</b></div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    {app.status !== 'accepted' && (
                                      <button className="btn-primary" onClick={async () => {
                                        try {
                                          const res = await fetch(`/api/applications/${app._id}/select`, { method: 'PATCH' });
                                          const data = await res.json();
                                          if (res.ok) {
                                            const r = await fetch(`/api/jobs/${job._id}/applications`);
                                            const d = await r.json();
                                            if (r.ok) setApplications(s => ({ ...s, [job._id]: d }));
                                            setInitialChatId(data.chatId);
                                            setSection('chats');
                                          } else alert(data.error || 'Failed to select applicant');
                                        } catch {
                                          alert(t('error_network'));
                                        }
                                      }}>{t('apply')}</button>
                                    )}
                                    {app.status === 'accepted' && (
                                      <button className="btn-secondary" onClick={() => setSection('chats')}>Message</button>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )
                        ) : <div>Loading applications...</div>}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {section === 'chats' && (
        <Chats initialChatId={initialChatId} />
      )}

      {showAppModal && activeApp && (
        <div className="modal-overlay" onClick={() => setShowAppModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Application Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><b>Name:</b> {activeApp.applicantName || activeApp.applicant?.profile?.name || activeApp.applicant?.username}</div>
              <div><b>Age:</b> {activeApp.age || '-'}</div>
              <div className="full"><b>Address:</b> {activeApp.address || '-'}</div>
              <div><b>Contact:</b> {activeApp.contactNo || activeApp.applicant?.profile?.phone || '-'}</div>
              <div><b>Status:</b> {activeApp.status}</div>
              <div><b>Job:</b> {activeApp.job?.title}</div>
            </div>
            {activeApp.resumePath && (
              <div style={{ marginTop: 12 }}>
                <a href={activeApp.resumePath} target="_blank" rel="noreferrer" className="btn-secondary">View Resume</a>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAppModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobProviderDashboard; 