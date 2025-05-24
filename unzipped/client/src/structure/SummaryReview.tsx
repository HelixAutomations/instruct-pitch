import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import "../styles/SummaryReview.css";

interface SummaryReviewProps {
  proofContent: React.ReactNode;
  documentsContent: React.ReactNode;
  summaryConfirmed: boolean;
  setSummaryConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
}

const SummaryReview: React.FC<SummaryReviewProps> = ({
  proofContent,
  documentsContent,
  summaryConfirmed,
  setSummaryConfirmed,
}) => {
  /* ---------------------------------------------
     keep a map of “open” states – start with BOTH
     --------------------------------------------- */
  const [open, setOpen] = useState<Record<number, boolean>>({
    1: true, // Proof of ID  (open)
    2: true, // Document upload (open)
  });

  const toggle = (section: 1 | 2) =>
    setOpen((prev) => ({ ...prev, [section]: !prev[section] }));

  /* ---------- render ---------- */
  return (
    <section className="summary-pane">
      <h2 className="summary-title-main">Summary</h2>

      {/* Proof of ID */}
      <div className="summary-subsection">
        <button
          className="summary-toggle"
          type="button"
          onClick={() => toggle(1)}
          aria-expanded={open[1]}
        >
          <span>Proof of ID</span>
          <span className="chevron">
            {open[1] ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </button>
        <hr />
        {open[1] && (
          <div className="summary-content">
            {proofContent ?? (
              <span className="summary-empty">No information provided yet.</span>
            )}
          </div>
        )}
      </div>

      {/* Document Upload */}
      <div className="summary-subsection">
        <button
          className="summary-toggle"
          type="button"
          onClick={() => toggle(2)}
          aria-expanded={open[2]}
        >
          <span>Document Upload</span>
          <span className="chevron">
            {open[2] ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </button>
        <hr />
        {open[2] && (
          <div className="summary-content">
            {documentsContent ?? (
              <span className="summary-empty">No documents uploaded yet.</span>
            )}
          </div>
        )}
      </div>

      {/* Confirmation */}
      <div className="summary-confirmation">
        <label className="modern-checkbox-label">
          <input
            type="checkbox"
            className="modern-checkbox-input"
            checked={summaryConfirmed}
            onChange={(e) => setSummaryConfirmed(e.target.checked)}
          />
          <span className="modern-checkbox-custom" aria-hidden="true">
            <svg className="checkbox-tick" viewBox="0 0 24 24" width="26" height="26">
              <polyline
                className="tick"
                points="5,13 10,18 19,7"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="modern-checkbox-text">
            I confirm the above information is accurate.
          </span>
        </label>
      </div>
    </section>
  );
};

export default SummaryReview;
