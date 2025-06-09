import React from 'react';
import '../styles/ClientDetails.css';

interface ClientDetailsProps {
  workType: string;
  stage: string;
  instructionRef: string; // NEW
  onAnimationEnd?: () => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({
  stage,
  instructionRef, // ← add this
  onAnimationEnd
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
        <h1 className={`stage-title${loaded ? ' loaded' : ''}`}>{stage}</h1>
        {instructionRef && (
          <div className="instruction-subject">
            RE: Instruction [{instructionRef}]
          </div>
        )}
        <div className="hero-help">
          <span className="hero-help-prefix">We're here to help:</span>
          <div className="hero-help-contact">
            <a href="tel:03453142044">0345 314 2044</a>
            <span className="pipe" aria-hidden="true"></span>
            <a href="mailto:operations@helix-law.com">operations@helix-law.com</a>
          </div>
        </div>
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
