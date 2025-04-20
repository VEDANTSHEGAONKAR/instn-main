import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="background-video"
        poster="/videos/fallback-bg.jpg"
      >
        <source src="/videos/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="overlay"></div>

      <div className="content">
        <h1>InstantCraft</h1>
        <h2>Create stunning websites in seconds with AI</h2>
        <p>
          Describe your website idea, and our AI will build it for you instantly.
          No coding required. Just your imagination.
        </p>

        <div className="cta-buttons">
          <Link to="/app" className="cta-button primary">
            Start Creating
          </Link>
          <a
            href="https://github.com/yourusername/instantcraft"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button secondary"
          >
            View on GitHub
          </a>
        </div>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">✨</div>
            <h3>AI-Powered</h3>
            <p>Harness the power of AI to generate complete websites from simple descriptions</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Instant Results</h3>
            <p>See your website come to life in real-time as the AI builds it</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📱</div>
            <h3>Responsive Design</h3>
            <p>All generated websites are mobile-friendly and work on any device</p>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} InstantCraft. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
