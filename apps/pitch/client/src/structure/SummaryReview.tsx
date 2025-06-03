import React, { useState } from "react";
import { useCompletion } from "../context/CompletionContext";
import SummaryCompleteOverlay from "./SummaryCompleteOverlay";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import "../styles/SummaryReview.css";

interface SummaryReviewProps {
  proofContent: React.ReactNode;
  documentsContent?: React.ReactNode;
  detailsConfirmed: boolean;
  setDetailsConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
}

const SummaryReview: React.FC<SummaryReviewProps> = ({
  proofContent,
  detailsConfirmed,
  setDetailsConfirmed,
}) => {
  const { summaryComplete } = useCompletion();
  /* ---------------------------------------------
     only one collapsible section now
     --------------------------------------------- */
  const [open, setOpen] = useState<boolean>(true);

  const toggle = () => setOpen((prev) => !prev);

  /* ---------- render ---------- */
  return (
    <section className="summary-pane">
      {summaryComplete && <SummaryCompleteOverlay />}
      <h2 className="summary-title-main">Summary</h2>

      {/* Proof of ID */}
      <div className="summary-subsection">
        <button
          className="summary-toggle"
          type="button"
          onClick={toggle}
          aria-expanded={open}
        >
          <span>Proof of ID</span>
          <span className="chevron">
            {open ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </button>
        <hr />
        {open && (
          <div className="summary-content">
            {proofContent ?? (
              <span className="summary-empty">No information provided yet.</span>
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
            checked={detailsConfirmed}
            onChange={(e) => setDetailsConfirmed(e.target.checked)}
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
