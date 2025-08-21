/**
 * Premium Payment Layout Test Page
 * 
 * Test page to showcase the new PaymentLayout component
 * and demonstrate responsive behavior across devices
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
// Premium layout removed; fallback to simple container for test or remove file if unused
// If still referenced, this lightweight wrapper keeps build passing.
const PaymentLayout: React.FC<React.PropsWithChildren<{ supportPhone?: string; supportEmail?: string }>> = ({ children }) => (
  <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>{children}</div>
);

const PaymentLayoutTest: React.FC = () => {
  const navigate = useNavigate();

  return (
  <PaymentLayout>
      {/* Test Content */}
      <div className="premium-grid premium-grid--two-column">
        
        {/* Main Payment Area */}
        <div className="premium-card">
          <h1 className="premium-heading">Premium Payment Experience</h1>
          <div className="premium-amount">£1,250.00</div>
          <p className="premium-body">
            Testing the new premium payment layout with responsive design. 
            This amount scales beautifully across desktop, iPad, and mobile devices.
          </p>
          
          <div className="premium-trust-indicator">
            <svg className="premium-trust-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Secure payment processing</span>
          </div>
          
          <div className="premium-button-group">
            <button 
              className="premium-button premium-button--secondary"
              onClick={() => navigate('/')}
            >
              Back to Home
            </button>
            <button 
              className="premium-button premium-button--primary"
              onClick={() => navigate('/HLX-12345-ABCD-EFGH/success')}
            >
              Test Success Page
            </button>
          </div>
        </div>
        
        {/* Sidebar - Summary */}
        <div className="premium-card">
          <h2 className="premium-heading">Service Summary</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <div className="premium-caption">Legal Services</div>
            <div className="premium-body" style={{ margin: '4px 0 16px 0' }}>
              Property Transaction Support
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div className="premium-caption">Solicitor</div>
            <div className="premium-body" style={{ margin: '4px 0 16px 0' }}>
              Sarah Johnson
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <div className="premium-caption">Total (inc. VAT)</div>
            <div className="premium-amount" style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', margin: '4px 0 0 0' }}>
              £1,250.00
            </div>
          </div>
          
          <div className="premium-security-badge">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            PCI Compliant
          </div>
        </div>
      </div>
      
  {/* Trimmed extra demo/test sections to reduce bundle & remove premium styles */}
    </PaymentLayout>
  );
};

export default PaymentLayoutTest;
