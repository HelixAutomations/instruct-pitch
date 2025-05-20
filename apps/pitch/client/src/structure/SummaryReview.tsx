import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import "../styles/SummaryReview.css";

interface SummaryReviewProps {
  proofContent: React.ReactNode;
  documentsContent: React.ReactNode;
  paymentContent: React.ReactNode;
  summaryConfirmed: boolean;
  setSummaryConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
}

const SummaryReview: React.FC<SummaryReviewProps> = ({
  proofContent,
  documentsContent,
  paymentContent,
  summaryConfirmed,
  setSummaryConfirmed,
}) => {
  const [openSection, setOpenSection] = useState<number | null>(1);

  function handleToggle(section: number) {
    setOpenSection(openSection === section ? null : section);
  }

  return (
    <section className="summary-pane">
      <h2 className="summary-title-main">Summary</h2>

      {/* Proof of ID */}
      <div className="summary-subsection">
        <button
          className="summary-toggle"
          type="button"
          onClick={() => handleToggle(1)}
          aria-expanded={openSection === 1}
        >
          <span>Proof of ID</span>
          <span className="chevron">
            {openSection === 1 ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </button>
        <hr />
        {openSection === 1 && (
          <div className="summary-content">
            {proofContent || <span className="summary-empty">No information provided yet.</span>}
          </div>
        )}
      </div>

      {/* Document Upload */}
      <div className="summary-subsection">
        <button
          className="summary-toggle"
          type="button"
          onClick={() => handleToggle(2)}
          aria-expanded={openSection === 2}
        >
          <span>Document Upload</span>
          <span className="chevron">
            {openSection === 2 ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </button>
        <hr />
        {openSection === 2 && (
          <div className="summary-content">
            {documentsContent || <span className="summary-empty">No documents uploaded yet.</span>}
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="summary-subsection">
        <button
          className="summary-toggle"
          type="button"
          onClick={() => handleToggle(3)}
          aria-expanded={openSection === 3}
        >
          <span>Payment</span>
          <span className="chevron">
            {openSection === 3 ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </button>
        <hr />
        {openSection === 3 && (
          <div className="summary-content">
            {paymentContent || <span className="summary-empty">No payment details entered yet.</span>}
          </div>
        )}
      </div>

      {/* Confirmation */}
      <div className="summary-confirmation">
        <label className="modern-checkbox-label">
          <input
            type="checkbox"
            checked={summaryConfirmed}
            onChange={e => setSummaryConfirmed(e.target.checked)}
            className="modern-checkbox-input"
          />
          <span className="modern-checkbox-custom" aria-hidden="true">
            <svg
              className="checkbox-tick"
              viewBox="0 0 24 24"
              width="26"
              height="26"
            >
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
