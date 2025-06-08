import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaInfoCircle, FaTimes } from 'react-icons/fa';

interface InfoPopoverProps {
  text: React.ReactNode;
}

const InfoPopover: React.FC<InfoPopoverProps> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const iconRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (iconRef.current && !iconRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <>
      <span
        className={`info-icon${open ? ' open' : ''}`}
        onClick={() => setOpen(true)}
        ref={iconRef}
      >
        <FaInfoCircle aria-hidden="true" />
      </span>
      {open &&
        createPortal(
          <div className="info-overlay" onClick={() => setOpen(false)}>
            <div
              className="info-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="info-close"
                onClick={() => setOpen(false)}
                aria-label="Close information"
              >
                <FaTimes aria-hidden="true" />
              </button>
              <div className="info-content">{text}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default InfoPopover;