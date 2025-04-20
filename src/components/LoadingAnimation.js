import React from 'react';
import '../styles/LoadingAnimation.css';

const LoadingAnimation = ({ progress, htmlProgress, cssProgress, jsProgress }) => {
  // Calculate overall progress percentage
  const overallProgress = Math.min(100, Math.round((htmlProgress + cssProgress + jsProgress) / 3));
  
  return (
    <div className="loading-animation">
      <div className="loading-container">
        <h3>Building Your Website</h3>
        
        <div className="progress-container">
          <div className="progress-label">
            <span>HTML</span>
            <span>{htmlProgress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill html-fill" 
              style={{ width: `${htmlProgress}%` }}
            ></div>
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-label">
            <span>CSS</span>
            <span>{cssProgress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill css-fill" 
              style={{ width: `${cssProgress}%` }}
            ></div>
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-label">
            <span>JavaScript</span>
            <span>{jsProgress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill js-fill" 
              style={{ width: `${jsProgress}%` }}
            ></div>
          </div>
        </div>
        
        <div className="building-animation">
          {Array(5).fill().map((_, i) => (
            <div 
              key={i} 
              className="building-block"
              style={{ 
                animationDelay: `${i * 0.2}s`,
                opacity: overallProgress > i * 20 ? 1 : 0.2
              }}
            ></div>
          ))}
        </div>
        
        <div className="loading-message">
          {overallProgress < 20 && "Analyzing your request..."}
          {overallProgress >= 20 && overallProgress < 40 && "Creating structure..."}
          {overallProgress >= 40 && overallProgress < 60 && "Styling elements..."}
          {overallProgress >= 60 && overallProgress < 80 && "Adding functionality..."}
          {overallProgress >= 80 && overallProgress < 100 && "Finalizing website..."}
          {overallProgress >= 100 && "Website ready!"}
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
