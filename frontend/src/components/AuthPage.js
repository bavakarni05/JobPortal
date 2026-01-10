import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

function AuthPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('jobseeker'); // default role
  const [isSignup, setIsSignup] = useState(false);
  const [preferredCategories, setPreferredCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        // Signup request
        const res = await fetch('https://jobportal-3-trrm.onrender.com/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role, profile: role === 'jobseeker' ? { preferredCategories } : {} })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Signup failed');
        } else {
          // After signup, auto-login
          await handleLogin();
        }
      } else {
        // Login request
        await handleLogin();
      }
    } catch (err) {
      setError(t('error_network'));
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    const res = await fetch('https://jobportal-3-trrm.onrender.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Login failed');
    } else {
      // Save username for dashboard use
      localStorage.setItem('username', data.username);
      onLogin(data.role);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isSignup ? t('sign_up') : t('login')}</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="label">{t('username')}</label>
            <input className="input" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t('password')}</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {isSignup && (
            <div>
              <label className="label">{t('role')}</label>
              <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="jobseeker">{t('job_seeker')}</option>
                <option value="jobprovider">{t('job_provider')}</option>
              </select>
            </div>
          )}
          {isSignup && role === 'jobseeker' && (
            <div>
              <label className="label">{t('preferred_categories') || 'Preferred Categories'}</label>
              <select
                className="select"
                multiple
                value={preferredCategories}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                  setPreferredCategories(opts);
                }}
                style={{ height: 100 }}
              >
                {['IT', 'Food', 'Medical', 'Education', 'Retail', 'Construction', 'Other'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{t('hold_ctrl_to_select_multiple') || 'Hold Ctrl/Cmd to select multiple'}</div>
            </div>
          )}
          <div className="actions">
            <button type="button" className="btn-secondary" onClick={() => { setIsSignup(!isSignup); setError(''); }}>
              {isSignup ? t('login') : t('sign_up')}
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Loading...' : (isSignup ? t('sign_up') : t('login'))}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default AuthPage; 