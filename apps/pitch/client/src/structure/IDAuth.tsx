import React, { useState } from 'react';
import { FaUser } from 'react-icons/fa';
import InfoPopover from '../components/InfoPopover';
import '../styles/IDAuth.css';

/**
 * Collects and confirms the user’s passcode.
 *  */
interface IDAuthProps {
  passcode?: string;
  setPasscode: (code: string) => void;
  setInstructionRef: (iid: string) => void;
  onConfirm: () => void;
}

const IDAuth: React.FC<IDAuthProps> = ({
  passcode = '',
  setPasscode,
  setInstructionRef,
  onConfirm,
}) => {
  const [errors, setErrors] = useState<{ passcode: string }>({
    passcode: '',
  });

  const validateInputs = () => {
    const newErrors = { passcode: '' };
    if (!passcode.trim()) newErrors.passcode = 'Your passcode is mandatory.';

    setErrors(newErrors);
    return !newErrors.passcode;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;
    try {
      const resp = await fetch(`/api/generate-instruction-ref?passcode=${passcode}`);
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
        setInstructionRef(`HLX-${passcode}-${rand}`);
        onConfirm();
      }
    }
  };

  const isButtonDisabled = !passcode.trim();

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
              Please confirm your unique <span className="highlight">Passcode</span>.
            </span>
            <InfoPopover text="Your Passcode is included in our email invitation. Enter that code to continue." />
          </div>
        </header>

        {/* inputs side‑by‑side */}
        <div className="modal-body input-row">
          <div className="input-group">
            <FaUser className={`input-icon ${passcode ? 'filled' : ''}`} />
            <input
              type="text"
              id="clientIdInput"
              className="input-field"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
            />
            {errors.passcode && <span className="error-text">{errors.passcode}</span>}
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
