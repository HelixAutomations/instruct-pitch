import React from 'react';
import './CheckoutHeader-clean.css';

interface CheckoutHeaderProps {
  currentIndex: number;
  steps: { key: string; label: string }[];
  instructionRef: string;
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
  currentStep,
}) => {
  // Elite step content mapping
  const getStepContent = () => {
    switch (currentStep) {
      case 'identity':
        return {
          title: 'Prove Your Identity',
          description: 'Electronic identity verification for compliance with Money Laundering Regulations - avoids the need for physical documents where successful. If verification fails, additional documents may be requested.',
          classification: 'AML/KYC Compliant',
          urgency: 'Standard Processing'
        };
      case 'documents':
        return {
          title: 'Upload Documents',
          description: 'Upload your documents securely using our encrypted system. All files are legally privileged and stored confidentially.',
          classification: 'Legally Privileged',
          urgency: 'Expedited Review'
        };
      case 'payment':
        return {
          title: 'Pay',
          description: 'Secure payment processing for your legal services. Your matter will be opened immediately upon payment completion.',
          classification: 'Client Account',
          urgency: 'Immediate Processing'
        };
      default:
        return {
          title: 'Instruct Helix Law',
          description: 'Complete your instruction with our secure, three-step process: identity verification, document upload, and payment.',
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
            <img src="/assets/logowhite.svg" alt="Helix Law" className="helix-logo helix-logo-desktop" />
            <img src="/assets/markwhite.svg" alt="Helix Law" className="helix-logo helix-logo-mobile" />
          </div>
          
          <div className="header-support">
            <span className="support-text">Need help?</span>
            <a href="mailto:support@helix-law.com" className="support-email">support@helix-law.com</a>
          </div>
        </div>
      </div>

      {/* Hero Section with Integrated Progress */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-main">
            <div className="hero-progress-meta">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
            <h1 className="hero-title">{stepContent.title}</h1>
            <p className="hero-description">{stepContent.description}</p>
            {instructionRef && (
              <div className="instruction-ref">
                <span className="ref-label">Reference:</span>
                <span className="ref-value">{instructionRef}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutHeader;
