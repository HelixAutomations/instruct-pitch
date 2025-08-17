import React from 'react';
import '../styles/SummaryComplete.css';

const SummaryCompleteOverlay: React.FC = () => (
  <div className="summary-complete-overlay">
    <div className="summary-complete-tick">
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
    </div>
  </div>
);

export default SummaryCompleteOverlay;