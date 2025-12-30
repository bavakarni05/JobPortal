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

  const { t, language } = useLanguage();
  const [translated, setTranslated] = useState({}); // jobId -> { title, description, company, location }
  const username = localStorage.getItem('username') || 'JobProvider';
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (section === 'view') fetchJobs();
    fetchNotifications();
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
        if (language !== 'en') {
          translateJobs(data);
        } else {
          setTranslated({});
        }
      } else setError(data.error || t('failed_to_fetch'));
    } catch {
      setError(t('error_network'));
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?username=${username}`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
        const unread = Array.isArray(data) ? data.filter(n => !n.read).length : 0;
        setUnreadCount(unread);
      }
    } catch {}
  };

  // Re-translate when language changes while viewing jobs
  useEffect(() => {
    if (section === 'view' && jobs.length > 0) {
      if (language !== 'en') {
        setTranslated({});
        translateJobs(jobs);
      } else {
        setTranslated({});
      }
    }
    // eslint-disable-next-line
  }, [language]);

  const translateJobs = async (list) => {
    const updates = {};
    for (const j of list) {
      try {
        let newTitle = j.title;
        if (j.title && language !== 'en') {
          const r = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: j.title, target: language })
          });
          const d = await r.json();
          if (r.ok && d.translatedText) newTitle = d.translatedText;
        }
        let newDesc = j.description;
        if (j.description && language !== 'en') {
          const r2 = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: j.description, target: language })
          });
          const d2 = await r2.json();
          if (r2.ok && d2.translatedText) newDesc = d2.translatedText;
        }
        // Company
        let newCompany = j.company;
        if (j.company && language !== 'en') {
          const rc = await fetch('/api/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: j.company, target: language })
          });
          const dc = await rc.json();
          if (rc.ok && dc.translatedText) newCompany = dc.translatedText;
        }
        // Location
        let newLoc = j.location;
        if (j.location && language !== 'en') {
          const rl = await fetch('/api/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: j.location, target: language })
          });
          const dl = await rl.json();
          if (rl.ok && dl.translatedText) newLoc = dl.translatedText;
        }
        updates[j._id] = { title: newTitle, description: newDesc, company: newCompany, location: newLoc };
      } catch {}
    }
    setTranslated(prev => ({ ...prev, ...updates }));
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
        setSuccess(t('job_posted'));
        setForm({ title: '', description: '', company: '', location: '', requireResume: false });
        setOptional({ jobType: 'job', workMode: 'onsite', category: '', durationWeeks: '', stipendMin: '', stipendMax: '', openings: '', skills: '', perks: '', startDate: '', applyBy: '' });
        setSection('view');
      } else setError(data.error || t('failed_to_post'));
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
        else setError(data.error || t('failed_to_fetch'));
      } catch {
        setError(t('error_network'));
      }
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm(t('delete_confirm'))) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) fetchJobs();
      else alert(data.error || t('failed_to_delete'));
    } catch {
      alert(t('error_network'));
    }
  };

  const openApplication = async (applicationId) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      const data = await res.json();
      if (res.ok) { setActiveApp(data); setShowAppModal(true); }
      else alert(data.error || t('failed_to_load_app'));
    } catch { alert(t('error_network')); }
  };

  const handleSelect = async (applicationId) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/select`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) {
        alert(t('applicant_selected'));
        fetchJobs(); // Refresh the jobs to update application statuses
        if (data.chatId) {
          setInitialChatId(data.chatId);
          setSection('chats');
        }
      } else {
        alert(data.error || t('failed_to_select_applicant'));
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
        <div className="header-title">{t('app_title')}</div>
        <div className="header-nav">
          <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}>{t('home')}</button>
          <button className={section === 'add' ? 'active' : ''} onClick={() => setSection('add')}>{t('add_job')}</button>
          <button className={section === 'view' ? 'active' : ''} onClick={() => setSection('view')}>{t('my_jobs')}</button>
          <button className={section === 'chats' ? 'active' : ''} onClick={() => setSection('chats')}>{t('chats')}</button>
        </div>
        <div className="header-right">
          <div
            className="notification-bell"
            onClick={() => {
              setShowNotifications(v => {
                const next = !v;
                if (next) {
                  setUnreadCount(0);
                  fetch('/api/notifications/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                  }).catch(() => {});
                }
                return next;
              });
            }}
          >
            <span className="bell-icon">🔔</span>
            {unreadCount > 0 && !showNotifications && (
              <span className="notification-badge">{unreadCount}</span>
            )}
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">{t('notifications')}</div>
                {notifications.length === 0 ? (
                  <div className="no-notifications">{t('no_notifications')}</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif._id} className="notification-item">
                      <div className="notification-text">{notif.message}</div>
                      <div className="notification-time">{new Date(notif.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))
                )}
              </div>
            )}
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
                <select className="input" name="category" value={optional.category} onChange={handleOptionalChange}>
                  <option value="">{t('select') || 'Select'}</option>
                  {['Education','Healthcare','IT','Retail','Housekeeping','Caregiving','Administration','Sales','Food Service'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('duration_weeks')}</label>
                <input className="input" type="number" name="durationWeeks" value={optional.durationWeeks} onChange={handleOptionalChange} />
              </div>
              <div>
                <label className="label">{t('stipend_min')}</label>
                <input className="input" type="number" name="stipendMin" value={optional.stipendMin} onChange={handleOptionalChange} />
              </div>
              <div>
                <label className="label">{t('stipend_max')}</label>
                <input className="input" type="number" name="stipendMax" value={optional.stipendMax} onChange={handleOptionalChange} />
              </div>
              <div>
                <label className="label">{t('openings')}</label>
                <input className="input" type="number" name="openings" value={optional.openings} onChange={handleOptionalChange} />
              </div>
              <div className="full">
                <label className="label">{t('skills_csv')}</label>
                <input className="input" name="skills" value={optional.skills} onChange={handleOptionalChange} placeholder={t('skills_placeholder')} />
              </div>
              <div className="full">
                <label className="label">{t('perks_csv')}</label>
                <input className="input" name="perks" value={optional.perks} onChange={handleOptionalChange} placeholder={t('perks_placeholder')} />
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
          {loading ? <div className="loading">{t('loading')}</div> : jobs.length === 0 ? <div className="loading">{t('no_jobs_posted')}</div> : (
            <ul className="title-list">
              {jobs.map(job => (
                <li key={job._id} className="title-item" onClick={() => handleToggleDetails(job._id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="job-title">{language === 'en' ? job.title : (translated[job._id]?.title || job.title)}</span>
                    <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); handleDeleteJob(job._id); }}>{t('delete')}</button>
                  </div>
                  {expandedJob === job._id && (
                    <div style={{ marginTop: 16, fontWeight: 400 }}>
                      <div className="job-meta">{language === 'en' ? job.company : (translated[job._id]?.company || job.company)} • {language === 'en' ? job.location : (translated[job._id]?.location || job.location)}</div>
                      <div style={{ marginBottom: 16, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                        {language === 'en' ? job.description : (translated[job._id]?.description || job.description)}
                      </div>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--primary-blue)' }}>{t('applications')}:</div>
                      {applications[job._id]?.length === 0 ? <div className="loading">{t('no_applications_yet')}</div> : (
                        <div style={{ display: 'grid', gap: 12 }}>
                          {applications[job._id]?.map(app => (
                            <div key={app._id} className="job-card" style={{ margin: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 600 }}>{app.applicantName || app.applicant?.username}</span>
                                <span className={`badge ${app.status === 'accepted' ? 'success' : ''}`}>{t(app.status)}</span>
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
            <h3>{t('application_details')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><b>{t('name')}:</b> {activeApp.applicantName || activeApp.applicant?.profile?.name || activeApp.applicant?.username}</div>
              <div><b>{t('age')}:</b> {activeApp.age || '-'}</div>
              <div className="full"><b>{t('address')}:</b> {activeApp.address || '-'}</div>
              <div><b>{t('contact')}:</b> {activeApp.contactNo || activeApp.applicant?.profile?.phone || '-'}</div>
              <div><b>{t('status')}:</b> {t(activeApp.status)}</div>
              <div><b>{t('job')}:</b> {activeApp.job?.title}</div>
            </div>
            {activeApp.resumePath && (
              <div style={{ marginTop: 12 }}>
                <a href={activeApp.resumePath} target="_blank" rel="noreferrer" className="btn-secondary">{t('view_resume')}</a>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAppModal(false)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobProviderDashboard; 