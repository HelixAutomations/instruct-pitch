/**
 * Premium Failure Page
 * 
 * Comprehensive failure page showing the complete picture - what succeeded and what failed
 * Matches success page layout exactly but with failure-specific information
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import CheckoutHeader from '../components/premium/CheckoutHeader';
import { getStoredPaymentData, clearStoredPaymentData, getPremiumErrorMessage } from '../utils/premiumPaymentUtils';
import '../styles/premium/premiumComponents.css';

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
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { instructionRef, dealData } = useClient();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [instructionSummary, setInstructionSummary] = useState<InstructionSummary | null>(null);

  useEffect(() => {
    // Get payment data from session storage
    const storedData = getStoredPaymentData('failure');
    if (storedData) {
      setPaymentData(storedData);
      // Clear the stored data after use
      clearStoredPaymentData('failure');
    }
  }, []);

  useEffect(() => {
    const fetchInstructionSummary = async () => {
      if (!instructionRef && !ref) {
        console.log('No instructionRef, skipping API call');
        return;
      }

      try {
        const refToUse = instructionRef || ref;
        console.log('Fetching instruction summary for:', refToUse);
        const response = await fetch(`/api/instruction/summary/${refToUse}`);
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
  }, [instructionRef, ref]);

  // Send admin notification for failure
  useEffect(() => {
    const sendAdminNotification = async () => {
      if (!instructionSummary?.instructionRef) return;

      try {
        console.log('Sending admin notification for payment failure');
        await fetch('/api/admin/payment-failure-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instructionRef: instructionSummary.instructionRef,
            errorCode: paymentData?.status || 'unknown',
            errorMessage: paymentData ? getPremiumErrorMessage(paymentData) : 'Payment processing failed',
            clientEmail: instructionSummary.clientDetails?.email,
            amount: instructionSummary.serviceDetails?.amount,
            timestamp: new Date().toISOString()
          }),
        });
        console.log('✅ Admin notification sent successfully');
      } catch (error) {
        console.error('Failed to send admin notification:', error);
      }
    };

    sendAdminNotification();
  }, [instructionSummary, paymentData]);

  // Extract error details from stored data or provide defaults
  const errorCode = paymentData?.status || 'failed';
  const errorMessage = paymentData ? getPremiumErrorMessage(paymentData) : null;

  // Create complete summary including failure details
  const summary: InstructionSummary = instructionSummary || {
    instructionRef: ref || instructionRef || 'UNKNOWN',
    serviceDetails: {
      description: dealData?.ServiceDescription || 'Commercial Litigation',
      amount: paymentData?.amount || dealData?.Amount,
      currency: dealData?.Currency || 'GBP'
    },
    solicitorDetails: {
      name: dealData?.SolicitorName || 'Charles Peterson-White',
      title: dealData?.SolicitorTitle || 'Senior Partner',
      email: dealData?.SolicitorEmail || 'cp@helix-law.com',
      phone: dealData?.SolicitorPhone || '+44 20 7183 6832'
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
                borderRadius: '12px',
                padding: 'clamp(20px, 5vw, 40px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                marginTop: 'clamp(16px, 4vw, 32px)',
                marginBottom: 'clamp(20px, 5vw, 32px)',
                textAlign: 'center'
              }}>
                {/* Error Icon */}
                <div style={{ 
                  width: 'clamp(64px, 15vw, 80px)', 
                  height: 'clamp(64px, 15vw, 80px)',
                  backgroundColor: '#EF4444',
                  borderRadius: '50%',
                  margin: '0 auto clamp(16px, 4vw, 24px) auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>

                <h1 style={{
                  fontSize: 'clamp(20px, 4.5vw, 28px)',
                  fontWeight: '700',
                  color: '#EF4444',
                  margin: '0 0 clamp(12px, 3vw, 16px) 0',
                  paddingTop: 'clamp(16px, 4vw, 24px)',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {errorInfo.title}
                </h1>
                <p style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  color: '#6b7280',
                  textAlign: 'center',
                  margin: '0 0 clamp(24px, 6vw, 32px) 0',
                  lineHeight: '1.5',
                  padding: '0 clamp(8px, 2vw, 16px)'
                }}>
                  {errorInfo.message}
                </p>
                
                {/* Reference Display */}
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: 'clamp(12px, 3vw, 16px)',
                  textAlign: 'center',
                  marginBottom: 'clamp(16px, 4vw, 24px)',
                  margin: '0 clamp(8px, 2vw, 0px) clamp(16px, 4vw, 24px)'
                }}>
                  <span style={{
                    fontSize: 'clamp(11px, 2.75vw, 13px)',
                    fontWeight: '500',
                    color: '#b91c1c',
                    display: 'block',
                    marginBottom: 'clamp(2px, 1vw, 4px)'
                  }}>
                    Your Reference
                  </span>
                  <span style={{
                    fontSize: 'clamp(14px, 3.5vw, 18px)',
                    fontWeight: '700',
                    color: '#991b1b',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                    wordBreak: 'break-all'
                  }}>
                    {summary.instructionRef}
                  </span>
                </div>
              </div>

              {/* Service Summary - Clean Card */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: 'clamp(20px, 5vw, 40px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                marginBottom: 'clamp(16px, 4vw, 24px)'
              }}>
                <h3 style={{
                  fontSize: 'clamp(16px, 4vw, 18px)',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 clamp(12px, 3vw, 16px) 0'
                }}>
                  Service Details
                </h3>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 'clamp(8px, 2vw, 12px)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingBottom: 'clamp(8px, 2vw, 12px)',
                    borderBottom: '1px solid #f1f5f9',
                    gap: '16px'
                  }}>
                    <span style={{
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      color: '#64748b',
                      fontWeight: '500',
                      flexShrink: 0
                    }}>
                      Service Description
                    </span>
                    <span style={{
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      color: '#111827',
                      fontWeight: '600',
                      textAlign: 'right',
                      wordBreak: 'break-word'
                    }}>
                      {summary.serviceDetails?.description || 'Commercial Litigation'}
                    </span>
                  </div>
                  
                  {summary.serviceDetails?.amount && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      paddingBottom: 'clamp(8px, 2vw, 12px)',
                      borderBottom: '1px solid #f1f5f9',
                      gap: '16px'
                    }}>
                      <span style={{
                        fontSize: 'clamp(12px, 3vw, 14px)',
                        color: '#64748b',
                        fontWeight: '500',
                        flexShrink: 0
                      }}>
                        Fee Amount
                      </span>
                      <span style={{
                        fontSize: 'clamp(12px, 3vw, 14px)',
                        color: '#111827',
                        fontWeight: '700',
                        textAlign: 'right'
                      }}>
                        {formatAmount(summary.serviceDetails.amount, summary.serviceDetails.currency)}
                      </span>
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingBottom: 'clamp(8px, 2vw, 12px)',
                    borderBottom: '1px solid #f1f5f9',
                    gap: '16px'
                  }}>
                    <span style={{
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      color: '#64748b',
                      fontWeight: '500',
                      flexShrink: 0
                    }}>
                      Payment Status
                    </span>
                    <span style={{
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      color: '#ef4444',
                      fontWeight: '600',
                      textAlign: 'right',
                      wordBreak: 'break-word'
                    }}>
                      Failed - {errorCode}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px'
                  }}>
                    <span style={{
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      color: '#64748b',
                      fontWeight: '500',
                      flexShrink: 0
                    }}>
                      Solicitor
                    </span>
                    <span style={{
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      color: '#111827',
                      fontWeight: '600',
                      textAlign: 'right',
                      wordBreak: 'break-word'
                    }}>
                      {summary.solicitorDetails?.name || 'Charles Peterson-White'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Solicitor Card - Same as Success */}
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
                        filter: 'brightness(0.8)'
                      }}
                    />
                  </div>
                  
                  <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                    <h3 style={{
                      fontSize: 'clamp(16px, 4vw, 18px)',
                      fontWeight: '600',
                      color: '#111827',
                      margin: '0 0 4px 0'
                    }}>
                      {summary.solicitorDetails?.name || 'Charles Peterson-White'}
                    </h3>
                    <p style={{
                      fontSize: 'clamp(13px, 3.25vw, 14px)',
                      color: '#64748b',
                      margin: '0 0 12px 0'
                    }}>
                      {summary.solicitorDetails?.title || 'Senior Partner'}
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginBottom: '12px'
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
                    href={`mailto:${summary.solicitorDetails?.email || 'c.peterson-white@helix-law.com'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      color: '#111827',
                      textDecoration: 'none',
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Email
                  </a>
                  
                  <a 
                    href={`tel:${summary.solicitorDetails?.phone || '+442071836832'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: '#111827',
                      border: '1px solid #111827',
                      borderRadius: '6px',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Call
                  </a>
                </div>
              </div>

              {/* What happens next? - Failure version */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: 'clamp(20px, 5vw, 40px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                marginBottom: 'clamp(16px, 4vw, 24px)'
              }}>
                <h3 style={{
                  fontSize: 'clamp(18px, 4.5vw, 20px)',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 16px 0'
                }}>
                  What happens next?
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      background: '#10b981',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'white'
                      }}>✓</span>
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: 'clamp(15px, 3.75vw, 16px)',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 4px 0'
                      }}>
                        Your information is safe
                      </h4>
                      <p style={{
                        fontSize: 'clamp(13px, 3.25vw, 14px)',
                        color: '#64748b',
                        margin: '0',
                        lineHeight: '1.4'
                      }}>
                        Your identity verification and documents have been saved securely
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      background: '#ef4444',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'white'
                      }}>!</span>
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: 'clamp(15px, 3.75vw, 16px)',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 4px 0'
                      }}>
                        Payment assistance required
                      </h4>
                      <p style={{
                        fontSize: 'clamp(13px, 3.25vw, 14px)',
                        color: '#64748b',
                        margin: '0',
                        lineHeight: '1.4'
                      }}>
                        We will contact you to arrange alternative payment and proceed with your matter
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      background: '#6b7280',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'white'
                      }}>3</span>
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: 'clamp(15px, 3.75vw, 16px)',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 4px 0'
                      }}>
                        Direct solicitor contact
                      </h4>
                      <p style={{
                        fontSize: 'clamp(13px, 3.25vw, 14px)',
                        color: '#64748b',
                        margin: '0',
                        lineHeight: '1.4'
                      }}>
                        Your assigned solicitor will be your dedicated point of contact throughout
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Support - Enhanced with Immediate Action */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: 'clamp(20px, 5vw, 40px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                textAlign: 'center',
                marginBottom: 'clamp(16px, 4vw, 24px)'
              }}>
                <h3 style={{
                  fontSize: 'clamp(18px, 4.5vw, 20px)',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 16px 0'
                }}>
                  Need immediate assistance?
                </h3>
                
                <p style={{
                  fontSize: 'clamp(13px, 3.25vw, 14px)',
                  color: '#64748b',
                  margin: '0 0 20px 0',
                  lineHeight: '1.5'
                }}>
                  Our team has been notified and will contact you shortly. For immediate assistance:
                </p>
                
                <div style={{
                  display: 'flex',
                  gap: 'clamp(12px, 3vw, 16px)',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '20px'
                }}>
                  <a
                    href="tel:+442071836832"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontSize: 'clamp(13px, 3.25vw, 14px)',
                      fontWeight: '500',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    📞 Call Us Now
                  </a>
                  <a
                    href="mailto:cp@helix-law.com"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      backgroundColor: 'white',
                      color: '#3b82f6',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      border: '2px solid #3b82f6',
                      fontSize: 'clamp(13px, 3.25vw, 14px)',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ✉️ Email Us
                  </a>
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'center',
                  marginTop: '24px',
                  flexWrap: 'wrap'
                }}>
                  <button 
                    style={{
                      padding: 'clamp(12px, 3vw, 16px) clamp(24px, 6vw, 32px)',
                      backgroundColor: 'white',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: 'clamp(0.875rem, 3.5vw, 1rem)',
                      fontWeight: '600',
                      color: '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => navigate('/pitch')}
                  >
                    Start Over
                  </button>
                  <button 
                    style={{
                      padding: 'clamp(12px, 3vw, 16px) clamp(24px, 6vw, 32px)',
                      backgroundColor: '#1F2937',
                      border: '2px solid #1F2937',
                      borderRadius: '8px',
                      fontSize: 'clamp(0.875rem, 3.5vw, 1rem)',
                      fontWeight: '600',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => navigate(`/pitch/${summary.instructionRef}/payment`)}
                  >
                    Try Payment Again
                  </button>
                </div>
              </div>

              {/* Assistance Section - Same as Success */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: 'clamp(20px, 5vw, 40px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                marginBottom: 'clamp(16px, 4vw, 24px)'
              }}>
                <h3 style={{
                  fontSize: 'clamp(16px, 4vw, 18px)',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 16px 0'
                }}>
                  Need Assistance?
                </h3>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(12px, 3vw, 16px)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 0'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{
                        fontSize: 'clamp(13px, 3.25vw, 14px)',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 2px 0'
                      }}>
                        Payment Issues
                      </p>
                      <p style={{
                        fontSize: 'clamp(12px, 3vw, 13px)',
                        color: '#64748b',
                        margin: '0'
                      }}>
                        Our team has been notified and will review your payment
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 0'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#f0f9ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{
                        fontSize: 'clamp(13px, 3.25vw, 14px)',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 2px 0'
                      }}>
                        Email Support
                      </p>
                      <p style={{
                        fontSize: 'clamp(12px, 3vw, 13px)',
                        color: '#64748b',
                        margin: '0'
                      }}>
                        <a href="mailto:support@helix-law.com" style={{ color: '#0369a1', textDecoration: 'none' }}>
                          support@helix-law.com
                        </a>
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 0'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#f0fdf4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{
                        fontSize: 'clamp(13px, 3.25vw, 14px)',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 2px 0'
                      }}>
                        Phone Support
                      </p>
                      <p style={{
                        fontSize: 'clamp(12px, 3vw, 13px)',
                        color: '#64748b',
                        margin: '0'
                      }}>
                        <a href="tel:+443457774777" style={{ color: '#15803d', textDecoration: 'none' }}>
                          0345 777 4777
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PremiumFailurePage;
