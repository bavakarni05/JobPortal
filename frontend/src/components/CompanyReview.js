import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';

function CompanyReview({ companyName }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { t } = useLanguage();
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (companyName) fetchReviews();
    // eslint-disable-next-line
  }, [companyName]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?company=${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Failed to fetch reviews', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username) return alert(t('login_required') || 'Please login to review');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName, username, rating, comment })
      });
      if (res.ok) {
        setComment('');
        fetchReviews();
      }
    } catch (error) {
      console.error('Failed to post review', error);
    }
  };

  return (
    <div className="review-section" style={{ marginTop: 24, padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'left' }}>
      <h3 style={{ marginBottom: 16 }}>{t('company_reviews') || 'Company Reviews'} - {companyName}</h3>
      <div className="reviews-list" style={{ marginBottom: 20 }}>
        {reviews.length === 0 ? <p style={{ color: '#666' }}>{t('no_reviews_yet') || 'No reviews yet. Be the first!'}</p> : reviews.map((r, i) => (
          <div key={i} className="review-card" style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{r.username}</span>
              <span style={{ color: '#f39c12' }}>{'★'.repeat(r.rating)}</span>
            </div>
            <p style={{ margin: '4px 0', color: '#333' }}>{r.comment}</p>
            <small style={{ color: '#999' }}>{new Date(r.createdAt).toLocaleDateString()}</small>
          </div>
        ))}
      </div>
      {username && (
        <form onSubmit={handleSubmit} style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>{t('write_review') || 'Write a Review'}</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>{t('rating') || 'Rating'}</label>
            <select value={rating} onChange={e => setRating(Number(e.target.value))} style={{ padding: '8px', borderRadius: 4, border: '1px solid #ddd', width: '100px' }}>
              {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Stars</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <textarea 
              value={comment} 
              onChange={e => setComment(e.target.value)} 
              placeholder={t('share_experience') || 'Share your experience...'}
              style={{ width: '100%', padding: 10, minHeight: 80, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }}
              required
            />
          </div>
          <button type="submit" className="btn-primary">{t('submit_review') || 'Submit Review'}</button>
        </form>
      )}
    </div>
  );
}

export default CompanyReview;