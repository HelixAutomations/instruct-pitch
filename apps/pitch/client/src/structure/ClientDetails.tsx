import React from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import '../styles/ClientDetails.css';

interface ClientDetailsProps {
  workType: string;
  stage: string;
  instructionRef: string;
  confirmed?: boolean;
  greeting?: string | null;
  onAnimationEnd?: () => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({
  stage,
  instructionRef,
  confirmed = false,
  greeting = null,
  onAnimationEnd,
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

  // No details shown in the hero section for now
  const detailItems: { label: string; value: string }[] = [];

  return (
    <div className="client-hero">
      <div className={`client-hero-inner center${loaded ? ' loaded' : ''}`}>
        <h1 className={`stage-title${loaded ? ' loaded' : ''}`}>
          {confirmed && (
            <span className="completion-tick visible stage-tick">
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
          )}
          {stage}
        </h1>

        <SwitchTransition mode="out-in">
          <CSSTransition
            key={confirmed ? 'confirmed' : 'help'}
            timeout={300}
            classNames="hero-msg-anim"
          >
            {confirmed ? (
              <div className={`hero-confirmation${loaded ? ' loaded' : ''}`}>
                {greeting && (
                  <span className="hero-greeting">{greeting}</span>
                )}
                <span className="instruction-ref">Ref: {instructionRef}</span>
              </div>
            ) : (
              <div className={`hero-help${loaded ? ' loaded' : ''}`}>
                <span className="hero-help-prefix">We're here to help:</span>
                <div className="hero-help-contact">
                  <a href="tel:03453142044">0345 314 2044</a>
                  <span className="pipe" aria-hidden="true"></span>
                  <a href="mailto:operations@helix-law.com">operations@helix-law.com</a>
                </div>
              </div>
            )}
          </CSSTransition>
        </SwitchTransition>
        {detailItems.length > 0 && (
          <div className="client-details-bar">
            {detailItems.map((item, idx) => (
              <React.Fragment key={item.label}>
                <div className={`details-item detail-animate detail-animate-${idx}${loaded ? ' loaded' : ''}`}>
                  <span className="label">{item.label}</span>
                  <span className="value">{item.value}</span>
                </div>
                {idx < detailItems.length - 1 && <div className="pipe" />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetails;
