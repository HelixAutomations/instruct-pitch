import React, { useState, useRef, useEffect } from 'react';
import { FaInfoCircle, FaTimes } from 'react-icons/fa';
import '../styles/InfoPopover.css';

interface InfoPopoverProps {
  text: React.ReactNode;
}

const InfoPopover: React.FC<InfoPopoverProps> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="info-wrapper" ref={wrapperRef}>
      <span
        className={`info-icon${open ? ' open' : ''}`}
        onClick={() => setOpen(true)}
      >
        <FaInfoCircle aria-hidden="true" />
      </span>
      {open && (
        <div className="info-overlay" onClick={() => setOpen(false)}>
          <div
            className="info-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="info-close"
              onClick={() => setOpen(false)}
              aria-label="Close information"
            >
              <FaTimes aria-hidden="true" />
            </span>
            <div className="info-content">{text}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoPopover;
