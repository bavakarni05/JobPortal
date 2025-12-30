import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import JobSeekerDashboard from './components/JobSeekerDashboard';
import JobProviderDashboard from './components/JobProviderDashboard';
import JobDetails from './components/JobDetails';
import './App.css';
import './overrides.css';
import { LanguageProvider } from './LanguageContext';
import LanguageSelector from './components/LanguageSelector';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('');

  const handleLogin = (selectedRole) => {
    setIsLoggedIn(true);
    setRole(selectedRole);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setRole('');
    localStorage.removeItem('username');
  };

  return (
    <LanguageProvider>
      <Router>
        <LanguageSelector />
        <Routes>
          <Route path="/" element={!isLoggedIn ? <AuthPage onLogin={handleLogin} /> : (role === 'jobseeker' ? <JobSeekerDashboard onLogout={handleLogout} /> : <JobProviderDashboard onLogout={handleLogout} />)} />
          <Route path="/seeker" element={<JobSeekerDashboard onLogout={handleLogout} />} />
          <Route path="/provider" element={<JobProviderDashboard onLogout={handleLogout} />} />
          <Route path="/jobs/:jobId" element={<JobDetails />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
