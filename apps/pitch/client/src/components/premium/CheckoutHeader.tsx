import React, { useState, useEffect } from 'react';
import { FiMail, FiPhone } from 'react-icons/fi';
import './CheckoutHeader-clean.css';

interface CompletionStatus {
  identityVerified: boolean;
  documentsUploaded: boolean;
  paymentCompleted: boolean;
}

interface CheckoutHeaderProps {
  currentIndex: number;
  steps: { key: string; label: string }[];
  instructionRef: string;
  contact?: string;
  currentStep?: string; // Add current step key for header content
  completionStatus?: CompletionStatus; // Add completion status for amalgamated display
  showMatterAnimation?: boolean; // Control matter opening animation
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
  completionStatus,
  showMatterAnimation: _showMatterAnimation = false,
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
              <div className="progress-bar" style={{ position: 'relative' }}>
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${progressAnimation}%`,
                    transition: currentStep === 'complete' ? 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s ease'
                  }}
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
            
            {/* Compact Completion Status - Seamlessly Integrated */}
            {currentStep === 'complete' && completionStatus && (
              <>
                {/* Compact Status Indicators */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '24px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: completionStatus.identityVerified ? '#7DBB7D' : '#e2e8f0'
                    }} />
                    <span style={{
                      fontSize: '11px',
                      color: '#475569',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      ID
                    </span>
                  </div>
                  
                  {/* Payment */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: completionStatus.paymentCompleted ? '#7DBB7D' : '#e2e8f0'
                    }} />
                    <span style={{
                      fontSize: '11px',
                      color: '#475569',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Payment
                    </span>
                  </div>
                  
                  {/* Documents */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: completionStatus.documentsUploaded ? '#7DBB7D' : '#e2e8f0'
                    }} />
                    <span style={{
                      fontSize: '11px',
                      color: '#475569',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Documents
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CheckoutHeader;
