import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Chats from './Chats';
import { useLanguage } from '../LanguageContext';
import womenImage from '../women1.jpg';
import InterviewList from './InterviewList';

function JobSeekerDashboard({ onLogout }) {
  const [section, setSection] = useState('home'); // home | view | applications | chats | recommendations | profile | interviews
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [query, setQuery] = useState('');
  const [expandedJob, setExpandedJob] = useState(null);
  const [showApply, setShowApply] = useState(false);
  const [applyForJob, setApplyForJob] = useState(null);
  const [applyForm, setApplyForm] = useState({ applicantName: '', age: '', address: '', email: '', contactNo: '' });
  const [resume, setResume] = useState(null);
  const [translatedTitles, setTranslatedTitles] = useState({});
  const [showAppDetailsModal, setShowAppDetailsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [initialChatId, setInitialChatId] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', preferredCategories: [] });
  const [profileLoading, setProfileLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const username = localStorage.getItem('username') || 'JobSeeker';
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (section === 'view') fetchJobs();
    if (section === 'applications') fetchApplications();
    if (section === 'recommendations') fetchRecommendations();
    if (section === 'profile') fetchProfile();
    fetchNotifications();
    // eslint-disable-next-line
  }, [section]);

  useEffect(() => {
    // eslint-disable-next-line
  }, []);

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch(`https://jobportal-3-trrm.onrender.com/api/me?username=${username}`);
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfileForm({
          name: data.profile.name || '',
          email: data.profile.email || '',
          phone: data.profile.phone || '',
          preferredCategories: data.profile.preferredCategories || []
        });
      }
    } catch (e) { console.error(e); }
    setProfileLoading(false);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`https://jobportal-3-trrm.onrender.com/api/notifications?username=${username}`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
        const unread = Array.isArray(data) ? data.filter(n => !n.read).length : 0;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const resProfile = await fetch(`https://jobportal-3-trrm.onrender.com/api/me?username=${username}`);
      const dataProfile = await resProfile.json();
      let prefs = [];
      if (resProfile.ok && dataProfile.profile) {
        prefs = dataProfile.profile.preferredCategories || [];
      }

      const res = await fetch('https://jobportal-3-trrm.onrender.com/api/all-jobs');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        if (prefs.length > 0) {
          const filtered = data.filter(job => job.category && prefs.includes(job.category));
          setRecommended(filtered);
        } else {
          setRecommended(data);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    // Re-translate job titles when language changes
    if (applications.length > 0 && language !== 'en') {
      setTranslatedTitles({}); // Clear existing translations
      translateJobTitles(applications);
    }
    if (jobs.length > 0 && language !== 'en') {
      translateJobTitlesForJobs(jobs);
    }
    // eslint-disable-next-line
  }, [language]);

  const fetchJobs = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('https://jobportal-3-trrm.onrender.com/api/all-jobs');
      const data = await res.json();
      if (res.ok) {
        setAllJobs(data); setJobs(data);
        // Translate job titles if language is not English
        if (language !== 'en') {
          translateJobTitlesForJobs(data);
        }
        const appRes = await fetch(`https://jobportal-3-trrm.onrender.com/api/my-applications?username=${username}`);
        const appData = await appRes.json();
        if (appRes.ok) setAppliedJobIds(appData.map(a => a.job?._id));
      } else setError(data.error || t('failed_to_fetch_jobs'));
    } catch {
      setError(t('network_error'));
    }
    setLoading(false);
  };

  const translateJobTitlesForJobs = async (jobs) => {
    const titlesToTranslate = jobs
      .filter(job => job.title && !translatedTitles[job.title])
      .map(job => job.title);
    
    if (titlesToTranslate.length === 0) return;

    const translations = {};
    for (const title of titlesToTranslate) {
      try {
        const res = await fetch('https://jobportal-3-trrm.onrender.com/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: title, target: language })
        });
        const data = await res.json();
        if (res.ok && data.translatedText) {
          translations[title] = data.translatedText;
        }
      } catch (error) {
        console.error('Translation error:', error);
      }
    }
    
    setTranslatedTitles(prev => ({ ...prev, ...translations }));
  };

  const fetchApplications = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`https://jobportal-3-trrm.onrender.com/api/my-applications?username=${username}`);
      const data = await res.json();
      if (res.ok) {
        setApplications(data);
        // Translate job titles if language is not English
        if (language !== 'en') {
          translateJobTitles(data);
        }
      }
      else setError(data.error || t('failed_to_fetch_applications'));
    } catch {
      setError(t('network_error'));
    }
    setLoading(false);
  };

  const translateJobTitles = async (applications) => {
    const titlesToTranslate = applications
      .filter(app => app.job?.title && !translatedTitles[app.job.title])
      .map(app => app.job.title);
    
    if (titlesToTranslate.length === 0) return;

    const translations = {};
    for (const title of titlesToTranslate) {
      try {
        const res = await fetch('https://jobportal-3-trrm.onrender.com/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: title, target: language })
        });
        const data = await res.json();
        if (res.ok && data.translatedText) {
          translations[title] = data.translatedText;
        }
      } catch (error) {
        console.error('Translation error:', error);
      }
    }
    
    setTranslatedTitles(prev => ({ ...prev, ...translations }));
  };

  const handleSearch = (text) => {
    setQuery(text);
    const q = text.trim().toLowerCase();
    if (!q) { setJobs(allJobs); return; }
    setJobs(allJobs.filter(j => j.title.toLowerCase().includes(q)));
  };

  const handleApplyOpen = (job) => {
    setApplyForJob(job);
    setShowApply(true);
  };

  const startChatWithProvider = async (job) => {
    try {
      let providerUsername = job?.postedBy?.username || job?.postedBy?.profile?.username;
      if (!providerUsername) {
        // fallback: refetch jobs to find provider
        const r = await fetch('https://jobportal-3-trrm.onrender.com/api/all-jobs');
        const d = await r.json();
        if (r.ok) {
          const found = Array.isArray(d) ? d.find(j => j._id === job._id) : null;
          providerUsername = found?.postedBy?.username;
        }
      }
      if (!providerUsername) { alert('Could not find job provider username for this job.'); return; }
      const payload = { jobId: job._id, jobProviderUsername: providerUsername, applicantUsername: username };
      const res = await fetch('https://jobportal-3-trrm.onrender.com/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.chatId) {
        setInitialChatId(data.chatId);
        setSection('chats');
      } else {
        alert(data.error || `Failed to start chat (status ${res.status})`);
      }
    } catch (e) { alert('Network error while starting chat'); }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!applyForJob) return;
    if (applyForJob.requireResume && !resume) {
      setError(t('resume_required_msg'));
      return;
    }
    try {
      const formData = new FormData();
      formData.append('jobId', applyForJob._id);
      formData.append('username', username);
      formData.append('applicantName', applyForm.applicantName);
      formData.append('age', applyForm.age);
      formData.append('address', applyForm.address);
      formData.append('contactNo', applyForm.contactNo);
      formData.append('email', applyForm.email);
      if (resume) formData.append('resume', resume);

      const res = await fetch('https://jobportal-3-trrm.onrender.com/api/apply', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setSuccess(t('application_submitted'));
        setAppliedJobIds(ids => [...ids, applyForJob._id]);
        setShowApply(false);
        setApplyForJob(null);
        setApplyForm({ applicantName: '', age: '', address: '', email: '', contactNo: '' });
        setResume(null);
      } else setError(data.error || t('failed_to_post_application'));
    } catch {
      setError(t('network_error'));
    }
  };

  const handleApplicationClick = (application) => {
    setSelectedApplication(application);
    setShowAppDetailsModal(true);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('https://jobportal-3-trrm.onrender.com/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, profile: profileForm })
      });
      const data = await res.json();
      if (res.ok) {
        alert(t('profile_updated') || 'Profile updated successfully');
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (e) { alert('Network error'); }
  };

  return (
    <div className="dashboard-container">
      <div className="header-bar">
        <div className="header-title">{t('app_title')}</div>
        <div className="header-nav" style={{ overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', justifyContent: isMobile ? 'flex-start' : 'center', flex: 1 }}>
          <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}>{t('home')}</button>
          <button className={section === 'view' ? 'active' : ''} onClick={() => setSection('view')}>{t('view_jobs')}</button>
          <button className={section === 'applications' ? 'active' : ''} onClick={() => setSection('applications')}>{t('my_applications')}</button>
          <button className={section === 'recommendations' ? 'active' : ''} onClick={() => setSection('recommendations')}>{t('recommendations') || 'Recommendations'}</button>
          <button className={section === 'chats' ? 'active' : ''} onClick={() => setSection('chats')}>{t('chats')}</button>
          <button className={section === 'interviews' ? 'active' : ''} onClick={() => setSection('interviews')}>{t('interviews') || 'Interviews'}</button>
        </div>
        <div className="header-right">
          <div
            className="notification-bell"
            onClick={async () => {
              setShowNotifications(v => {
                const next = !v;
                if (next) {
                  // opening dropdown => mark read
                  setUnreadCount(0);
                  // best-effort mark-read API
                  fetch('https://jobportal-3-trrm.onrender.com/api/notifications/mark-read', {
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
            <div className="profile-icon">{username[0]?.toUpperCase() || 'S'}</div>
            <span className="profile-name">{username}</span>
            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-menu-header">{username}</div>
                <button onClick={() => { setSection('profile'); setShowProfileMenu(false); }}>{t('profile') || 'Profile'}</button>
                <button onClick={onLogout}>{t('logout')}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {section === 'profile' && (
        <div className="content-section">
          <h3>{t('edit_profile') || 'Edit Profile'}</h3>
          {profileLoading ? <div className="loading">{t('loading')}</div> : (
            <form onSubmit={handleProfileUpdate} style={{ maxWidth: 600, margin: '0 auto' }}>
              <div className="form-grid">
                <div className="full">
                  <label className="label">{t('full_name')}</label>
                  <input className="input" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Your Name" />
                </div>
                <div className="full">
                  <label className="label">{t('email')}</label>
                  <input className="input" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="full">
                  <label className="label">{t('phone') || 'Phone'}</label>
                  <input className="input" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Phone Number" />
                </div>
                <div className="full">
                  <label className="label">{t('preferred_categories') || 'Preferred Job Categories'}</label>
                  <select
                    className="select"
                    multiple
                    value={profileForm.preferredCategories}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                      setProfileForm({ ...profileForm, preferredCategories: opts });
                    }}
                    style={{ height: 120 }}
                  >
                    {['IT', 'Food', 'Medical', 'Education', 'Retail', 'Construction', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{t('hold_ctrl_to_select_multiple') || 'Hold Ctrl/Cmd to select multiple'}</div>
                </div>
              </div>
              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <button type="submit" className="btn-primary">{t('save_changes') || 'Save Changes'}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {section === 'recommendations' && (
        <div className="content-section">
          <h3 style={{ textAlign: 'center' }}>{t('recommended_for_you') || 'Recommended for you'}</h3>
          <div style={{ maxWidth: 900, margin: '16px auto' }}>
            {recommended.length === 0 ? (
              <div className="loading" style={{ textAlign: 'center' }}>
                {t('no_recommendations_yet') || 'No recommendations found matching your categories or history.'}
                <div style={{ marginTop: 10 }}>
                  <button className="btn-secondary" onClick={fetchRecommendations}>{t('refresh') || 'Refresh'}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 900 }}>
                  {recommended.map(job => (
                    <div key={job._id} className="job-card" style={{ margin: '0 0 16px 0' }}>
                      <div className="job-title">{job.title}</div>
                      <div className="job-meta">{job.company} • {job.location}</div>
                      <div style={{ marginBottom: 12 }}>{job.description}</div>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button className="btn-secondary" onClick={() => navigate(`/jobs/${job._id}`)}>{t('view_details')}</button>
                        <button type="button" className="btn-primary" onClick={() => startChatWithProvider(job)}>{t('message')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'home' && (
        <div style={{ width: '100%', margin: 0 }}>
          <div className="hero-section">
            <div className="hero-content">
              <div className="hero-text-section">
                <h1 className="hero-title">{t('discover')}</h1>
                <p className="hero-subtitle">{t('empower_women')}</p>
                <div className="hero-actions">
                  <button className="btn-primary hero-btn" onClick={() => setSection('view')}>
                    {t('view_jobs')}
                  </button>
                  <button className="btn-secondary hero-btn" onClick={() => setSection('applications')}>
                    {t('my_applications')}
                  </button>
                </div>
              </div>
              <div className="hero-image-section">
                <img src={womenImage} alt="Women empowerment" className="hero-image" />
              </div>
            </div>
          </div>
          {/* Recommendations moved to its own section */}
        </div>
      )}

      {section === 'view' && (
        <div className="content-section">
          <h3>{t('available_jobs')}</h3>
          {/* Recommendations moved to its own section */}
          <div className="search-bar">
            <input className="search-input" placeholder={t('search_jobs')} value={query} onChange={(e) => handleSearch(e.target.value)} />
            <button className="search-button" onClick={() => handleSearch('')}>{t('reset')}</button>
          </div>
          {loading ? <div className="loading">{t('loading_jobs')}</div> : jobs.length === 0 ? <div className="loading">{t('no_jobs_available')}</div> : (
            <ul className="title-list">
              {jobs.map(job => (
                <li key={job._id} className="title-item" onClick={() => setExpandedJob(expandedJob === job._id ? null : job._id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="job-title">
                      {language === 'en' ? job.title : (translatedTitles[job.title] || job.title)}
                    </span>
                    {job.requireResume ? <span className="badge">{t('resume_required')}</span> : <span className="badge success">{t('resume_optional')}</span>}
                  </div>
                  {expandedJob === job._id && (
                    <div style={{ marginTop: 16, fontWeight: 400 }}>
                      <div className="job-meta">{job.company} • {job.location}</div>
                      <div style={{ marginBottom: 16, color: 'var(--text-primary)', lineHeight: 1.6 }}>{job.description}</div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn-primary" disabled={appliedJobIds.includes(job._id)} onClick={(e) => { e.stopPropagation(); handleApplyOpen(job); }}>
                          {appliedJobIds.includes(job._id) ? t('applied') : t('apply')}
                        </button>
                        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job._id}`); }}>{t('view_details')}</button>
                        <button type="button" className="btn-secondary" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); startChatWithProvider(job); }}>{t('message')}</button>
                      </div>
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

      {section === 'applications' && (
        <div className="content-section">
          <h3>{t('my_applications')}</h3>
          {loading ? <div className="loading">{t('loading_applications')}</div> : applications.length === 0 ? <div className="loading">{t('no_applications_yet')}</div> : (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {applications.map(app => (
                <div key={app._id} className="job-card" onClick={() => handleApplicationClick(app)} style={{ cursor: 'pointer' }}>
                  <div className="job-title">
                    {language === 'en' ? app.job?.title : (translatedTitles[app.job?.title] || app.job?.title)}
                  </div>
                  <div className="job-meta">{app.job?.company} • {app.job?.location}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{t('status')}:</span>
                    <span className={`badge ${app.status === 'accepted' ? 'success' : ''}`}>
                      {t(app.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <div className="error">{error}</div>}
        </div>
      )}

      {section === 'chats' && (
        <Chats initialChatId={initialChatId} />
      )}

      {section === 'interviews' && (
        <div className="content-section">
          <InterviewList />
        </div>
      )}

      {showApply && (
        <div className="modal-overlay" onClick={() => setShowApply(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{t('apply_for')} {applyForJob?.title}</h3>
            {applyForJob?.requireResume ? (
              <div style={{ marginBottom: 10 }} className="badge">{t('resume_required')}</div>
            ) : (
              <div className="badge success" style={{ marginBottom: 10 }}>{t('resume_optional')}</div>
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
                  <label className="label">{t('contact_no') || 'Contact No'}</label>
                  <input className="input" value={applyForm.contactNo} onChange={e => setApplyForm({ ...applyForm, contactNo: e.target.value })} required />
                </div>
                <div className="full">
                  <label className="label">{t('address')}</label>
                  <input className="input" value={applyForm.address} onChange={e => setApplyForm({ ...applyForm, address: e.target.value })} required />
                </div>
                <div className="full">
                  <label className="label">{t('email_optional')}</label>
                  <input className="input" type="email" value={applyForm.email} onChange={e => setApplyForm({ ...applyForm, email: e.target.value })} />
                </div>
                <div className="full">
                  <label className="label">{t('upload_resume')}</label>
                  <input className="input" type="file" accept=".pdf,.doc,.docx" onChange={e => setResume(e.target.files[0])} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowApply(false)}>{t('cancel')}</button>
                <button type="submit" className="btn-primary">{t('submit_application')}</button>
              </div>
            </form>
            {error && <div className="error">{error}</div>}
          </div>
        </div>
      )}

      {showAppDetailsModal && selectedApplication && (
        <div className="modal-overlay" onClick={() => setShowAppDetailsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{t('my_application_details')}</h3>
            <div className="form-grid">
              <div className="full">
                <label className="label">{t('applied_for')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  {language === 'en' ? selectedApplication.job?.title : (translatedTitles[selectedApplication.job?.title] || selectedApplication.job?.title)}
                </div>
              </div>
              <div>
                <label className="label">{t('company')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  {selectedApplication.job?.company}
                </div>
              </div>
              <div>
                <label className="label">{t('location')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  {selectedApplication.job?.location}
                </div>
              </div>
              <div>
                <label className="label">{t('full_name')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  {selectedApplication.applicantName}
                </div>
              </div>
              <div>
                <label className="label">{t('age')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  {selectedApplication.age}
                </div>
              </div>
              <div className="full">
                <label className="label">{t('address')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  {selectedApplication.address}
                </div>
              </div>
              <div>
                <label className="label">{t('email_optional')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  {selectedApplication.email || '-'}
                </div>
              </div>
              <div>
                <label className="label">{t('status')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  <span className={`badge ${selectedApplication.status === 'accepted' ? 'success' : ''}`}>
                    {t(selectedApplication.status)}
                  </span>
                </div>
              </div>
              <div>
                <label className="label">{t('application_date')}</label>
                <div className="input" style={{ background: '#f8f9fa', border: 'none' }}>
                  {selectedApplication.createdAt ? new Date(selectedApplication.createdAt).toLocaleDateString() : '-'}
                </div>
              </div>
              {selectedApplication.resumePath && (
                <div className="full">
                  <label className="label">{t('resume_file')}</label>
                  <div style={{ marginTop: 8 }}>
                    <a href={selectedApplication.resumePath} target="_blank" rel="noreferrer" className="btn-secondary">
                      {t('view_resume')}
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAppDetailsModal(false)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobSeekerDashboard; 