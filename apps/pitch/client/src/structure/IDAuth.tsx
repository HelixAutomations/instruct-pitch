import React, { useState } from 'react';
import { FaUser } from 'react-icons/fa';
import InfoPopover from '../components/InfoPopover';
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

  const handleSubmit = async () => {
    if (!validateInputs()) return;
    try {
      const resp = await fetch(`/api/generate-instruction-ref?cid=${clientId}`);
      const data = await resp.json();
      if (data.instructionRef) {
        setInstructionRef(data.instructionRef);
        onConfirm();
        return;
      }
      throw new Error('No instructionRef returned');
    } catch (err) {
      console.error('Failed to fetch instruction reference', err);
      if (import.meta.env.DEV) {
        const rand = Math.floor(Math.random() * 9000) + 1000;
        setInstructionRef(`HLX-${clientId}-${rand}`);
        onConfirm();
      }
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
            <InfoPopover text="Your Client ID is included in our email invitation. Enter that ID to continue." />
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
