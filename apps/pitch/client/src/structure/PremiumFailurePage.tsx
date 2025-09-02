/**
 * Premium Failure Page
 * 
 * Comprehensive failure page showing the complete picture - what succeeded and what failed
 * Matches success page layout exactly but with failure-specific information
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import CheckoutHeader from '../components/premium/CheckoutHeader';
import { getStoredPaymentData, clearStoredPaymentData, getPremiumErrorMessage } from '../utils/premiumPaymentUtils';
import { colours } from '../styles/colours';
import '../styles/premium/premiumComponents.css';
// Path fix: file resides in components/premium not styles
import '../components/premium/PaymentSummaryMinimal.css';

interface InstructionSummary {
  instructionRef: string;
  clientDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  serviceDetails?: {
    description?: string;
    amount?: number;
    currency?: string;
  };
  solicitorDetails?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
  };
  completedSteps?: {
    identityVerified: boolean;
    documentsUploaded: boolean;
    paymentCompleted: boolean;
  };
  createdAt?: string;
  failureDetails?: {
    errorCode?: string;
    errorMessage?: string;
    timestamp?: string;
  };
}

const PremiumFailurePage: React.FC = () => {
  const { instructionRef, dealData } = useClient();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [instructionSummary, setInstructionSummary] = useState<InstructionSummary | null>(null);
  const location = useLocation();

  console.log('PremiumFailurePage - dealData:', dealData);
  console.log('PremiumFailurePage - instructionRef:', instructionRef);
  console.log('PremiumFailurePage - location.pathname:', location.pathname);

  // Extract instruction reference from URL if not available in context
  const extractedRef = location.pathname.split('/')[1]; // Get the first part after /
  const effectiveInstructionRef = instructionRef || extractedRef;
  
  console.log('PremiumFailurePage - extractedRef:', extractedRef);
  console.log('PremiumFailurePage - effectiveInstructionRef:', effectiveInstructionRef);

  useEffect(() => {
    // Get payment data from session storage
    const storedData = getStoredPaymentData('failure');
    console.log('PremiumFailurePage - storedData:', storedData);
    if (storedData) {
      setPaymentData(storedData);
      // Clear the stored data after use
      clearStoredPaymentData('failure');
    }
  }, []);

  useEffect(() => {
    const fetchInstructionSummary = async () => {
      if (!effectiveInstructionRef) {
        console.log('No effectiveInstructionRef, skipping API call');
        return;
      }

      try {
        console.log('Fetching instruction summary for:', effectiveInstructionRef);
        const response = await fetch(`/api/instruction/summary/${effectiveInstructionRef}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched instruction summary:', data);
          setInstructionSummary(data);
        } else {
          console.log('Failed to fetch instruction summary:', response.status);
        }
      } catch (error) {
        console.error('Error fetching instruction summary:', error);
      }
    };

    fetchInstructionSummary();
  }, [effectiveInstructionRef]);

  // Send admin notification for failure
  useEffect(() => {
    const sendAdminNotification = async () => {
      if (!effectiveInstructionRef) return;

      try {
        console.log('Sending admin notification for payment failure');
        await fetch('/api/admin/payment-failure-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instructionRef: effectiveInstructionRef,
            errorCode: paymentData?.status || 'unknown',
            errorMessage: paymentData ? getPremiumErrorMessage(paymentData) : 'Payment processing failed',
            clientEmail: instructionSummary?.clientDetails?.email,
            amount: instructionSummary?.serviceDetails?.amount,
            timestamp: new Date().toISOString()
          }),
        });
        console.log('✅ Admin notification sent successfully');
      } catch (error) {
        console.error('Failed to send admin notification:', error);
      }
    };

    sendAdminNotification();
  }, [effectiveInstructionRef, instructionSummary, paymentData]);

  // Extract error details from stored data or provide defaults
  const errorCode = paymentData?.status || 'failed';
  const errorMessage = paymentData ? getPremiumErrorMessage(paymentData) : null;

  // Create complete summary including failure details
  const summary: InstructionSummary = instructionSummary || {
    instructionRef: effectiveInstructionRef || 'UNKNOWN',
    serviceDetails: {
      description: dealData?.ServiceDescription || 'Payment on Account of Costs',
      amount: paymentData?.amount || dealData?.Amount,
      currency: dealData?.Currency || 'GBP'
    },
    solicitorDetails: {
      name: dealData?.SolicitorName,
      title: dealData?.SolicitorTitle,
      email: dealData?.SolicitorEmail,
      phone: dealData?.SolicitorPhone
    },
    completedSteps: {
      identityVerified: true, // They got to payment so ID was verified
      documentsUploaded: true, // They got to payment so docs were uploaded
      paymentCompleted: false // This failed
    },
    failureDetails: {
      errorCode,
      errorMessage: errorMessage || 'Payment processing failed',
      timestamp: new Date().toISOString()
    }
  };

  // Map error codes to user-friendly messages
  const getErrorInfo = (code: string | null) => {
    switch (code) {
      case 'card_declined':
        return {
          title: 'Payment Declined',
          message: 'Your bank declined this payment. Please try a different card or contact your bank.',
          icon: '💳'
        };
      case 'insufficient_funds':
        return {
          title: 'Insufficient Funds',
          message: 'Your account does not have sufficient funds. Please try a different payment method.',
          icon: '💰'
        };
      case 'expired_card':
        return {
          title: 'Card Expired',
          message: 'The card you used has expired. Please try with a different card.',
          icon: '📅'
        };
      case 'network_error':
        return {
          title: 'Connection Error',
          message: 'There was a problem connecting to the payment system. Please try again.',
          icon: '🌐'
        };
      default:
        return {
          title: 'Payment Failed',
          message: errorMessage || 'We were unable to process your payment. Your information has been saved and we will contact you to resolve this.',
          icon: '⚠️'
        };
    }
  };

  const errorInfo = getErrorInfo(errorCode);

  const formatAmount = (amount: number | undefined, currency: string = 'GBP') => {
    if (!amount) return 'Amount TBD';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <>
      {/* Header with progress showing failure state */}
      <CheckoutHeader
        currentIndex={2} // Final step (error state)
        steps={[
          { key: 'identity', label: 'Prove Your Identity' },
          { key: 'documents', label: 'Upload Documents' },
          { key: 'payment', label: 'Pay' }
        ]}
        instructionRef={summary.instructionRef}
        currentStep="error" // Special error state
        completionStatus={summary.completedSteps}
      />

      {/* Clean Failure Content - Matches Success Page Layout */}
      <div className="premium-payment-layout">
        <div className="premium-payment-container" style={{ 
          justifyContent: 'center',
          padding: 'clamp(16px, 4vw, 32px)',
          minHeight: 'auto'
        }}>
          <div style={{ 
            justifyContent: 'center',
            maxWidth: '100%',
            width: '100%'
          }}>
            <div style={{ 
              maxWidth: '800px', 
              margin: '0 auto',
              width: '100%'
            }}>
              
              {/* Payment Failed Message - Clean & Simple */}
              <div style={{ 
                background: 'white',
                borderRadius: '16px',
                padding: 'clamp(32px, 6vw, 48px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                border: '1px solid #f1f5f9',
                marginTop: 'clamp(24px, 5vw, 40px)',
                marginBottom: 'clamp(32px, 6vw, 48px)',
                textAlign: 'center'
              }}>
                {/* Error Icon */}
                <div style={{ 
                  width: 'clamp(64px, 15vw, 80px)', 
                  height: 'clamp(64px, 15vw, 80px)',
                  backgroundColor: colours.cta,
                  borderRadius: '50%',
                  margin: '0 auto clamp(20px, 5vw, 28px) auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(220, 38, 38, 0.2)'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>

                <h1 style={{
                  fontSize: 'clamp(28px, 5.5vw, 36px)',
                  fontWeight: '600',
                  color: colours.cta,
                  margin: '0 0 clamp(16px, 3.5vw, 20px) 0',
                  lineHeight: '1.1',
                  letterSpacing: '-0.02em'
                }}>
                  {errorInfo.title}
                </h1>
                <p style={{
                  fontSize: 'clamp(16px, 3.8vw, 18px)',
                  color: '#475569',
                  textAlign: 'center',
                  margin: '0 0 clamp(32px, 7vw, 40px) 0',
                  lineHeight: '1.6',
                  padding: '0 clamp(16px, 3vw, 24px)',
                  fontWeight: '400'
                }}>
                  {errorInfo.message}
                </p>
              </div>

              {/* Combined Service Summary & Solicitor Card */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: 'clamp(20px, 5vw, 40px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: 'clamp(16px, 4vw, 24px)'
              }}>
                {/* Reference and Service Info */}
                <div style={{
                  marginBottom: 'clamp(24px, 5vw, 32px)',
                  paddingBottom: 'clamp(20px, 4vw, 24px)',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                    border: '1px solid #fca5a5',
                    borderRadius: 'clamp(12px, 3vw, 16px)',
                    padding: 'clamp(20px, 4.5vw, 28px)',
                    textAlign: 'center',
                    margin: '0 0 clamp(20px, 4vw, 24px) 0',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
                  }}>
                    <span style={{
                      fontSize: 'clamp(12px, 2.8vw, 14px)',
                      fontWeight: '700',
                      color: '#991b1b',
                      display: 'block',
                      marginBottom: 'clamp(6px, 1.5vw, 8px)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Your Reference
                    </span>
                    <span style={{
                      fontSize: 'clamp(18px, 4.5vw, 22px)',
                      fontWeight: '800',
                      color: '#991b1b',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      letterSpacing: '0.05em',
                      wordBreak: 'break-all',
                      display: 'block',
                      padding: 'clamp(4px, 1vw, 6px) 0'
                    }}>
                      HLX-{summary.instructionRef}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: 'clamp(22px, 5vw, 26px)',
                        fontWeight: '700',
                        color: '#1e293b',
                        margin: '0 0 8px 0',
                        letterSpacing: '-0.015em',
                        lineHeight: '1.3'
                      }}>
                        {summary.serviceDetails?.description || 'Payment on Account of Costs'}
                      </h3>
                      <p style={{
                        fontSize: 'clamp(14px, 3.2vw, 16px)',
                        color: colours.cta,
                        margin: 0,
                        fontWeight: '500'
                      }}>
                        Payment processing failed
                      </p>
                    </div>
                    
                    {summary.serviceDetails?.amount && (
                      <div style={{
                        textAlign: 'right'
                      }}>
                        <div style={{
                          fontSize: 'clamp(20px, 5vw, 24px)',
                          fontWeight: '800',
                          color: colours.cta,
                          lineHeight: '1.2',
                          marginBottom: '4px'
                        }}>
                          {formatAmount(summary.serviceDetails.amount, summary.serviceDetails.currency)}
                        </div>
                        <div style={{
                          fontSize: 'clamp(12px, 2.8vw, 14px)',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Payment Required
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Service Assignment */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: 'clamp(12px, 3vw, 16px)',
                    padding: 'clamp(20px, 4.5vw, 28px)',
                    border: '1px solid #e2e8f0',
                    marginTop: 'clamp(20px, 4vw, 24px)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 'clamp(12px, 2.5vw, 16px)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: 'clamp(14px, 3.2vw, 16px)',
                          color: '#64748b',
                          fontWeight: '600'
                        }}>
                          Assigned Solicitor
                        </span>
                        <span style={{
                          fontSize: 'clamp(14px, 3.2vw, 16px)',
                          color: '#1e293b',
                          fontWeight: '700'
                        }}>
                          {summary.solicitorDetails?.name || 'Lukasz Zemanek'}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: 'clamp(14px, 3.2vw, 16px)',
                          color: '#64748b',
                          fontWeight: '600'
                        }}>
                          Supervising Partner
                        </span>
                        <span style={{
                          fontSize: 'clamp(14px, 3.2vw, 16px)',
                          color: '#1e293b',
                          fontWeight: '700'
                        }}>
                          Rebecca Johnson
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Solicitor Information */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: '80px',
                  backgroundImage: 'url("/assets/markwhite.svg")',
                  backgroundSize: '40px auto',
                  backgroundPosition: 'right 15px center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.6,
                  pointerEvents: 'none',
                  zIndex: 0
                }} />
                
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  marginBottom: '20px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    position: 'relative',
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#f3f4f6',
                    border: '2px solid #e5e7eb',
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                  }}>
                    <img 
                      src="/assets/dark blue mark.svg" 
                      alt="Helix Law"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        padding: '8px',
                        transition: 'opacity 0.3s ease',
                        opacity: 1
                      }}
                    />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#0D2F60',
                      margin: '0 0 4px 0',
                      lineHeight: '1.3'
                    }}>
                      {summary.solicitorDetails?.name || 'Lukasz Zemanek'}
                    </h3>
                    
                    <p style={{
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '14px',
                      fontWeight: '400',
                      color: '#6b7280',
                      margin: '0 0 12px 0',
                      lineHeight: '1.4'
                    }}>
                      {summary.solicitorDetails?.title || 'Solicitor'}
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: '#f0f9ff',
                        color: '#0369a1',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        LLB (Hons)
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: '#f0f9ff',
                        color: '#0369a1',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        SRA Qualified
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        8+ Years Experience
                      </span>
                    </div>
                  </div>
                </div>
                
                <div style={{
                  marginBottom: '16px'
                }}>
                  <p style={{
                    fontSize: 'clamp(13px, 3.25vw, 14px)',
                    color: '#64748b',
                    margin: '0',
                    lineHeight: '1.5'
                  }}>
                    Specialist in commercial litigation with extensive experience in contract disputes, 
                    professional negligence claims, and debt recovery. Successfully handled cases ranging 
                    from £5,000 to £2M+ with a 95% success rate.
                  </p>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  <a 
                    href={`mailto:${summary.solicitorDetails?.email || 'lz@helix-law.com'}`}
                    className="contact-item"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="contact-icon">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>{summary.solicitorDetails?.email || 'lz@helix-law.com'}</span>
                  </a>
                  
                  <a 
                    href={`tel:${summary.solicitorDetails?.phone || '03453142044'}`}
                    className="contact-item"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="contact-icon">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                    <span>{summary.solicitorDetails?.phone || '0345 314 2044'}</span>
                  </a>
                </div>
              </div>

              {/* Error Details Section */}
              <div style={{
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                borderRadius: 'clamp(12px, 3vw, 16px)',
                padding: 'clamp(28px, 6vw, 40px)',
                border: `1px solid ${colours.cta}`,
                marginBottom: 'clamp(16px, 4vw, 24px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{
                  fontSize: 'clamp(20px, 4.5vw, 24px)',
                  fontWeight: '700',
                  color: '#1e293b',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" fill={colours.cta}/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Payment Issue
                </h3>
                
                <p style={{
                  fontSize: 'clamp(15px, 3.5vw, 16px)',
                  color: '#64748b',
                  margin: '0 0 24px 0',
                  lineHeight: '1.6'
                }}>
                  We encountered an issue processing your payment. Please try again or contact us for assistance.
                </p>
                
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <h4 style={{
                    fontSize: 'clamp(16px, 4vw, 18px)',
                    fontWeight: '600',
                    color: colours.cta,
                    margin: '0 0 8px 0'
                  }}>
                    What this means:
                  </h4>
                  <ul style={{
                    margin: '0',
                    paddingLeft: '20px',
                    color: '#4b5563'
                  }}>
                    <li style={{ marginBottom: '4px' }}>Your payment could not be processed</li>
                    <li style={{ marginBottom: '4px' }}>Your instruction has not been submitted yet</li>
                    <li style={{ marginBottom: '4px' }}>No charges have been made to your account</li>
                  </ul>
                </div>
              </div>

              {/* Retry Options Section */}
              <div style={{
                background: 'white',
                borderRadius: 'clamp(12px, 3vw, 16px)',
                padding: 'clamp(28px, 6vw, 40px)',
                border: '1px solid #e2e8f0',
                marginBottom: 'clamp(16px, 4vw, 24px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{
                  fontSize: 'clamp(20px, 4.5vw, 24px)',
                  fontWeight: '700',
                  color: '#1e293b',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M9 12l2 2 4-4" stroke="#3690CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="#3690CE" strokeWidth="2" fill="none"/>
                  </svg>
                  Next Steps
                </h3>
                
                <p style={{
                  fontSize: 'clamp(15px, 3.5vw, 16px)',
                  color: '#64748b',
                  margin: '0 0 24px 0',
                  lineHeight: '1.6'
                }}>
                  You can try your payment again or contact us for assistance with the payment issue.
                </p>
                
                <div style={{
                  display: 'grid',
                  gap: '16px',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
                }}>
                  <button 
                    style={{
                      background: colours.cta,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '16px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={() => window.location.reload()}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Try Payment Again
                  </button>
                  
                  <a 
                    href={`mailto:${summary.solicitorDetails?.email || 'lz@helix-law.com'}?subject=Payment Issue - ${summary.instructionRef || 'Unknown'}`}
                    style={{
                      background: 'white',
                      color: colours.cta,
                      border: `2px solid ${colours.cta}`,
                      borderRadius: '8px',
                      padding: '16px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Contact Support
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Premium Footer */}
      <footer className="premium-payment-footer">
        <div className="premium-footer-container">
          <div className="premium-trust-footer">
            <div className="premium-trust-indicators">
              <div className="premium-trust-indicator">
                <svg className="premium-trust-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secure Payment Processing</span>
              </div>
              
              <div className="premium-trust-indicator">
                <svg className="premium-trust-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>AML/KYC Compliant</span>
              </div>
            </div>
            
            <div className="premium-footer-legal">
              <div className="premium-footer-copyright">
                All copyright is reserved entirely on behalf of Helix Law Limited. Helix Law
                and applicable logo are exclusively owned trademarks registered with the
                Intellectual Property Office under numbers UK00003984532 and
                UK00003984535. The trademarks should not be used, copied or replicated
                without consent. Helix Law Limited is regulated by the SRA, our SRA ID is
                565557.
              </div>
              
              <div className="premium-footer-links">
                <ul className="premium-legal-menu">
                  <li>
                    <a href="https://helix-law.co.uk/transparency/">
                      Transparency, Complaints, Timescales and VAT
                    </a>
                  </li>
                  <li>
                    <a href="https://helix-law.co.uk/cookies-policy/">Cookies Policy</a>
                  </li>
                  <li>
                    <a href="https://helix-law.co.uk/privacy-policy/">Privacy Policy</a>
                  </li>
                  <li>
                    <a href="https://helix-law.co.uk/terms-and-conditions/">
                      Terms and Conditions
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default PremiumFailurePage;
