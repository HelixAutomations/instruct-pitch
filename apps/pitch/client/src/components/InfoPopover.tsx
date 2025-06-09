import React, { useState, useRef, useEffect } from 'react';
import { FaInfoCircle, FaTimes } from 'react-icons/fa';
import '../styles/InfoPopover.css';

interface InfoPopoverProps {
  text: React.ReactNode;
}

const InfoPopover: React.FC<InfoPopoverProps> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const [modalPos, setModalPos] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);

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
        ref={iconRef}
        className={`info-icon${open ? ' open' : ''}`}
        onClick={() => {
          if (iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            setModalPos({
              top: rect.bottom + window.scrollY + 8,
              left: rect.left + window.scrollX,
            });
          }
          setOpen(true);
        }}
      >
        <FaInfoCircle aria-hidden="true" />
      </span>
      {open && (
        <div className="info-overlay" onClick={() => setOpen(false)}>
          <div
            className="info-modal"
            style={{ top: modalPos.top, left: modalPos.left }}
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
