import React from 'react';
import '../styles/ClientDetails.css';

interface ClientDetailsProps {
  workType: string; // you can remove this prop if unused elsewhere
  instructionRef: string;
  stage: string;
  onAnimationEnd?: () => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({
  instructionRef,
  stage,
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

  // Only show the instruction reference
  const detailItems = [
    { label: 'Instruction Ref', value: instructionRef || '—' }
  ];

  return (
    <div className="client-hero">
      <div className={`client-hero-inner center${loaded ? ' loaded' : ''}`}>
        <h1 className={`stage-title${loaded ? ' loaded' : ''}`}>{stage}</h1>
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
      </div>
    </div>
  );
};

export default ClientDetails;
