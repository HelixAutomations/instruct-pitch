import React from 'react';

import '../styles/ClientDetails.css';

import {
  FaClipboardList,
  FaIdBadge,
  FaUserTie,
  FaEnvelope,
} from 'react-icons/fa';


interface ClientDetailsProps {
  workType: string;
  stage: string;
  instructionRef: string;
  clientId?: string;
  feeEarner?: string;
  email?: string;
  confirmed?: boolean;
  greeting?: string | null;
  onAnimationEnd?: () => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({
  stage,
  instructionRef,
  clientId,
  feeEarner,
  email,
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

  const detailItems: { label: string; value: string; icon: JSX.Element }[] = [];

  if (instructionRef) {
    detailItems.push({
      label: 'Instruction Ref',
      value: instructionRef,
      icon: <FaClipboardList />,
    });
  }

  if (clientId) {
    detailItems.push({
      label: 'Client ID',
      value: clientId,
      icon: <FaIdBadge />,
    });
  }

  if (feeEarner) {
    detailItems.push({
      label: 'Fee Earner',
      value: feeEarner,
      icon: <FaUserTie />,
    });
  }

  if (email) {
    detailItems.push({
      label: 'Email',
      value: email,
      icon: <FaEnvelope />,
    });
  }


  return (
    <div className="client-hero">
      <div className={`client-hero-inner center${loaded ? ' loaded' : ''}`}>
        {confirmed ? (
          <div className={`hero-confirmation${loaded ? ' loaded' : ''}`}>
            {greeting && <span className="hero-greeting">{greeting}</span>}
            <h1 className={`stage-title confirmed${loaded ? ' loaded' : ''}`}>{stage}</h1>
            <span className="instruction-ref">
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
          </div>
        ) : (
          <h1 className={`stage-title${loaded ? ' loaded' : ''}`}>{stage}</h1>
        )}

        {!confirmed && (
          <div className={`hero-help${loaded ? ' loaded' : ''}`}>
            <span className="hero-help-prefix">We're here to help:</span>
            <div className="hero-help-contact">
              <a href="tel:03453142044">0345 314 2044</a>
              <span className="pipe" aria-hidden="true"></span>
              <a href="mailto:operations@helix-law.com">operations@helix-law.com</a>
            </div>
          </div>
        )}
        {detailItems.length > 0 && (
          <div className="client-details-bar">
            {detailItems.map((item, idx) => (
              <React.Fragment key={item.label}>
                <div
                  className={`details-item detail-animate detail-animate-${idx}${loaded ? ' loaded' : ''}`}
                >
                  <span className="detail-icon">{item.icon}</span>
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
