import React, { useState, useEffect } from 'react';
import { FiMail, FiPhone } from 'react-icons/fi';
import './CheckoutHeader-clean.css';

interface CheckoutHeaderProps {
  currentIndex: number;
  steps: { key: string; label: string }[];
  instructionRef: string;
  contact?: string;
  currentStep?: string; // Add current step key for header content
  showMatterAnimation?: boolean; // Control matter opening animation
  showInstructionRef?: boolean; // Control display of instruction reference
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
  showMatterAnimation: _showMatterAnimation = false,
  showInstructionRef = true,
}) => {
  const [progressAnimation, setProgressAnimation] = useState(0);

  // Animate progress bar completion for the complete step
  useEffect(() => {
    if (currentStep === 'complete') {
      // Animate to 100% first
      setTimeout(() => setProgressAnimation(100), 200);
    } else {
      setProgressAnimation(((currentIndex + 1) / steps.length) * 100);
    }
  }, [currentStep, currentIndex, steps.length]);

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
          title: 'Pay Helix Law Ltd',
          description: 'Complete your instruction with our secure payment system. Your matter will be opened and assigned to your Solicitor immediately.',
          classification: 'Client Account',
          urgency: 'Immediate Processing'
        };
      case 'complete':
        return {
          title: 'Instruction Complete',
          description: 'Your instruction has been successfully submitted and processed.',
          classification: 'Matter Opened',
          urgency: 'Confirmed'
        };
      case 'error':
        return {
          title: 'Payment Not Completed',
          description: 'Your card payment didn\'t go through. You can still complete your instruction now by sending a bank transfer – details are below.',
          classification: 'Action Required',
          urgency: 'Attention'
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
    <>
      <style>
        {`
          @keyframes completionBadge {
            0% {
              transform: translateY(-50%) scale(0);
              opacity: 0;
            }
            50% {
              transform: translateY(-50%) scale(1.2);
              opacity: 1;
            }
            100% {
              transform: translateY(-50%) scale(1);
              opacity: 1;
            }
          }
          
          @keyframes chainComplete {
            0% {
              transform: scale(0.8);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}
      </style>
      <div className="professional-checkout-header">
      {/* Clean Professional Header */}
      <div className="professional-header-bar">
        <div className="header-content">
          <div className="firm-identity">
            <img src="/assets/logowhite.svg" alt="Helix Law" className="helix-logo helix-logo-desktop" />
            <img src="/assets/markwhite.svg" alt="Helix Law" className="helix-logo helix-logo-mobile" />
          </div>
          
          <div className="header-support">
            <a href="tel:03451234567" className="support-phone support-phone-desktop">0345 123 4567</a>
            <a href="tel:03451234567" className="support-phone support-phone-mobile" title="Call us">
              <FiPhone size={20} />
            </a>
            <a href="mailto:support@helix-law.com" className="support-email support-email-desktop">support@helix-law.com</a>
            <a href="mailto:support@helix-law.com" className="support-email support-email-mobile" title="Email us">
              <FiMail size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section with Integrated Progress */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-main">
            <div className="hero-progress-meta">
              <div className={`progress-bar ${currentStep === 'complete' ? 'complete' : ''} ${currentStep === 'error' ? 'error' : ''}`} style={{ position: 'relative' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${progressAnimation}%`,
                    transition: (currentStep === 'complete' || currentStep === 'error') ? 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
            <h1 className={`hero-title ${currentStep === 'complete' ? 'complete-title' : ''} ${currentStep === 'error' ? 'error-title' : ''}`}>
              {currentStep === 'complete' && (
                <span className="completion-badge" aria-label="Instruction Complete" role="img">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="11" strokeOpacity="0.25" />
                    <path d="M7.8 12.5l3 3.1 5.4-6.6" />
                  </svg>
                </span>
              )}
              {currentStep === 'error' && (
                <span className="error-badge" aria-label="Instruction Failed" role="img">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="11" strokeOpacity="0.25" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </span>
              )}
              {stepContent.title}
            </h1>
            <p className="hero-description">{stepContent.description}</p>
            {instructionRef && showInstructionRef && (
              <div className="instruction-ref">
                <span className="ref-label">Reference:</span>
                <span className="ref-value">{instructionRef}</span>
              </div>
            )}
            
            {/* Compact completion status pill removed per request */}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CheckoutHeader;
