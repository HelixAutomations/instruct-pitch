import React, { useState, useEffect } from 'react';
import { useClient } from '../context/ClientContext';
import CheckoutHeader from '../components/premium/CheckoutHeader';
import '../styles/ProofOfId-premium.css';

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
  const [showMatterAnimation, setShowMatterAnimation] = useState(false);

  console.log('SuccessPage - instructionRef:', instructionRef);
  console.log('SuccessPage - dealData:', dealData);

  // Start matter opening animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMatterAnimation(true);
    }, 500); // Short delay for smooth entrance

    return () => clearTimeout(timer);
  }, []);

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
    }).format(amount / 100);
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
        showMatterAnimation={showMatterAnimation} // Pass animation state
      />

      {/* Professional Content Container */}
      <div className="premium-identity-content">
        
        {/* Main Content */}
        <div className="premium-group-content">
          
          {/* Instruction Details - Professional Layout */}
          <div className="premium-question">
            <div style={{
              padding: 'clamp(16px, 4vw, 20px) clamp(20px, 5vw, 24px)',
              background: '#0f172a',
              borderRadius: '8px 8px 0 0',
              borderBottom: '1px solid #334155'
            }}>
              <h3 style={{ 
                margin: '0',
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '600',
                color: 'white',
                letterSpacing: '-0.025em'
              }}>
                Matter Details
              </h3>
            </div>
            <div style={{
              padding: 'clamp(20px, 5vw, 24px)',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px'
            }}>
              <div style={{ display: 'grid', gap: 'clamp(12px, 3vw, 16px)' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr auto',
                  gap: '16px',
                  alignItems: 'center',
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '500',
                    color: '#64748b'
                  }}>
                    Service Type
                  </span>
                  <span style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '600',
                    color: '#0f172a'
                  }}>
                    {summary.serviceDetails?.description || 'Commercial Litigation'}
                  </span>
                </div>
                
                {summary.serviceDetails?.amount && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                    padding: 'clamp(12px, 3vw, 16px)',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ 
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      fontWeight: '500',
                      color: '#64748b'
                    }}>
                      Fee Amount
                    </span>
                    <span style={{ 
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      fontWeight: '600',
                      color: '#0f172a'
                    }}>
                      {formatAmount(summary.serviceDetails.amount, summary.serviceDetails.currency)}
                    </span>
                  </div>
                )}
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr auto',
                  gap: '16px',
                  alignItems: 'center',
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: '#0f172a',
                  borderRadius: '6px'
                }}>
                  <span style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '500',
                    color: '#94a3b8'
                  }}>
                    Matter Reference
                  </span>
                  <span style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '600',
                    color: 'white',
                    fontFamily: 'monospace'
                  }}>
                    {summary.instructionRef}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment - Concise Professional Layout */}
          <div className="premium-question">
            <div style={{
              padding: 'clamp(16px, 4vw, 20px) clamp(20px, 5vw, 24px)',
              background: '#0f172a',
              borderRadius: '8px 8px 0 0'
            }}>
              <h3 style={{ 
                margin: '0',
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '600',
                color: 'white',
                letterSpacing: '-0.025em'
              }}>
                Legal Assignment
              </h3>
            </div>
            <div style={{
              padding: 'clamp(20px, 5vw, 24px)',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px'
            }}>
              <div style={{ display: 'grid', gap: 'clamp(8px, 2vw, 12px)' }}>
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'clamp(8px, 2vw, 12px)'
                }}>
                  <span style={{ 
                    fontSize: 'clamp(13px, 3.25vw, 14px)',
                    fontWeight: '500',
                    color: '#64748b'
                  }}>
                    Assigned Partner
                  </span>
                  <span style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '600',
                    color: '#0f172a'
                  }}>
                    {summary.solicitorDetails?.name || 'Charles Peterson-White'}
                  </span>
                </div>

                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'clamp(8px, 2vw, 12px)'
                }}>
                  <span style={{ 
                    fontSize: 'clamp(13px, 3.25vw, 14px)',
                    fontWeight: '500',
                    color: '#64748b'
                  }}>
                    Contact
                  </span>
                  <span style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '500',
                    color: '#0f172a'
                  }}>
                    {summary.solicitorDetails?.email || 'charles@helixlaw.co.uk'}
                  </span>
                </div>

                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'clamp(8px, 2vw, 12px)'
                }}>
                  <span style={{ 
                    fontSize: 'clamp(13px, 3.25vw, 14px)',
                    fontWeight: '500',
                    color: '#64748b'
                  }}>
                    Reference
                  </span>
                  <span style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '600',
                    color: '#0f172a',
                    fontFamily: 'monospace'
                  }}>
                    INS-{Math.random().toString(36).substr(2, 8).toUpperCase()}
                  </span>
                </div>

                <div style={{
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  marginTop: 'clamp(8px, 2vw, 12px)'
                }}>
                  <p style={{ 
                    margin: '0',
                    fontSize: 'clamp(12px, 3vw, 13px)',
                    color: '#64748b',
                    lineHeight: '1.4'
                  }}>
                    Your matter has been reviewed and assigned. You'll be contacted within 24 hours to discuss next steps.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline - Concise Process Flow */}
          <div className="premium-question">
            <div style={{
              padding: 'clamp(16px, 4vw, 20px) clamp(20px, 5vw, 24px)',
              background: '#0f172a',
              borderRadius: '8px 8px 0 0'
            }}>
              <h3 style={{ 
                margin: '0',
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '600',
                color: 'white',
                letterSpacing: '-0.025em'
              }}>
                Next Steps
              </h3>
            </div>
            <div style={{
              padding: 'clamp(20px, 5vw, 24px)',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px'
            }}>
              <div style={{ display: 'grid', gap: 'clamp(12px, 3vw, 16px)' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '16px',
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: '#f8fafc',
                  borderRadius: '6px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: '#0f172a',
                    color: 'white',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    flexShrink: 0
                  }}>
                    1
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ 
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      fontWeight: '600',
                      color: '#0f172a'
                    }}>
                      Matter Confirmation
                    </span>
                    <div style={{ 
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      color: '#64748b',
                      marginTop: '2px'
                    }}>
                      Documentation dispatched within 24 hours
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '16px',
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: '#f8fafc',
                  borderRadius: '6px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: '#0f172a',
                    color: 'white',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    flexShrink: 0
                  }}>
                    2
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ 
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      fontWeight: '600',
                      color: '#0f172a'
                    }}>
                      Strategy Development
                    </span>
                    <div style={{ 
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      color: '#64748b',
                      marginTop: '2px'
                    }}>
                      Comprehensive case analysis and litigation approach
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '16px',
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: '#f8fafc',
                  borderRadius: '6px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: '#0f172a',
                    color: 'white',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    flexShrink: 0
                  }}>
                    3
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ 
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      fontWeight: '600',
                      color: '#0f172a'
                    }}>
                      Progress Updates
                    </span>
                    <div style={{ 
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      color: '#64748b',
                      marginTop: '2px'
                    }}>
                      Regular updates at key litigation milestones
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Support Contact - Concise Professional */}
          <div style={{
            padding: 'clamp(20px, 5vw, 24px)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0',
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: '#0f172a',
              letterSpacing: '-0.025em'
            }}>
              Support Services
            </h3>
            <p style={{ 
              margin: '0 0 16px 0',
              fontSize: 'clamp(13px, 3.25vw, 14px)',
              color: '#64748b'
            }}>
              Reference: <span style={{ 
                fontFamily: 'monospace', 
                background: '#0f172a', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontWeight: '600',
                fontSize: 'clamp(12px, 3vw, 13px)'
              }}>{summary.instructionRef}</span>
            </p>
            <div style={{ 
              display: 'flex', 
              gap: 'clamp(8px, 2vw, 12px)', 
              justifyContent: 'center', 
              flexWrap: 'wrap' 
            }}>
              <a 
                href="tel:+441234567890"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  color: '#0f172a',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: 'clamp(13px, 3.25vw, 14px)'
                }}
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
                  gap: '6px',
                  padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                  background: '#0f172a',
                  border: '1px solid #0f172a',
                  borderRadius: '6px',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: 'clamp(13px, 3.25vw, 14px)'
                }}
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
    </>
  );
};

export default SuccessPage;
