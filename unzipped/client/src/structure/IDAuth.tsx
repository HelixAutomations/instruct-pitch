import React, { useState } from 'react';
import { FaUser, FaRegFileAlt, FaInfoCircle } from 'react-icons/fa';
import '../styles/IDAuth.css';

/**
 * Collects and confirms the user’s Client ID and Instruction ID.
 */
interface IDAuthProps {
  clientId?: string;
  instructionId?: string;
  setClientId: (cid: string) => void;
  setInstructionId: (iid: string) => void;
  onConfirm: () => void;
}

const IDAuth: React.FC<IDAuthProps> = ({
  clientId = '',
  instructionId = '',
  setClientId,
  setInstructionId,
  onConfirm,
}) => {
  const [errors, setErrors] = useState<{ clientId: string; instructionId: string }>({
    clientId: '',
    instructionId: '',
  });

  const validateInputs = () => {
    const newErrors = { clientId: '', instructionId: '' };

    if (!clientId.trim()) newErrors.clientId = 'Your Client ID is mandatory.';
    if (!instructionId.trim()) newErrors.instructionId = 'Please enter your Instruction ID.';

    setErrors(newErrors);
    return !newErrors.clientId && !newErrors.instructionId;
  };

  const handleSubmit = () => {
    if (validateInputs()) onConfirm();
  };

  const isButtonDisabled = !clientId.trim() || !instructionId.trim();

  return (
    <div
      className="modal-overlay"
      tabIndex={-1}
      // This ensures clicking on the overlay won't close the modal or bubble up
      onClick={e => e.stopPropagation()}
    >
      <div
        className="modal-content"
        // This ensures clicking inside the modal doesn't bubble to overlay
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="info-box">
            <span>
              Please confirm your unique <span className="highlight">Client ID</span> or{' '}
              <span className="highlight">Instruction ID</span>.
            </span>
            <FaInfoCircle className="info-icon" aria-hidden="true" />
          </div>
        </header>

        {/* inputs side‑by‑side */}
        <div className="modal-body input-row">
          <div className="input-group">
            <FaUser className={`input-icon ${clientId ? 'filled' : ''}`} />
            <input
              type="text"
              id="clientIdInput"
              className="input-field"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client ID"
            />
            {errors.clientId && <span className="error-text">{errors.clientId}</span>}
          </div>

          <div className="input-group">
            <FaRegFileAlt className={`input-icon ${instructionId ? 'filled' : ''}`} />
            <input
              type="text"
              id="instructionIdInput"
              className="input-field"
              value={instructionId}
              onChange={(e) => setInstructionId(e.target.value)}
              placeholder="Instruction ID"
            />
            {errors.instructionId && (
              <span className="error-text">{errors.instructionId}</span>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="confirm-btn"
            onClick={handleSubmit}
            disabled={isButtonDisabled}
          >
            Verify&nbsp;&amp;&nbsp;Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default IDAuth;
