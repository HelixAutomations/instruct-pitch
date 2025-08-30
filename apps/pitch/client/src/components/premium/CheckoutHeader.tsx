import React, { useState, useEffect } from 'react';
import { FiMail } from 'react-icons/fi';
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
 * Matter Opening Animation Component
 */
const MatterOpeningAnimation: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div style={{
      padding: 'clamp(16px, 4vw, 20px)',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      borderRadius: '8px',
      border: '1px solid #bbf7d0',
      marginBottom: 'clamp(16px, 4vw, 20px)',
      textAlign: 'center'
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: 'clamp(14px, 3.5vw, 16px)',
        fontWeight: '600',
        color: '#16a34a'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          background: '#16a34a',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 2s infinite'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="9,11 12,14 22,4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        Matter Opening in Progress...
      </div>
      <div style={{
        fontSize: 'clamp(12px, 3vw, 13px)',
        color: '#15803d',
        marginTop: '4px'
      }}>
        We will be in touch shortly to confirm your matter details.
      </div>
    </div>
  );
};

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
  showMatterAnimation = false,
}) => {
  const [progressAnimation, setProgressAnimation] = useState(0);
  const [showCompletionBadge, setShowCompletionBadge] = useState(false);

  // Animate progress bar completion for the complete step
  useEffect(() => {
    if (currentStep === 'complete') {
      // Animate to 100% first
      setTimeout(() => setProgressAnimation(100), 200);
      // Then show completion badge
      setTimeout(() => setShowCompletionBadge(true), 800);
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
          description: 'Secure payment processing for your legal services. Your matter will be opened immediately upon payment completion.',
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
            <span className="support-text">Need help?</span>
            <a href="mailto:support@helix-law.com" className="support-email support-email-desktop">support@helix-law.com</a>
            <a href="mailto:support@helix-law.com" className="support-email support-email-mobile" title="Need help? Email us">
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
                {showCompletionBadge && (
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#16a34a',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'completionBadge 0.5s ease-out'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="9,11 12,14 22,4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
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
            
            {/* Amalgamated Completion Status - Integrated into Hero */}
            {currentStep === 'complete' && completionStatus && (
              <div style={{ marginTop: 'clamp(24px, 6vw, 32px)' }}>
                {/* Matter Opening Animation */}
                {showMatterAnimation && <MatterOpeningAnimation isVisible={showMatterAnimation} />}
                
                {/* Redesigned Completion Dashboard */}
                <div style={{ 
                  marginTop: showMatterAnimation ? 'clamp(20px, 5vw, 24px)' : '12px',
                  padding: 'clamp(16px, 4vw, 20px)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Header Row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h4 style={{
                      margin: '0',
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.95)',
                      letterSpacing: '-0.01em'
                    }}>
                      Instruction Complete
                    </h4>
                    <div style={{
                      padding: '4px 12px',
                      background: '#7DBB7D',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: 'white',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      CONFIRMED
                    </div>
                  </div>

                  {/* Status Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 'clamp(12px, 3vw, 16px)',
                    marginBottom: '16px'
                  }}>
                    {/* Identity Card */}
                    <div style={{
                      padding: '12px',
                      background: completionStatus.identityVerified 
                        ? 'rgba(125, 187, 125, 0.15)' 
                        : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: `1px solid ${completionStatus.identityVerified ? 'rgba(125, 187, 125, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: completionStatus.identityVerified ? '#7DBB7D' : 'rgba(255, 255, 255, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {completionStatus.identityVerified && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="9,11 12,14 22,4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: completionStatus.identityVerified ? '#7DBB7D' : 'rgba(255, 255, 255, 0.7)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {completionStatus.identityVerified ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: '400'
                      }}>
                        Identity Check
                      </div>
                    </div>

                    {/* Documents Card */}
                    <div style={{
                      padding: '12px',
                      background: completionStatus.documentsUploaded 
                        ? 'rgba(125, 187, 125, 0.15)' 
                        : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: `1px solid ${completionStatus.documentsUploaded ? 'rgba(125, 187, 125, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: completionStatus.documentsUploaded ? '#7DBB7D' : 'rgba(255, 255, 255, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {completionStatus.documentsUploaded && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="9,11 12,14 22,4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: completionStatus.documentsUploaded ? '#7DBB7D' : 'rgba(255, 255, 255, 0.7)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {completionStatus.documentsUploaded ? 'SECURED' : 'PENDING'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: '400'
                      }}>
                        Documentation
                      </div>
                    </div>

                    {/* Payment Card */}
                    <div style={{
                      padding: '12px',
                      background: completionStatus.paymentCompleted 
                        ? 'rgba(125, 187, 125, 0.15)' 
                        : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: `1px solid ${completionStatus.paymentCompleted ? 'rgba(125, 187, 125, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: completionStatus.paymentCompleted ? '#7DBB7D' : 'rgba(255, 255, 255, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {completionStatus.paymentCompleted && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="9,11 12,14 22,4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: completionStatus.paymentCompleted ? '#7DBB7D' : 'rgba(255, 255, 255, 0.7)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {completionStatus.paymentCompleted ? 'PROCESSED' : 'PENDING'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: '400'
                      }}>
                        Payment
                      </div>
                    </div>
                  </div>

                  {/* Footer Message */}
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <p style={{
                      margin: '0',
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      lineHeight: '1.4',
                      textAlign: 'center'
                    }}>
                      We will be in touch shortly to confirm your matter details.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CheckoutHeader;
