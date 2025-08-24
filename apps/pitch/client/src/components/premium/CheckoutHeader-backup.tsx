import React from 'react';
import './CheckoutHeader-clean.css';

interface CheckoutHeaderProps {
  currentIndex: number;
  steps: { key: string; label: string }[];
  instructionRef: string;
  amount: number;
  contact?: string;
  currentStep?: string; // Add current step key for header content
}

/**
 * Elite litigation-grade checkout header - Premium professional design
 * Completely redesigned for sophisticated legal services presentation
 */
const CheckoutHeader: React.FC<CheckoutHeaderProps> = ({
  currentIndex,
  steps,
  instructionRef,
  amount,
  currentStep,
}) => {
  // Elite step content mapping
  const getStepContent = () => {
    switch (currentStep) {
      case 'identity':
        return {
          title: 'Client Identity Verification',
          description: 'Regulatory compliance verification for professional legal services',
          classification: 'AML/KYC Compliant',
          urgency: 'Standard Processing'
        };
      case 'documents':
        return {
          title: 'Confidential Document Review',
          description: 'Secure transmission and assessment of privileged materials',
          classification: 'Legally Privileged',
          urgency: 'Expedited Review'
        };
      case 'payment':
        return {
          title: 'Professional Fees Settlement',
          description: 'Secure payment processing for retained legal counsel',
          classification: 'Client Account',
          urgency: 'Immediate Processing'
        };
      default:
        return {
          title: 'Premium Legal Advisory Services',
          description: 'High-value commercial litigation and advisory matters',
          classification: 'Commercial Litigation',
          urgency: 'Priority Handling'
        };
    }
  };

  const stepContent = getStepContent();

  return (
    <div className="professional-checkout-header">
      {/* Clean Professional Header */}
      <div className="professional-header-bar">
        <div className="header-content">
          <div className="firm-identity">
            <img src="/assets/logowhite.svg" alt="Helix Law" className="helix-logo" />
          </div>
          
          <div className="header-support">
            <span className="support-text">Need help?</span>
            <a href="mailto:support@helix.legal" className="support-email">support@helix.legal</a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-main">
            <h1 className="hero-title">{stepContent.title}</h1>
            <p className="hero-description">{stepContent.description}</p>
          </div>

          {/* Hero Sidebar */}
          {amount > 0 && (
            <div className="hero-sidebar">
              <div className="amount-card">
                <div className="amount-header">
                  <span className="amount-label">Total Amount</span>
                  <span className="amount-classification">{stepContent.classification}</span>
                </div>
                <div className="amount-value">
                  £{amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="amount-note">inc. VAT where applicable</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Footer - Replacing Security Items */}
      <div className="security-footer">
        <div className="timeline-footer">
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
            />
            
            <div className="timeline-steps">
              {steps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const position = (index / (steps.length - 1)) * 100;
                
                return (
                  <div 
                    key={step.key} 
                    className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                    style={{ left: `${position}%` }}
                  >
                    <div className="step-marker"></div>
                    <span className="step-label">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="progress-meta">
            <span className="progress-text">Step {currentIndex + 1} of {steps.length}</span>
            <span className="progress-ref">Ref: {instructionRef}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutHeader;
