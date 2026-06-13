import React from 'react';
import { useLanguage } from '../LanguageContext';

function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="feature-card" style={{ position: 'fixed', top: 72, right: 16, zIndex: 1000, padding: '6px 8px', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
      <label className="label" style={{ marginRight: 6, fontSize: 12, display: 'inline' }}>Lang:</label>
      <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ fontSize: 12, background: 'transparent', border: 'none', outline: 'none', width: 'auto', marginTop: 0 }}>
        <option value="en">English</option>
        <option value="ta">தமிழ்</option>
        <option value="hi">हिन्दी</option>
        <option value="te">తెలుగు</option>
      </select>
    </div>
  );
}

export default LanguageSelector; 