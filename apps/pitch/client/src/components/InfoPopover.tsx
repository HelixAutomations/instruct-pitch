import React, { useState } from 'react';
import { FaInfoCircle, FaTimes } from 'react-icons/fa';

interface InfoPopoverProps {
  text: React.ReactNode;
}

const InfoPopover: React.FC<InfoPopoverProps> = ({ text }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span className="info-icon" onClick={() => setOpen(true)}>
        <FaInfoCircle aria-hidden="true" />
      </span>
      {open && (
        <div className="info-overlay" onClick={() => setOpen(false)}>
          <div className="info-popup" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="close-btn"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <FaTimes aria-hidden="true" />
            </button>
            <div className="help-text">{text}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoPopover;