import React from 'react';
import { useRouter } from 'next/router';
import { Eye, Calendar, FileText, User, Mail, Phone, CheckCircle, Clock, MapPin } from 'lucide-react';

interface SummaryData {
  instructionRef: string;
  serviceDetails: {
    description: string;
    amount?: number;
    currency?: string;
  };
  clientInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  completedSteps: {
    identityVerified: boolean;
    documentsUploaded: boolean;
    paymentCompleted: boolean;
  };
  solicitorDetails: {
    name: string;
    email: string;
    phone?: string;
  };
  nextSteps: string[];
  estimatedTimeline: string;
}

const SuccessPage: React.FC = () => {
  const router = useRouter();
  
  // Mock data - replace with actual data fetching
  const summary: SummaryData = {
    instructionRef: `LIT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    serviceDetails: {
      description: 'Commercial Litigation Services',
      amount: 150000,
      currency: 'GBP'
    },
    clientInfo: {
      name: 'Premium Client',
      email: 'client@company.com',
      phone: '+44 20 7946 0958'
    },
    completedSteps: {
      identityVerified: true,
      documentsUploaded: true,
      paymentCompleted: true
    },
    solicitorDetails: {
      name: 'Charles Peterson-White',
      email: 'charles@helixlaw.co.uk',
      phone: '+44 20 3940 4350'
    },
    nextSteps: [
      'Matter confirmation documentation',
      'Strategic case analysis',
      'Regular progress updates'
    ],
    estimatedTimeline: '24-48 hours'
  };

  const formatAmount = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getCurrentTime = () => {
    return new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          
          {/* Receipt Header */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px 8px 0 0',
            border: '2px dashed #cbd5e1',
            borderBottom: '1px solid #cbd5e1',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#0f172a',
              marginBottom: '8px',
              letterSpacing: '-0.025em'
            }}>
              HELIX LAW ⚖️
            </div>
            <div style={{
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '16px'
            }}>
              Commercial Litigation Services
            </div>
            <div style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#64748b',
              borderTop: '1px dotted #cbd5e1',
              paddingTop: '12px'
            }}>
              REF: {summary.instructionRef}<br/>
              {getCurrentTime()}
            </div>
          </div>

          {/* Client Information */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderLeft: '2px dashed #cbd5e1',
            borderRight: '2px dashed #cbd5e1',
            borderBottom: '1px dotted #cbd5e1'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#0f172a',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              📋 Client Details
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Name:</span> {summary.clientInfo.name}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Email:</span> {summary.clientInfo.email}
              </div>
              <div>
                <span style={{ fontWeight: '500' }}>Phone:</span> {summary.clientInfo.phone}
              </div>
            </div>
          </div>

          {/* Service Status */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderLeft: '2px dashed #cbd5e1',
            borderRight: '2px dashed #cbd5e1',
            borderBottom: '1px dotted #cbd5e1'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#0f172a',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              ✅ Service Status
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px'
              }}>
                <span style={{ color: '#64748b' }}>Identity Verification</span>
                <span style={{
                  background: summary.completedSteps.identityVerified ? '#dcfce7' : '#fef2f2',
                  color: summary.completedSteps.identityVerified ? '#166534' : '#dc2626',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {summary.completedSteps.identityVerified ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px'
              }}>
                <span style={{ color: '#64748b' }}>Documents</span>
                <span style={{
                  background: summary.completedSteps.documentsUploaded ? '#dcfce7' : '#fef2f2',
                  color: summary.completedSteps.documentsUploaded ? '#166534' : '#dc2626',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {summary.completedSteps.documentsUploaded ? 'SECURED' : 'PENDING'}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px'
              }}>
                <span style={{ color: '#64748b' }}>Payment</span>
                <span style={{
                  background: summary.completedSteps.paymentCompleted ? '#dcfce7' : '#fef2f2',
                  color: summary.completedSteps.paymentCompleted ? '#166534' : '#dc2626',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {summary.completedSteps.paymentCompleted ? 'PROCESSED' : 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment Details */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderLeft: '2px dashed #cbd5e1',
            borderRight: '2px dashed #cbd5e1',
            borderBottom: '1px dotted #cbd5e1'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#0f172a',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              👨‍💼 Assignment
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Partner:</span> {summary.solicitorDetails.name}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Contact:</span> {summary.solicitorDetails.email}
              </div>
              <div>
                <span style={{ fontWeight: '500' }}>Timeline:</span> {summary.estimatedTimeline}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderLeft: '2px dashed #cbd5e1',
            borderRight: '2px dashed #cbd5e1',
            borderBottom: '1px dotted #cbd5e1'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#0f172a',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              📋 Next Steps
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              {summary.nextSteps.map((step, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  {index + 1}. {step}
                </div>
              ))}
            </div>
          </div>

          {/* Receipt Footer */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0 0 8px 8px',
            border: '2px dashed #cbd5e1',
            borderTop: '1px solid #cbd5e1',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '16px',
              borderBottom: '1px dotted #cbd5e1',
              paddingBottom: '12px'
            }}>
              For queries regarding this instruction, please reference: <br/>
              <span style={{
                fontFamily: 'monospace',
                background: '#f1f5f9',
                padding: '2px 6px',
                borderRadius: '3px',
                fontWeight: '600'
              }}>
                {summary.instructionRef}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a 
                href="tel:0345 314 2044"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  color: '#0f172a',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                📞 0345 314 2044
              </a>
              <a 
                href="mailto:support@helix-law.com"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  background: '#0f172a',
                  border: '1px solid #0f172a',
                  borderRadius: '4px',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                ✉️ support@helix-law.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SuccessPage;
