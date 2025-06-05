import React, { useState, useEffect } from "react";
import { useCompletion } from "../context/CompletionContext";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import "../styles/SummaryReview.css";

interface SummaryReviewProps {
  proofContent: React.ReactNode;
  documentsContent?: React.ReactNode;
  detailsConfirmed: boolean;
  setDetailsConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * Whether to show the confirmation checkbox. By default the
   * checkbox is visible, but callers can hide it until the user
   * progresses to the review stage.
   */
  showConfirmation?: boolean;
}

const SummaryReview: React.FC<SummaryReviewProps> = ({
  proofContent,
  detailsConfirmed,
  setDetailsConfirmed,
  showConfirmation = true,
}) => {
  const { summaryComplete } = useCompletion();
  /* ---------------------------------------------
     only one collapsible section now
     --------------------------------------------- */
  const [open, setOpen] = useState<boolean>(true);

  // When completion status changes, collapse on complete and reopen if
  // the user marks it incomplete again for further edits
  useEffect(() => {
    setOpen(!summaryComplete);
  }, [summaryComplete]);

  // Ensure the summary is visible when confirmation must be displayed
  useEffect(() => {
    if (showConfirmation) {
      setOpen(true);
    }
  }, [showConfirmation]);

  const toggle = () => setOpen((prev) => !prev);

  /* ---------- render ---------- */
  return (
    <section className="summary-pane">
      <button
        type="button"
        className="summary-title-main summary-toggle"
        onClick={toggle}
        aria-expanded={open}
      >
        <span>Summary</span>
        <span className="chevron">
          {open ? <FiChevronUp /> : <FiChevronDown />}
        </span>
      </button>

      {summaryComplete && (
        <button
          type="button"
          className="summary-complete-header"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <span className="summary-complete-small" aria-hidden="true">
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
          <span>Summary complete</span>
          <span className="chevron">
            {open ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </button>
      )}

      {open && (
        <>
          <div className="summary-subsection">
            <div className="summary-content">
              {proofContent ?? (
                <span className="summary-empty">No information provided yet.</span>
              )}
            </div>
          </div>

          {/* Confirmation */}
          {showConfirmation && (
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
          )}
        </>
      )}
    </section>
  );
};

export default SummaryReview;
