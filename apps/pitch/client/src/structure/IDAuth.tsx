import React, { useState } from 'react';
import { FaUser, FaInfoCircle } from 'react-icons/fa';
import '../styles/IDAuth.css';

/**
 * Collects and confirms the user’s Client ID.
 *  */
interface IDAuthProps {
  clientId?: string;
  setClientId: (cid: string) => void;
  setInstructionRef: (iid: string) => void;
  onConfirm: () => void;
}

const IDAuth: React.FC<IDAuthProps> = ({
  clientId = '',
  setClientId,
  setInstructionRef,
  onConfirm,
}) => {
  const [errors, setErrors] = useState<{ clientId: string }>({
    clientId: '',
  });

  const validateInputs = () => {
    const newErrors = { clientId: '' };
    if (!clientId.trim()) newErrors.clientId = 'Your Client ID is mandatory.';

    setErrors(newErrors);
    return !newErrors.clientId;
  };

  const handleSubmit = () => {
    if (validateInputs()) {
      const now = new Date();
      const ddmm = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const iid = `HLX-${clientId}-${ddmm}`;
      setInstructionRef(iid);
      onConfirm();
    }
  };

  const isButtonDisabled = !clientId.trim();

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
              Please confirm your unique <span className="highlight">Client ID</span>.
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
