/**
 * Premium Success Page
 * 
 * Clean success page shown after successful payment
 * Provides clear confirmation and next steps
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentLayout } from '../components/premium/PaymentLayout';
import { getStoredPaymentData, clearStoredPaymentData } from '../utils/premiumPaymentUtils';
import { paymentService } from '../utils/paymentService';
import '../styles/premium/premiumComponents.css';

const PremiumSuccessPage: React.FC = () => {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    // Get payment data from session storage
    const storedData = getStoredPaymentData('success');
    if (storedData) {
      setPaymentData(storedData);
      // Clear the stored data after use
      clearStoredPaymentData('success');
    }
  }, []);

  // Extract payment details from stored data or URL params as fallback
  const amount = paymentData?.amount;
  const paymentId = paymentData?.paymentId;
  const timestamp = paymentData?.timestamp;

  return (
    <PaymentLayout>
      <div className="premium-grid">
        <div className="premium-card premium-card--elevated premium-fade-in">
          {/* Success Header */}
          <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 6vw, 40px)' }}>
            <div style={{ 
              width: 'clamp(64px, 15vw, 80px)', 
              height: 'clamp(64px, 15vw, 80px)',
              backgroundColor: '#10B981',
              borderRadius: '50%',
              margin: '0 auto clamp(16px, 4vw, 24px) auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="9,11 12,14 22,4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="m21,11.5a8.5,8.5 0 1,1 -2.5,-6.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h1 className="premium-heading" style={{ color: '#10B981', marginBottom: '8px' }}>
              Payment Successful
            </h1>
            <p className="premium-body" style={{ color: '#6B7280', margin: '0' }}>
              Thank you for your payment. We have received your instruction.
            </p>
          </div>

          {/* Payment Details */}
          {amount && (
            <div className="premium-card" style={{ 
              backgroundColor: '#F9FAFB', 
              border: '1px solid #E5E7EB',
              marginBottom: 'clamp(20px, 5vw, 32px)'
            }}>
              <h2 style={{ 
                fontSize: 'clamp(1rem, 3.5vw, 1.125rem)', 
                fontWeight: '600', 
                margin: '0 0 16px 0',
                color: '#374151'
              }}>
                Payment Confirmation
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="premium-caption">Amount Paid</span>
                  <span className="premium-body" style={{ fontWeight: '600', margin: '0' }}>
                    {amount ? paymentService.formatAmount(amount, paymentData?.currency || 'GBP') : 'Amount not available'}
                  </span>
                </div>
                
                {ref && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="premium-caption">Instruction Reference</span>
                    <span className="premium-body" style={{ fontWeight: '600', margin: '0' }}>
                      {ref}
                    </span>
                  </div>
                )}
                
                {paymentId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="premium-caption">Payment ID</span>
                    <span className="premium-caption" style={{ fontFamily: 'monospace' }}>
                      {paymentId.slice(0, 8)}...
                    </span>
                  </div>
                )}
                
                {timestamp && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="premium-caption">Date & Time</span>
                    <span className="premium-caption">
                      {new Date(timestamp).toLocaleString('en-GB')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div style={{ marginBottom: 'clamp(20px, 5vw, 32px)' }}>
            <h2 style={{ 
              fontSize: 'clamp(1rem, 3.5vw, 1.125rem)', 
              fontWeight: '600', 
              margin: '0 0 16px 0',
              color: '#374151'
            }}>
              What happens next?
            </h2>
            
            <ul style={{ 
              margin: '0', 
              paddingLeft: '20px', 
              color: '#6B7280',
              lineHeight: '1.6'
            }}>
              <li>You will receive an email confirmation shortly</li>
              <li>Your allocated solicitor will contact you within 1 business day</li>
              <li>Any additional documents will be requested as needed</li>
              <li>We will keep you updated throughout the process</li>
            </ul>
          </div>

          {/* Trust Indicators */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 'clamp(12px, 3vw, 16px)',
            marginBottom: 'clamp(20px, 5vw, 32px)'
          }}>
            <div className="premium-security-badge">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure Payment
            </div>
            
            <div className="premium-security-badge">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              SRA Regulated
            </div>
          </div>

          {/* Action Button */}
          <div className="premium-button-group">
            <button 
              className="premium-button premium-button--primary"
              onClick={() => navigate('/pitch')}
            >
              Start New Instruction
            </button>
          </div>
        </div>
      </div>
    </PaymentLayout>
  );
};

export default PremiumSuccessPage;
