import React, { useState, useCallback, useEffect, useRef } from 'react';
import UserInput from './UserInput';
import ModifyWebsiteInput from './ModifyWebsiteInput';
import StreamingLivePreview from './StreamingLivePreview';
import { generateWebsite, modifyWebsite } from '../services/geminiService';
import { downloadCodeAsZip } from '../utils/zipUtils';
import '../styles/LiveRenderer.css';
import '../styles/ScrollIndicator.css';
import '../styles/ScrollToTopButton.css';

const LiveRenderer = ({ toggleMode, isLightMode }) => {
  const [userInput, setUserInput] = useState(() => localStorage.getItem('userInput') || '');
  const [modifyInput, setModifyInput] = useState(() => localStorage.getItem('modifyInput') || '');
  const [htmlCode, setHtmlCode] = useState(() => localStorage.getItem('htmlCode') || '');
  const [cssCode, setCssCode] = useState(() => localStorage.getItem('cssCode') || '');
  const [jsCode, setJsCode] = useState(() => localStorage.getItem('jsCode') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const previewContainerRef = useRef(null);
  const inputContainerRef = useRef(null);

  // Function to scroll to the bottom of the page
  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  // Function to scroll to the preview container
  const scrollToPreview = useCallback(() => {
    // Only scroll on mobile devices
    if (window.innerWidth <= 768 && previewContainerRef.current) {
      // Show scroll indicator
      setShowScrollIndicator(true);

      // Force scroll to bottom of page first - this is more reliable
      setTimeout(() => {
        // Scroll to bottom of page
        scrollToBottom();

        // Then after a delay, try multiple approaches to ensure scrolling works
        setTimeout(() => {
          // 1. First try scrollIntoView
          if (previewContainerRef.current) {
            previewContainerRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }

          // 2. Then use direct scrollTo as backup
          setTimeout(() => {
            if (previewContainerRef.current) {
              const rect = previewContainerRef.current.getBoundingClientRect();
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const targetY = rect.top + scrollTop - 20; // 20px offset for better visibility

              window.scrollTo({
                top: targetY,
                behavior: 'smooth'
              });
            }

            // 3. Finally, show the scroll-to-top button to ensure user can navigate back
            setTimeout(() => {
              setShowScrollToTop(true);
              setShowScrollIndicator(false);
            }, 500);
          }, 200);
        }, 300);
      }, 100);
    }
  }, [scrollToBottom]);  // Include scrollToBottom in dependencies

  // Function to scroll back to the top (input container)
  const scrollToTop = useCallback(() => {
    if (window.innerWidth <= 768) {
      // First, remove any hash from the URL to prevent it from interfering with scrolling
      if (window.location.hash) {
        // Remove hash without causing page reload
        window.history.replaceState('', document.title, window.location.pathname + window.location.search);
      }

      // Multiple approaches to ensure scrolling works
      // 1. First try simple scrollTo
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      // 2. Then try scrollIntoView if input container ref exists
      setTimeout(() => {
        if (inputContainerRef.current) {
          inputContainerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }

        // 3. Finally, force scroll to top as a fallback
        setTimeout(() => {
          window.scrollTo(0, 0);
          setShowScrollToTop(false);
        }, 300);
      }, 100);
    }
  }, []);

  // Listen for scroll events to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth <= 768) {
        // Add/remove class to body based on scroll position
        const scrollPosition = window.scrollY;
        const previewPosition = previewContainerRef.current?.getBoundingClientRect().top + window.scrollY - 100 || 500;

        if (scrollPosition > previewPosition) {
          // At preview section
          document.body.classList.add('at-preview');
          document.body.classList.remove('at-top', 'at-middle');
          setShowScrollToTop(true);
        } else if (scrollPosition > 100) {
          // In the middle (between input and preview)
          document.body.classList.add('at-middle');
          document.body.classList.remove('at-top', 'at-preview');
          setShowScrollToTop(true);
          setShowScrollIndicator(true);
        } else {
          // At the top
          document.body.classList.add('at-top');
          document.body.classList.remove('at-preview', 'at-middle');
          setShowScrollToTop(false);
        }

        // Hide scroll indicator when at preview
        if (document.body.classList.contains('at-preview')) {
          setShowScrollIndicator(false);
        }
      }
    };

    // Initial class setup
    document.body.classList.add('at-top');

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Clean up classes
      document.body.classList.remove('at-preview');
      document.body.classList.remove('at-top');
    };
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('userInput', userInput);
    localStorage.setItem('modifyInput', modifyInput);
    localStorage.setItem('htmlCode', htmlCode);
    localStorage.setItem('cssCode', cssCode);
    localStorage.setItem('jsCode', jsCode);

    // Scroll to preview when content is generated (on mobile)
    if ((htmlCode || cssCode || jsCode) && !isLoading) {
      // Only scroll if this is the first time content is generated
      const isFirstGeneration = !localStorage.getItem('contentGenerated');
      if (isFirstGeneration) {
        localStorage.setItem('contentGenerated', 'true');
        scrollToPreview();
      }
    }
  }, [userInput, modifyInput, htmlCode, cssCode, jsCode, isLoading]);

  const handleGenerateWebsite = useCallback(async () => {
    if (!userInput.trim()) {
      setError('Please enter a website description');
      return;
    }
    setIsLoading(true);
    setError(null);
    setHtmlCode('');
    setCssCode('');
    setJsCode('');

    // Scroll to preview on mobile
    scrollToPreview();

    try {
      await generateWebsite(userInput, ({ html, css, js }) => {
        console.log('Received update:', { html, css, js });
        if (html) setHtmlCode(html);
        if (css) setCssCode(css);
        if (js) setJsCode(js);
      });
    } catch (err) {
      setError('Failed to generate website: ' + err.message);
      console.error('Error generating website:', err);
    } finally {
      setIsLoading(false);
      // Scroll again when finished to ensure visibility
      scrollToPreview();
    }
  }, [userInput, scrollToPreview]);

  const handleModifyWebsite = useCallback(async () => {
    if (!modifyInput.trim()) {
      setError('Please enter a modification description');
      return;
    }
    if (!htmlCode) {
      setError('Please generate a website first');
      return;
    }
    setIsLoading(true);
    setError(null);

    // Scroll to preview on mobile
    scrollToPreview();

    try {
      await modifyWebsite(modifyInput, htmlCode, cssCode, jsCode, ({ html, css, js }) => {
        if (html) setHtmlCode(html);
        if (css) setCssCode(css);
        if (js) setJsCode(js);
      });
    } catch (err) {
      console.error('Error details:', err);
      setError(err.response?.data?.error || 'Failed to modify website. Please try again.');
      console.error('Error modifying website:', err);
    } finally {
      setIsLoading(false);
      // Scroll again when finished to ensure visibility
      scrollToPreview();
    }
  }, [modifyInput, htmlCode, cssCode, jsCode, scrollToPreview]);

  const handleClear = () => {
    // Clear all stored data
    localStorage.removeItem('userInput');
    localStorage.removeItem('modifyInput');
    localStorage.removeItem('htmlCode');
    localStorage.removeItem('cssCode');
    localStorage.removeItem('jsCode');
    localStorage.removeItem('contentGenerated'); // Reset content generation flag

    // Reset state
    setUserInput('');
    setModifyInput('');
    setHtmlCode('');
    setCssCode('');
    setJsCode('');
    setError(null);

    // Scroll back to top on clear
    if (window.innerWidth <= 768) {
      scrollToTop();
    }
  };

  return (
    <div className="live-renderer">
      {/* Scroll indicator for mobile */}
      <div className={`scroll-indicator ${!showScrollIndicator ? 'hidden' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14"></path>
          <path d="M19 12l-7 7-7-7"></path>
        </svg>
        Scroll to see preview
      </div>
      <div className="input-container" ref={inputContainerRef}>
        <div className="header-container">
          <h2>WEBSITE DESCRIPTION</h2>
        </div>
        <div className="user-input-wrapper">
          <UserInput
            value={userInput}
            onChange={setUserInput}
            isLoading={isLoading}
          />
          <button
            onClick={handleGenerateWebsite}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Website'}
          </button>
        </div>

        <h2>MODIFY WEBSITE</h2>
        <div className="modify-input-wrapper">
          <ModifyWebsiteInput
            value={modifyInput}
            onChange={setModifyInput}
            isLoading={isLoading}
          />
          <button
            onClick={handleModifyWebsite}
            disabled={isLoading || !htmlCode}
          >
            {isLoading ? 'Modifying...' : 'Modify Website'}
          </button>
        </div>

        <div className="theme-toggle-container">
          <label className="theme-switch">
            <input
              type="checkbox"
              checked={isLightMode}
              onChange={toggleMode}
            />
            <span className="slider round"></span>
          </label>
          <span className="theme-label">
            {isLightMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </div>

        {error && <p className="error">{error}</p>}
      </div>

      {/* Mobile-only visual separator */}
      <div className="mobile-separator"></div>

      <div id="preview-section" className="preview-container" ref={previewContainerRef}>
        <div className="preview-header">
          <div className="preview-title-container">
            <button
              className="back-to-input-button"
              onClick={scrollToTop}
              aria-label="Back to input"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
              </svg>
              Back
            </button>
            <h2>LIVE PREVIEW</h2>
          </div>
          <div className="preview-actions">
            <button
              onClick={() => downloadCodeAsZip(htmlCode, cssCode, jsCode)}
              className="download-button"
              disabled={!htmlCode}
              title="Download code as ZIP"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Code
            </button>
            <button
              onClick={handleClear}
              className="clear-button"
              title="Clear all content"
            >
              Clear All
            </button>
          </div>
        </div>
        <StreamingLivePreview
          htmlCode={htmlCode}
          cssCode={cssCode}
          jsCode={jsCode}
          isLoading={isLoading}
        />

        {/* Mobile-only spacer for extra padding at the bottom */}
        <div className="mobile-bottom-spacer"></div>
      </div>

      {/* Scroll to top button */}
      <button
        className={`scroll-to-top ${!showScrollToTop ? 'hidden' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <div className="scroll-to-top-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5"></path>
            <path d="M5 12l7-7 7 7"></path>
          </svg>
          <span className="scroll-to-top-label">Back</span>
        </div>
      </button>

      {/* No fixed button needed anymore */}
    </div>
  );
};

export default LiveRenderer;