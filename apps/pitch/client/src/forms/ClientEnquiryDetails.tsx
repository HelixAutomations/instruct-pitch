import React, { useState } from 'react';
import { FaUser, FaRegFileAlt } from 'react-icons/fa';
import '../styles/EnquiryDetailsConfirmation.css';

interface EnquiryDetailsConfirmationProps {
  prospectId: string;
  enquiryId: string;
  setProspectId: (pid: string) => void;
  setEnquiryId: (eid: string) => void;
  onConfirm: () => void;
}

const EnquiryDetailsConfirmation: React.FC<EnquiryDetailsConfirmationProps> = ({
  prospectId,
  enquiryId,
  setProspectId,
  setEnquiryId,
  onConfirm,
}) => {
  const [errors, setErrors] = useState<{ prospectId: string; enquiryId: string }>({
    prospectId: '',
    enquiryId: '',
  });

  const validateInputs = () => {
    const newErrors = { prospectId: '', enquiryId: '' };

    if (!prospectId.trim()) {
      newErrors.prospectId = 'Your Prospect ID is mandatory.';
    }

    if (!enquiryId.trim()) {
      newErrors.enquiryId = 'Please enter your Enquiry ID.';
    }

    setErrors(newErrors);
    return !newErrors.prospectId && !newErrors.enquiryId;
  };

  const handleSubmit = () => {
    if (validateInputs()) {
      onConfirm();
    }
  };

  const isButtonDisabled = !prospectId.trim() || !enquiryId.trim();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <header className="modal-header">
          <div className="info-box">
            Please confirm your unique client reference number or enquiry id.
          </div>
        </header>

        {/* Input fields arranged side by side */}
        <div className="modal-body input-row">
          <div className="input-group">
            <FaUser className={`input-icon ${prospectId ? 'filled' : ''}`} />
            <input
              type="text"
              id="prospectIdInput"
              className="input-field"
              value={prospectId}
              onChange={(e) => setProspectId(e.target.value)}
              placeholder="Prospect ID"
            />
            {errors.prospectId && <span className="error-text">{errors.prospectId}</span>}
          </div>

          <div className="input-group">
            <FaRegFileAlt className={`input-icon ${enquiryId ? 'filled' : ''}`} />
            <input
              type="text"
              id="enquiryIdInput"
              className="input-field"
              value={enquiryId}
              onChange={(e) => setEnquiryId(e.target.value)}
              placeholder="Enquiry ID"
            />
            {errors.enquiryId && <span className="error-text">{errors.enquiryId}</span>}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="confirm-btn"
            onClick={handleSubmit}
            disabled={isButtonDisabled}
          >
            Verify &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnquiryDetailsConfirmation;
