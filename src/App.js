import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LiveRenderer from './components/LiveRenderer';
import LandingPage from './components/LandingPage';
import './styles/LiveRenderer.css';
import './styles/GlobalStyles.css';

function App() {
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('light-mode', isLightMode);
  }, [isLightMode]);

  const toggleMode = () => {
    setIsLightMode(!isLightMode);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={
          <div className="App" style={{
            minHeight: '100vh',
            overflow: 'visible',
            backgroundColor: 'var(--background-color)',
            color: 'var(--text-color)'
          }}>
            <div style={{
              padding: '5px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <h1 style={{
                margin: '2px 0',
                color: 'var(--heading-color)',
                fontSize: 'clamp(18px, 4vw, 28px)',
                fontWeight: '600',
                letterSpacing: '0.5px'
              }}>
                InstantCraft
              </h1>
              <a
                href="/"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-color)',
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                Back to Home
              </a>
            </div>
            <LiveRenderer toggleMode={toggleMode} isLightMode={isLightMode} />
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;