import React, { useState } from 'react';
import { useCompletion } from '../context/CompletionContext';
import { useClient } from '../context/ClientContext';
import { ProofData } from '../context/ProofData';
import '../styles/ReviewConfirm.css';

interface ReviewConfirmProps {
  detailsConfirmed: boolean;
  openSummaryPanel?: () => void;
  summaryContent?: React.ReactNode;
  isMobile?: boolean; // <-- Pass this down from HomePage for clarity!
  clientId?: string;
  instructionRef?: string;
  proofData?: ProofData;
  amount?: number;
  product?: string;
  workType?: string;
  aliasId?: string;
  orderId?: string;
  shaSign?: string;
  onConfirmed?: () => void;
  /** Optional callback when the user wants to edit their details again */
  onEdit?: () => void;
}

const AccordionSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = title.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="accordion-wrap">
      <div
        className="accordion-header question-banner"
        onClick={() => setOpen((o) => !o)}
        tabIndex={0}
        aria-expanded={open}
        aria-controls={id}
      >
        {title}
        <span className="accordion-toggle">{open ? '−' : '+'}</span>
      </div>
      <div
        id={id}
        className={`accordion-body ${open ? 'open' : 'collapsed'}`}
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  );
};

const ReviewConfirm: React.FC<ReviewConfirmProps> = ({
  detailsConfirmed,
  openSummaryPanel,
  summaryContent,
  isMobile = false,
  instructionRef: propInstructionRef,
  proofData,
  workType,
  aliasId,
  orderId,
  shaSign,
  amount,
  onConfirmed,
}) => {
  const { instructionRef: ctxInstructionRef } = useClient();
  const instructionRef = propInstructionRef ?? ctxInstructionRef;
  const { summaryComplete, setSummaryComplete } = useCompletion();

  const handleSubmit = async () => {
    try {
      const hasDeal = amount != null && amount > 0;
      await fetch('/api/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructionRef,
          stage: hasDeal ? 'ID Proof' : 'direct',
          ...proofData,
          consentGiven: true,
          internalStatus: hasDeal ? 'poid' : 'completed_unpaid',
          submissionTime: new Date().toISOString(),
          aliasId,
          orderId,
          shaSign,
          workType,
        })
      });
      setSummaryComplete(true);
      if (onConfirmed) onConfirmed();
    } catch (err) {
      console.error('❌ Instruction submit failed', err);
    }
  };
  return (
    <div className="next-steps-content">
      {/* Only show this prompt if NOT mobile or NOT rendering inline summary */}
      {(!isMobile || !summaryContent) && (
        <div
          className={
            'summary-confirmation-highlight' +
            (detailsConfirmed ? ' confirmed' : ' not-confirmed')
          }
          tabIndex={0}
          role="button"
          onClick={() => {
            if (openSummaryPanel) openSummaryPanel();
          }}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          aria-label="Review summary"
        >
          <span
            className={
              detailsConfirmed
                ? 'summary-confirmed-ok'
                : 'summary-confirmed-missing'
            }
          >
            {detailsConfirmed
              ? 'Your details are confirmed and ready to submit.'
              : 'Please review and confirm your details in the summary to continue.'}
          </span>
        </div>
      )}

      {(!isMobile || !summaryContent) && <hr className="review-separator" />}

      {summaryContent && (
        <div className="mobile-summary-integrated">
          {summaryContent}
        </div>
      )}

      {/* Declaration */}
      <div className="declaration-section no-border">
        {summaryComplete ? null : (
          <div className="review-actions">
            <button
              className="cta-declare-btn"
              disabled={!detailsConfirmed}
              onClick={handleSubmit}
            >
              Confirm Identity and Open a Matter
            </button>
          </div>
        )}
      </div>

      {/* Accordions */}
      <AccordionSection title="Why do we do these checks?">
        <p>
          For professional compliance and regulatory purposes we are required to verify client identity details including but not limited to ensuring we comply with the Money Laundering and Terrorist Financing (Amendment) Regulations 2019.
        </p>
        <p>
          We find completing this electronically is incredibly quick and efficient, making your life simpler (where we can verify you electronically) and avoiding the need for documents to be provided to us before we can complete work.
        </p>
      </AccordionSection>

      <AccordionSection title="How does this work?">
        <p>
          Put simply you complete your details in the form below and we then attempt to verify your identity electronically using the information provided. For the vast majority of people this avoids the need for you to take any steps such as providing documents to us. Sometimes the electronic searches can fail for entirely innocuous reasons—for example if you have moved recently or if there is a conflict in the spelling of your name.
        </p>
        <p>
          We supply the information provided by you to Tiller Technologies Limited who perform appropriate electronic and registry searches to verify your identity. Although we pay a fee for this service we do not charge you for this service. In providing instructions and the information requested below to us you are agreeing to us taking this approach. If you have any queries or if you do not wish us to verify your identity electronically you must bring this to our immediate attention and should not complete the form above. We otherwise take a risk based approach to accepting electronic verification of your identity, and reserve the right to request further information and/or documents at our discretion.
        </p>
      </AccordionSection>

      <AccordionSection title="Is there any impact on me?">
        <p>
          The primary impact on you is to reduce the time and friction that it takes for you to instruct us. Use of this system enables us most often to verify your identity quickly and efficiently, meaning we can also start working on your matter immediately.
        </p>
        <p>
          Electronic search processes and systems, including those we use, leave an electronic ‘footprint’ each time a search is conducted. Footprints detail the date, time and reason for a search. Searches for the purpose of verifying identity are often referred to as ‘soft’ searches. There are other types of electronic search footprints that are often recorded, such as when an application is submitted for lending. Some lenders refer to these as ‘hard’ searches. Both soft and hard search data is used in credit scoring systems. The timing of soft and hard searches, especially where there are lots of one or both search types in a short period of time, can have a detrimental impact on a consumer’s ability to obtain credit. We do not believe soft searches such as those we run have any impact in isolation however if you have any queries regarding this you should first confirm this with any applicable potential lenders or brokers. We cannot act or accept an instruction without verifying identity and we reserve the right to decline to act where an individual or company will not, or cannot, be verified electronically via our systems and processes.
        </p>
      </AccordionSection>

      <AccordionSection title="How is data stored?">
        <p>
          All data is held in accordance with our data protection obligations including in accordance with the GDPR (General Data Regulations) and in line with our authorisation and license with the Information Commissioner’s Office. By submitting this form you agree to Helix Law Limited storing and controlling your personal data, whether given to us now or in the future. We may use your personal data for our own marketing purposes such as regular legal updates and alerts by email and we will hold it for as long as we believe you may benefit, for as long as you are actively engaging with us, or until you withdraw consent. All information, records and reports are confidential and all data is kept and stored securely.
        </p>
        <p>
          The content of all data and records are owned by our firm.
        </p>
      </AccordionSection>
    </div>
  );
};

export default ReviewConfirm;
