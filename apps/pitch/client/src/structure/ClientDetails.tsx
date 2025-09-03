import React from 'react';

import '../styles/ClientDetails.css';

interface ClientDetailsProps {
  stage: string;
  instructionRef: string;
  confirmed?: boolean;
  greeting?: string | null;
  onAnimationEnd?: () => void;
  showHelp?: boolean;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({
  stage,
  instructionRef,
  confirmed = false,
  greeting = null,
  onAnimationEnd,
  showHelp = false,
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Call onAnimationEnd after all stats finish animating
  React.useEffect(() => {
    if (loaded && onAnimationEnd) {
      const delay = 900; // ms
      const endTimer = setTimeout(() => {
        onAnimationEnd();
      }, delay);
      return () => clearTimeout(endTimer);
    }
  }, [loaded, onAnimationEnd]);

  const handleCopyRef = async () => {
    if (!instructionRef) return;
    
    const formattedRef = `HLX-${instructionRef.includes('-') ? instructionRef.split('-').pop() : instructionRef}`;
    
    try {
      await navigator.clipboard.writeText(formattedRef);
      setCopied(true);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy instruction reference:', err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = instructionRef;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="client-hero">
      <div className={`client-hero-inner center${loaded ? ' loaded' : ''}`}>
        <div className={`hero-confirmation minimal${loaded ? ' loaded' : ''}`}
        >
          {greeting && <span className="hero-line">{greeting}</span>}
          <span
            className={
              "hero-line hero-stage" +
              (stage === "We've got your instructions." ? " hero-stage-main" : "")
            }
          >
            {stage}
          </span>
          {confirmed && (
            <span 
              className={`hero-line hero-ref ${copied ? 'copied' : ''}`}
              onClick={handleCopyRef}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Click to copy reference"
            >
              <span className="completion-tick visible">
                <svg viewBox="0 0 24 24">
                  <polyline
                    points="5,13 10,18 19,7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="ref-text">HLX-{instructionRef.includes('-') ? instructionRef.split('-').pop() : instructionRef}</span>
              {copied && <span className="copy-feedback">Copied!</span>}
            </span>
          )}
        </div>
        {showHelp && (
          <div className={`hero-help${loaded ? ' loaded' : ''}`}>
            <span className="hero-help-prefix">We're here to help:</span>
            <div className="hero-help-contact">
              <a href="tel:03453142044">0345 314 2044</a>
              <span className="pipe" aria-hidden="true"></span>
              <a href="mailto:operations@helix-law.com">operations@helix-law.com</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetails;
