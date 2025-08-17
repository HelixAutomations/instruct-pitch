import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);
  useEffect(() => {
    function updatePosition() {
      if (iconRef.current && modalRef.current) {
        const iconRect = iconRef.current.getBoundingClientRect();
        const modalRect = modalRef.current.getBoundingClientRect();

        let left = iconRect.left;
        if (left + modalRect.width > window.innerWidth - 8) {
          left = window.innerWidth - modalRect.width - 8;
        }
        if (left < 8) left = 8;

        let top = iconRect.bottom + 8;
        if (top + modalRect.height > window.innerHeight - 8) {
          top = iconRect.top - modalRect.height - 8;
        }
        if (top < 8) top = 8;

        setModalPos({ top, left });
      }
    }

    if (open) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
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
              top: rect.bottom + 8,
              left: rect.left,
            });
          }
          setOpen(true);
        }}
      >
        <FaInfoCircle aria-hidden="true" />
      </span>
      {open &&
        ReactDOM.createPortal(
          <div className="info-overlay" onClick={() => setOpen(false)}>
            <div
              ref={modalRef}
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
          </div>,
          document.body
        )}
    </div>
  );
};

export default InfoPopover;
