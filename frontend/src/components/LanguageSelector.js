import React from 'react';
import { useLanguage } from '../LanguageContext';

function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div style={{ position: 'fixed', top: 72, right: 16, zIndex: 1000, background: '#ffffffd8', padding: '6px 8px', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
      <label style={{ marginRight: 6, fontSize: 12 }}>Lang:</label>
      <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ fontSize: 12 }}>
        <option value="en">English</option>
        <option value="ta">தமிழ்</option>
        <option value="hi">हिन्दी</option>
        <option value="te">తెలుగు</option>
      </select>
    </div>
  );
}

export default LanguageSelector; 