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
            <span className="hero-line hero-ref">
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
              {instructionRef}
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
