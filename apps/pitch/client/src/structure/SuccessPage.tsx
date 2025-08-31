import React, { useState, useEffect } from 'react';
import { useClient } from '../context/ClientContext';
import CheckoutHeader from '../components/premium/CheckoutHeader';
import '../styles/ProofOfId-premium.css';
import '../styles/HomePage.css'; // Use clean home page styling

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
}

const SuccessPage: React.FC = () => {
  const { instructionRef, dealData } = useClient();
  const [instructionSummary, setInstructionSummary] = useState<InstructionSummary | null>(null);

  console.log('SuccessPage - instructionRef:', instructionRef);
  console.log('SuccessPage - dealData:', dealData);

  useEffect(() => {
    const fetchInstructionSummary = async () => {
      if (!instructionRef) {
        console.log('No instructionRef, skipping API call');
        return;
      }

      try {
        console.log('Fetching instruction summary for:', instructionRef);
        const response = await fetch(`/api/instruction/summary/${instructionRef}`);
        if (response.ok) {
          const summary = await response.json();
          console.log('API response:', summary);
          setInstructionSummary(summary);
        } else {
          console.log('API response not ok:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch instruction summary:', error);
      }
    };

    fetchInstructionSummary();
  }, [instructionRef]);

  // Build summary from available data
  const summary: InstructionSummary = instructionSummary || {
    instructionRef: instructionRef || 'N/A',
    serviceDetails: {
      description: dealData?.ServiceDescription || 'Legal Services',
      amount: dealData?.Amount,
      currency: dealData?.Currency || 'GBP'
    },
    solicitorDetails: {
      name: dealData?.SolicitorName,
      title: dealData?.SolicitorTitle,
      email: dealData?.SolicitorEmail,
      phone: dealData?.SolicitorPhone
    },
    completedSteps: {
      identityVerified: true,
      documentsUploaded: true,
      paymentCompleted: !!dealData?.Amount
    },
    createdAt: new Date().toISOString()
  };

  console.log('Final summary object:', summary);

  const formatAmount = (amount?: number, currency: string = 'GBP') => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount); // Don't divide by 100 - amount is already in major units (pounds)
  };

  return (
    <>
      {/* Modern Checkout Header with Hero - matches current app */}
      <CheckoutHeader
        currentIndex={2} // Final step (completed)
        steps={[
          { key: 'identity', label: 'Prove Your Identity' },
          { key: 'documents', label: 'Upload Documents' },
          { key: 'payment', label: 'Pay' }
        ]}
        instructionRef={instructionRef || ""}
        currentStep="complete" // Special completion state
        completionStatus={summary.completedSteps} // Pass completion status
      />

      {/* Clean Success Content - Optimized Responsive Layout */}
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
              
              {/* Welcome Message - Clean & Simple */}
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
                <h1 style={{
                  fontSize: 'clamp(20px, 4.5vw, 28px)',
                  fontWeight: '700',
                  color: '#111827',
                  margin: '0 0 clamp(12px, 3vw, 16px) 0',
                  paddingTop: 'clamp(16px, 4vw, 24px)',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                    Thank you
                  </h1>
                  <p style={{
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    color: '#6b7280',
                    textAlign: 'center',
                    margin: '0 0 clamp(24px, 6vw, 32px) 0',
                    lineHeight: '1.5',
                    padding: '0 clamp(8px, 2vw, 16px)'
                  }}>
                    Your legal instruction has been successfully submitted
                  </p>
                  
                  {/* Reference Display */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: 'clamp(12px, 3vw, 16px)',
                    textAlign: 'center',
                    marginBottom: 'clamp(16px, 4vw, 24px)',
                    margin: '0 clamp(8px, 2vw, 0px) clamp(16px, 4vw, 24px)'
                  }}>
                    <span style={{
                      fontSize: 'clamp(11px, 2.75vw, 13px)',
                      fontWeight: '500',
                      color: '#64748b',
                      display: 'block',
                      marginBottom: 'clamp(2px, 1vw, 4px)'
                    }}>
                      Your Reference
                    </span>
                    <span style={{
                      fontSize: 'clamp(14px, 3.5vw, 18px)',
                      fontWeight: '700',
                      color: '#0f172a',
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
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      color: '#111827',
                      fontWeight: '600'
                    }}>
                      {summary.solicitorDetails?.name || 'Charles Peterson-White'}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      color: '#64748b',
                      fontWeight: '500'
                    }}>
                      Supervising Partner
                    </span>
                    <span style={{
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      color: '#111827',
                      fontWeight: '600'
                    }}>
                      Rebecca Johnson
                    </span>
                  </div>
                </div>
              </div>

              {/* Solicitor Card */}
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
                      {summary.solicitorDetails?.name || 'Charles Peterson-White'}
                    </h3>
                    
                    <p style={{
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '14px',
                      fontWeight: '400',
                      color: '#6b7280',
                      margin: '0 0 12px 0',
                      lineHeight: '1.4'
                    }}>
                      {summary.solicitorDetails?.title || 'Senior Commercial Litigation Solicitor'}
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
                    href={`mailto:${summary.solicitorDetails?.email || 'c.peterson-white@helix-law.com'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#3690CE',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Direct Email
                  </a>
                  
                  <a 
                    href={`tel:${summary.solicitorDetails?.phone || '03453142044'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#3690CE',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Direct Line
                  </a>
                </div>
              </div>

              {/* Next Steps - Simple List */}
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
                      }}>1</span>
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: 'clamp(15px, 3.75vw, 16px)',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 4px 0'
                      }}>
                        Confirmation on its way
                      </h4>
                      <p style={{
                        fontSize: 'clamp(13px, 3.25vw, 14px)',
                        color: '#64748b',
                        margin: '0',
                        lineHeight: '1.4'
                      }}>
                        Your confirmation documents and next steps are being prepared
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
                      }}>2</span>
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: 'clamp(15px, 3.75vw, 16px)',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 4px 0'
                      }}>
                        Legal strategy planning
                      </h4>
                      <p style={{
                        fontSize: 'clamp(13px, 3.25vw, 14px)',
                        color: '#64748b',
                        margin: '0',
                        lineHeight: '1.4'
                      }}>
                        Your solicitor will assess your matter and advise on the optimal path forward
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

              {/* Contact Support - Simple */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: 'clamp(20px, 5vw, 40px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <h3 style={{
                  fontSize: 'clamp(18px, 4.5vw, 20px)',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 16px 0'
                }}>
                  Need assistance?
                </h3>
                
                <div style={{
                  display: 'flex',
                  gap: 'clamp(12px, 3vw, 16px)',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  <a
                    href="tel:+441234567890"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: 'clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#111827',
                      textDecoration: 'none',
                      fontWeight: '500',
                      fontSize: 'clamp(14px, 3.5vw, 15px)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    0345 314 2044
                  </a>
                  
                  <a
                    href="mailto:support@helix-law.com"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: 'clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)',
                      background: '#111827',
                      border: '1px solid #111827',
                      borderRadius: '8px',
                      color: 'white',
                      textDecoration: 'none',
                      fontWeight: '500',
                      fontSize: 'clamp(14px, 3.5vw, 15px)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#1f2937'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#111827'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    support@helix-law.com
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

export default SuccessPage;
