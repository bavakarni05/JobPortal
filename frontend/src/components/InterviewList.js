import React, { useEffect, useState } from 'react';
import { useLanguage } from '../LanguageContext';

function InterviewList() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const username = localStorage.getItem('username');

  useEffect(() => {
    fetchInterviews();
    // eslint-disable-next-line
  }, []);

  const fetchInterviews = async () => {
    try {
      const res = await fetch(`https://jobportal-3-trrm.onrender.com/api/interviews?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setInterviews(data);
      }
    } catch (error) {
      console.error('Error fetching interviews', error);
    }
    setLoading(false);
  };

  if (loading) return <div className="loading">{t('loading') || 'Loading...'}</div>;

  return (
    <div className="content-section" style={{ maxWidth: 900, margin: '40px auto' }}>
      <h3>{t('scheduled_interviews') || 'Scheduled Interviews'}</h3> {/* Replaced inline style with class */}
      {interviews.length === 0 ? (
        <p className="loading">{t('no_interviews') || 'No interviews scheduled.'}</p>
      ) : (
        <div className="interview-cards" style={{ display: 'grid', gap: 16 }}>
          {interviews.map(int => (
            <div key={int._id} className="feature-card" style={{ textAlign: 'left' }}>
              <div className="job-title" style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>{int.jobTitle}</div>
              <div className="job-meta" style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                {t('with') || 'With'}: {int.interviewer === username ? int.applicant : int.interviewer}
              </div>
              <div style={{ marginTop: 10, lineHeight: 1.6 }}>
                <strong>{t('date') || 'Date'}:</strong> {new Date(int.date).toLocaleDateString()} <br/>
                <strong>{t('time') || 'Time'}:</strong> {int.time} <br/>
                <strong>{t('type') || 'Type'}:</strong> {t(int.type) || int.type}
              </div>
              {int.link && (
                <div style={{ marginTop: 12 }}>
                  {int.type === 'video' ? (
                    <a href={int.link.startsWith('http') ? int.link : `https://${int.link}`} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                      {t('join_meeting') || 'Join Meeting'}
                    </a>
                  ) : (
                    <span><strong>{t('location') || 'Location'}:</strong> {int.link}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InterviewList;