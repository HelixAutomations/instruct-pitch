import React from 'react';
import './PaymentSummaryMinimal.css';
import PreflightExperience from './PreflightExperience';

interface PaymentSummaryMinimalProps {
  dealData: {
    Amount: number;
    ServiceDescription: string;
    InstructionRef?: string;
    ProspectId?: number;
  };
  onProceedToPayment: () => void;
  serviceFeatures?: string[]; // Optional array of service features from fee earner selections
  showPreflight?: boolean;
  onPreflightComplete?: () => void;
}

const PaymentSummaryMinimal: React.FC<PaymentSummaryMinimalProps> = ({
  dealData,
  onProceedToPayment,
  serviceFeatures,
  showPreflight = false,
  onPreflightComplete
}) => {
  // Calculate amounts
  const subtotal = dealData.Amount;
  const vatAmount = subtotal * 0.20;
  const totalAmount = subtotal + vatAmount;

  // Default placeholder features if none provided
  const defaultFeatures = [
    'Service component 1',
    'Service component 2', 
    'Service component 3',
    'Service component 4'
  ];

  // Use provided features or fallback to defaults
  const features = serviceFeatures && serviceFeatures.length > 0 ? serviceFeatures : defaultFeatures;

  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="payment-summary-minimal">
      {/* Enhanced Header */}
      <div className="receipt-header">
        <div className="header-content">
          <h1 className="summary-title">Service Summary</h1>
        </div>
      </div>

      <div className="receipt-content">
        {/* Service Card */}
        <div className="service-card">
          <div className="service-header">
            <div className="service-details">
              <h2 className="service-name">{dealData.ServiceDescription}</h2>
            </div>
            <div className="service-price">{formatAmount(subtotal)}</div>
          </div>
        </div>

        {/* What's Included */}
        <div className="whats-included">
          <h3 className="included-title">Your service includes</h3>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <div className="feature-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/>
                  </svg>
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Pricing Summary with Morphing Container */}
        <div className="pricing-summary">
          <div className={`morph-container ${showPreflight ? 'preflight-mode' : ''}`}>
            {!showPreflight && (
              <div className="price-breakdown">
                <div className="price-line">
                  <span className="price-label">Subtotal</span>
                  <span className="price-value">{formatAmount(subtotal)}</span>
                </div>
                <div className="price-line vat-line">
                  <span className="price-label">VAT (20%)</span>
                  <span className="price-value">{formatAmount(vatAmount)}</span>
                </div>
                <div className="price-line total-line">
                  <span className="price-label">Total</span>
                  <span className="price-value total-amount">{formatAmount(totalAmount)}</span>
                </div>
              </div>
            )}
            
            {showPreflight && (
              <PreflightExperience
                amount={totalAmount}
                instructionRef={dealData.InstructionRef || 'Unknown'}
                onComplete={onPreflightComplete || (() => {})}
                isVisible={true}
              />
            )}
          </div>
        </div>

        {/* Trust Signals */}
        <div className="trust-section">
          <div className="trust-logos">
            <div className="trust-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="8" fill="#1f2937"/>
                <circle cx="24" cy="20" r="8" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M16 36c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div className="trust-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="8" fill="#059669"/>
                <path d="M12 24l8 8 16-16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="trust-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="8" fill="#3b82f6"/>
                <path d="M24 8l4 8h8l-6 6 2 8-8-4-8 4 2-8-6-6h8z" fill="white"/>
              </svg>
            </div>
            <div className="trust-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="8" fill="#dc2626"/>
                <rect x="16" y="16" width="16" height="16" rx="2" fill="white"/>
                <path d="M20 20h8M20 24h8M20 28h6" stroke="#dc2626" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Enhanced Proceed Button */}
        <button 
          className="proceed-button-minimal"
          onClick={onProceedToPayment}
        >
          <div className="button-content">
            <span className="button-text">Continue</span>
            <span className="button-amount">{formatAmount(totalAmount)}</span>
          </div>
          <div className="button-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" fill="currentColor"/>
            </svg>
          </div>
        </button>

        {/* Footer */}
        <div className="order-footer">
          <div className="company-info">
            <strong>Helix Law Limited</strong> • SRA ID: 565557
          </div>
          <div className="security-notice">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 0.75a1.5 1.5 0 011.5 1.5v.75h.75a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-4.5A.75.75 0 012.25 9V3a.75.75 0 01.75-.75H3.75V2.25A1.5 1.5 0 016 .75z" fill="currentColor"/>
            </svg>
            Secure payment processing • Data protection guaranteed
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryMinimal;
