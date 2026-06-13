import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import LanguageSelector from './LanguageSelector';

function AuthPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('jobseeker'); // default role
  const [isSignup, setIsSignup] = useState(false);
  const [preferredCategories, setPreferredCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [prevScrollPos, setPrevScrollPos] = useState(window.pageYOffset);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 10);
      setPrevScrollPos(currentScrollPos);
      setScrolled(currentScrollPos > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

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
    <div className="auth-container landing" style={{ paddingTop: 80 }}>
      <div className={`landing-nav ${scrolled ? 'landing-nav--scrolled' : ''} ${!visible ? 'landing-nav--hidden' : ''}`}>
        <div className="landing-nav__inner">
          <div className="landing-nav__logo">
            <span style={{ fontSize: '1.6rem', fontWeight: 900, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FemConnect</span>
          </div>
          <div className="header-right">
            <LanguageSelector />
          </div>
        </div>
      </div>

      <div className="hero__bg">
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />
        <div className="hero__orb hero__orb--3" />
      </div>
      <div className="auth-card feature-card" style={{ maxWidth: 450, margin: '80px auto', position: 'relative', zIndex: 1 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          {isSignup ? t('sign_up') : t('login')}
        </h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="label" style={{ color: 'var(--text-secondary)' }}>{t('username')}</label>
            <input className="input" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label" style={{ color: 'var(--text-secondary)' }}>{t('password')}</label>
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
                  <option key={cat} value={cat}>{t(cat.toLowerCase()) || cat}</option>
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