import React from 'react';

interface CheckoutHeaderProps {
  currentIndex: number;
  total: number;
  steps: { key: string; label: string }[];
  instructionRef: string;
  amount: number;
  contact?: string;
}

/**
 * Lightweight top bar header for the modern checkout.
 * Shows brand, linear progress, and minimal instruction meta.
 */
const CheckoutHeader: React.FC<CheckoutHeaderProps> = ({
  currentIndex,
  total,
  steps,
  instructionRef,
  amount,
  contact,
}) => {
  const pct = ((currentIndex + 1) / total) * 100;
  return (
    <header className="lite-header" aria-label="Checkout progress header">
      <div className="lite-header-left">
        <span className="lite-logo" aria-hidden="true">⚖</span>
        <span className="lite-brand">Helix Law</span>
      </div>
      <div className="lite-progress" aria-label="Progress" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={total}>
        <div className="lite-progress-track">
          <div className="lite-progress-bar" style={{ width: pct + '%' }} />
        </div>
        <ul className="lite-steps" aria-hidden="true">
          {steps.map((s, i) => (
            <li key={s.key} className={i < currentIndex ? 'done' : i === currentIndex ? 'active' : ''}>{i + 1}</li>
          ))}
        </ul>
      </div>
      <div className="lite-meta">
        <div className="lite-ref" title="Instruction Reference">{instructionRef}</div>
        {amount > 0 && (
          <div className="lite-amt">£{amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
        )}
        {contact && <div className="lite-contact" title="Solicitor">{contact}</div>}
      </div>
    </header>
  );
};

export default CheckoutHeader;
