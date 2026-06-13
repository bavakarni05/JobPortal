import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';

function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [visible, setVisible] = useState(true);
  const [prevScrollPos, setPrevScrollPos] = useState(window.pageYOffset);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 10);
      setPrevScrollPos(currentScrollPos);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  return (
    <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '25px', display: 'flex', alignItems: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', transition: 'all 0.3s ease' }}>
      <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ fontSize: '0.8rem', background: 'transparent', border: 'none', outline: 'none', color: '#fff', width: 'auto', marginTop: 0, cursor: 'pointer', fontWeight: 600, padding: '2px 0', WebkitAppearance: 'none', appearance: 'none', textAlign: 'center' }}>
        <option value="en" style={{ backgroundColor: '#1e1e1e', color: '#fff' }}>English</option>
        <option value="ta" style={{ backgroundColor: '#1e1e1e', color: '#fff' }}>தமிழ்</option>
        <option value="hi" style={{ backgroundColor: '#1e1e1e', color: '#fff' }}>हिन्दी</option>
        <option value="te" style={{ backgroundColor: '#1e1e1e', color: '#fff' }}>తెలుగు</option>
      </select>
      <span style={{ fontSize: '0.6rem', color: '#fff', marginLeft: '6px', pointerEvents: 'none', opacity: 0.7 }}>▼</span>
    </div>
  );
}

export default LanguageSelector; 