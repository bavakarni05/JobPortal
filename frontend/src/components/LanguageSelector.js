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
    <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center' }}>
      <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ fontSize: '0.75rem', background: 'transparent', border: 'none', outline: 'none', color: 'white', width: 'auto', marginTop: 0, cursor: 'pointer', fontWeight: 600, padding: '2px' }}>
        <option value="en">English</option>
        <option value="ta">தமிழ்</option>
        <option value="hi">हिन्दी</option>
        <option value="te">తెలుగు</option>
      </select>
    </div>
  );
}

export default LanguageSelector; 