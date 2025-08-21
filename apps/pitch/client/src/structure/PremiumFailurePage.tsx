/**
 * Premium Failure Page
 * 
 * Clean failure page shown after failed payment
 * Provides clear error information and retry options
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentLayout } from '../components/premium/PaymentLayout';
import { getStoredPaymentData, clearStoredPaymentData, getPremiumErrorMessage } from '../utils/premiumPaymentUtils';
import '../styles/premium/premiumComponents.css';

const PremiumFailurePage: React.FC = () => {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    // Get payment data from session storage
    const storedData = getStoredPaymentData('failure');
    if (storedData) {
      setPaymentData(storedData);
      // Clear the stored data after use
      clearStoredPaymentData('failure');
    }
  }, []);

  // Extract error details from stored data or provide defaults
  const errorCode = paymentData?.status || 'failed';
  const errorMessage = paymentData ? getPremiumErrorMessage(paymentData) : null;
  const amount = paymentData?.amount;
  const paymentId = paymentData?.paymentId;
  const instructionRef = paymentData?.instructionRef || ref;

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
          message: errorMessage || 'We were unable to process your payment. Please try again or contact support.',
          icon: '⚠️'
        };
    }
  };

  const errorInfo = getErrorInfo(errorCode);

  return (
    <PaymentLayout>
      <div className="premium-grid">
        <div className="premium-card premium-card--elevated premium-fade-in">
          {/* Error Header */}
          <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 6vw, 40px)' }}>
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
            
            <h1 className="premium-heading" style={{ color: '#EF4444', marginBottom: '8px' }}>
              {errorInfo.title}
            </h1>
            <p className="premium-body" style={{ color: '#6B7280', margin: '0' }}>
              {errorInfo.message}
            </p>
          </div>

          {/* Payment Details */}
          {amount && (
            <div className="premium-card" style={{ 
              backgroundColor: '#FEF2F2', 
              border: '1px solid #FECACA',
              marginBottom: 'clamp(20px, 5vw, 32px)'
            }}>
              <h2 style={{ 
                fontSize: 'clamp(1rem, 3.5vw, 1.125rem)', 
                fontWeight: '600', 
                margin: '0 0 16px 0',
                color: '#B91C1C'
              }}>
                Payment Details
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="premium-caption">Amount</span>
                  <span className="premium-body" style={{ fontWeight: '600', margin: '0' }}>
                    £{amount}
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
                
                {errorCode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="premium-caption">Error Code</span>
                    <span className="premium-caption" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>
                      {errorCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Solutions */}
          <div style={{ marginBottom: 'clamp(20px, 5vw, 32px)' }}>
            <h2 style={{ 
              fontSize: 'clamp(1rem, 3.5vw, 1.125rem)', 
              fontWeight: '600', 
              margin: '0 0 16px 0',
              color: '#374151'
            }}>
              What can you do?
            </h2>
            
            <ul style={{ 
              margin: '0', 
              paddingLeft: '20px', 
              color: '#6B7280',
              lineHeight: '1.6'
            }}>
              {errorCode === 'card_declined' && (
                <>
                  <li>Try a different payment card</li>
                  <li>Contact your bank to authorize the payment</li>
                  <li>Check your card details are correct</li>
                </>
              )}
              {errorCode === 'insufficient_funds' && (
                <>
                  <li>Use a different payment card</li>
                  <li>Add funds to your account</li>
                  <li>Try a bank transfer instead</li>
                </>
              )}
              {errorCode === 'network_error' && (
                <>
                  <li>Check your internet connection</li>
                  <li>Try again in a few minutes</li>
                  <li>Use a different browser or device</li>
                </>
              )}
              {!errorCode && (
                <>
                  <li>Check your card details and try again</li>
                  <li>Try a different payment method</li>
                  <li>Contact your bank if the problem persists</li>
                  <li>Contact our support team for assistance</li>
                </>
              )}
            </ul>
          </div>

          {/* Support Information */}
          <div className="premium-card" style={{ 
            backgroundColor: '#F0F9FF', 
            border: '1px solid #BAE6FD',
            marginBottom: 'clamp(20px, 5vw, 32px)'
          }}>
            <h3 style={{ 
              fontSize: 'clamp(0.875rem, 3vw, 1rem)', 
              fontWeight: '600', 
              margin: '0 0 12px 0',
              color: '#1E40AF'
            }}>
              Need Help?
            </h3>
            <p style={{ 
              margin: '0 0 12px 0', 
              color: '#374151',
              fontSize: 'clamp(0.875rem, 3vw, 0.875rem)',
              lineHeight: '1.5'
            }}>
              Our support team is available to help resolve payment issues.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <a 
                href="tel:+442071836832" 
                style={{ color: '#1E40AF', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500' }}
              >
                📞 +44 20 7183 6832
              </a>
              <a 
                href="mailto:support@helixlaw.co.uk" 
                style={{ color: '#1E40AF', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500' }}
              >
                ✉️ support@helixlaw.co.uk
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="premium-button-group">
            <button 
              className="premium-button premium-button--secondary"
              onClick={() => navigate('/pitch')}
            >
              Start Over
            </button>
            <button 
              className="premium-button premium-button--primary"
              onClick={() => navigate(`/pitch/${ref}/payment`)}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </PaymentLayout>
  );
};

export default PremiumFailurePage;
