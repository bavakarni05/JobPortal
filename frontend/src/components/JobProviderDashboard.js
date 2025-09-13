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

  const handleSelect = async (applicationId) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/select`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) {
        alert('Applicant selected successfully!');
        fetchJobs(); // Refresh the jobs to update application statuses
        if (data.chatId) {
          setInitialChatId(data.chatId);
          setSection('chats');
        }
      } else {
        alert(data.error || 'Failed to select applicant');
      }
    } catch {
      alert(t('error_network'));
    }
  };

  const handleMessage = async (applicationId) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      const data = await res.json();
      if (res.ok) {
        // Check if chat exists, if not create one
        const chatRes = await fetch('/api/chats/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            jobId: data.job._id, 
            applicationId: applicationId,
            jobProviderUsername: username,
            applicantUsername: data.applicant?.username
          })
        });
        const chatData = await chatRes.json();
        if (chatRes.ok) {
          setInitialChatId(chatData.chatId);
          setSection('chats');
        }
      }
    } catch {
      alert(t('error_network'));
    }
  };

  return (
    <div className="dashboard-container">
      <div className="header-bar">
        <div className="header-title">Women Job Portal</div>
        <div className="header-nav">
          <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}>{t('home')}</button>
          <button className={section === 'add' ? 'active' : ''} onClick={() => setSection('add')}>{t('add_job')}</button>
          <button className={section === 'view' ? 'active' : ''} onClick={() => setSection('view')}>{t('my_jobs')}</button>
          <button className={section === 'chats' ? 'active' : ''} onClick={() => setSection('chats')}>{t('chats')}</button>
        </div>
        <div className="header-profile" onClick={() => setShowProfileMenu(v => !v)}>
          <div className="profile-icon">{username[0]?.toUpperCase() || 'P'}</div>
          <span className="profile-name">{username}</span>
          {showProfileMenu && (
            <div className="profile-menu">
              <div className="profile-menu-header">{username}</div>
              <button onClick={onLogout}>{t('logout')}</button>
            </div>
          )}
        </div>
      </div>

      {section === 'home' && (
        <div style={{ width: '100%', margin: 0 }}>
          <div className="hero-section">
            <div className="hero-content">
              <div className="hero-text-section">
                <h1 className="hero-title">{t('empower_women')}</h1>
                <p className="hero-subtitle">{t('discover')}</p>
                <div className="hero-actions">
                  <button className="btn-primary hero-btn" onClick={() => setSection('add')}>
                    {t('add_job')}
                  </button>
                  <button className="btn-secondary hero-btn" onClick={() => setSection('view')}>
                    {t('my_jobs')}
                  </button>
                </div>
              </div>
              <div className="hero-image-section">
                <img src={womenImage} alt="Women empowerment" className="hero-image" />
              </div>
            </div>
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
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </div>
      )}

      {section === 'view' && (
        <div className="content-section">
          <h3>{t('my_jobs')}</h3>
          <div className="search-bar">
            <input className="search-input" placeholder={t('search_placeholder')} value={query} onChange={(e) => handleSearch(e.target.value)} />
            <button className="search-button" onClick={() => handleSearch('')}>{t('reset')}</button>
          </div>
          {loading ? <div className="loading">{t('loading')}</div> : jobs.length === 0 ? <div className="loading">No jobs posted yet.</div> : (
            <ul className="title-list">
              {jobs.map(job => (
                <li key={job._id} className="title-item" onClick={() => handleToggleDetails(job._id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="job-title">{job.title}</span>
                    <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); handleDeleteJob(job._id); }}>{t('delete')}</button>
                  </div>
                  {expandedJob === job._id && (
                    <div style={{ marginTop: 16, fontWeight: 400 }}>
                      <div className="job-meta">{job.company} • {job.location}</div>
                      <div style={{ marginBottom: 16, color: 'var(--text-primary)', lineHeight: 1.6 }}>{job.description}</div>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--primary-blue)' }}>{t('applications')}:</div>
                      {applications[job._id]?.length === 0 ? <div className="loading">No applications yet.</div> : (
                        <div style={{ display: 'grid', gap: 12 }}>
                          {applications[job._id]?.map(app => (
                            <div key={app._id} className="job-card" style={{ margin: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 600 }}>{app.applicantName || app.applicant?.username}</span>
                                <span className={`badge ${app.status === 'accepted' ? 'success' : ''}`}>{app.status}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="btn-primary" onClick={() => openApplication(app._id)}>{t('view')}</button>
                                {(app.status === 'pending' || app.status === 'applied') && (
                                  <button className="btn-primary" onClick={() => handleSelect(app._id)}>{t('select')}</button>
                                )}
                                <button className="btn-secondary" onClick={() => handleMessage(app._id)}>{t('message')}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
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