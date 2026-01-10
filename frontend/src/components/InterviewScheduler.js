import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

function InterviewScheduler({ applicationId, jobId, applicantUsername, interviewerUsername, onClose, onScheduled }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('video');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('https://jobportal-3-trrm.onrender.com/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          jobId,
          applicantUsername,
          interviewerUsername,
          date,
          time,
          type,
          link
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(t('interview_scheduled_success') || 'Interview scheduled successfully');
        if (onScheduled) onScheduled(data);
        if (onClose) onClose();
      } else {
        alert(data.error || t('failed_schedule') || 'Failed to schedule interview');
      }
    } catch (error) {
      alert(t('network_error') || 'Network error');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{t('schedule_interview') || 'Schedule Interview'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label className="label">{t('date') || 'Date'}</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">{t('time') || 'Time'}</label>
              <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} required />
            </div>
            <div className="full">
              <label className="label">{t('interview_type') || 'Interview Type'}</label>
              <select className="input" value={type} onChange={e => setType(e.target.value)}>
                <option value="video">{t('video_call') || 'Video Call'}</option>
                <option value="phone">{t('phone_call') || 'Phone Call'}</option>
                <option value="in-person">{t('in_person') || 'In Person'}</option>
              </select>
            </div>
            {type === 'video' && (
              <div className="full">
                <label className="label">{t('meeting_link') || 'Meeting Link'}</label>
                <input className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://meet.google.com/..." required />
              </div>
            )}
            {type === 'in-person' && (
              <div className="full">
                <label className="label">{t('location_address') || 'Location Address'}</label>
                <input className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="Office Address" required />
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>{t('cancel') || 'Cancel'}</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? (t('scheduling') || 'Scheduling...') : (t('schedule') || 'Schedule')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InterviewScheduler;