/**
 * Premium Payment Layout Component
 * 
 * Provides the overall layout structure for premium payment flow
 * - Integrated checkout progress header
 * - Clean, minimal container with proper spacing
 * - Responsive design with mobile-first approach
 */

import React from 'react';
import CheckoutHeader from './CheckoutHeader';
import '../../styles/premium/premiumComponents.css';

interface PaymentLayoutProps {
  children: React.ReactNode;
  /** Checkout header props - if provided, shows progress header */
  checkoutHeader?: {
    currentIndex: number;
    steps: { key: string; label: string }[];
    instructionRef: string;
    amount: number;
    contact?: string;
    currentStep?: string;
  };
}

export const PaymentLayout: React.FC<PaymentLayoutProps> = ({
  children,
  checkoutHeader,
}) => {
  return (
    <div className="premium-payment-layout">
      {/* Semantic header for the page */}
      <header>
        {checkoutHeader && (
          <CheckoutHeader
            currentIndex={checkoutHeader.currentIndex}
            steps={checkoutHeader.steps}
            instructionRef={checkoutHeader.instructionRef}
            amount={checkoutHeader.amount}
            contact={checkoutHeader.contact}
            currentStep={checkoutHeader.currentStep}
          />
        )}
      </header>

      {/* Main content container */}
      <main className="premium-payment-container">
        {children}
      </main>

      {/* Optional footer with trust indicators */}
      <footer className="premium-payment-footer">
        <div className="premium-payment-container">
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
            
            <div className="premium-company-info">
              <span className="premium-caption">
                Helix Law Ltd. Regulated by the Solicitors Regulation Authority
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PaymentLayout;
