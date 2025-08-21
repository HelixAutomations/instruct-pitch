/**
 * Premium Checkout Layout Component
 * 
 * The main layout wrapper for the entire checkout experience.
 * Provides consistent branding, progress indication, and mobile-optimized structure.
 */

import React from 'react';
import './CheckoutLayout.css';

interface CheckoutLayoutProps {
  children: React.ReactNode;
  currentStep: 1 | 2 | 3;
  showProgress?: boolean;
  className?: string;
}

const CheckoutLayout: React.FC<CheckoutLayoutProps> = ({
  children,
  currentStep,
  showProgress = true,
  className = '',
}) => {
  const steps = [
    { number: 1, label: 'Review', description: 'Service details' },
    { number: 2, label: 'Payment', description: 'Secure checkout' },
    { number: 3, label: 'Complete', description: 'Confirmation' },
  ];

  return (
    <div className={`checkout-layout ${className}`}>
      {/* Header */}
      <header className="checkout-header">
        <div className="container">
          <div className="header-content">
            {/* Logo */}
            <div className="brand">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="brand-logo"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="6" fill="var(--helix-navy)" />
                <path
                  d="M8 12h6v8h-2v-6h-2v6H8v-8zm10 0h6v2h-4v2h3v2h-3v2h4v2h-6v-8z"
                  fill="white"
                />
              </svg>
              <span className="brand-name">Helix Law</span>
            </div>

            {/* Support Link */}
            <div className="header-support">
              <a href="tel:02071005555" className="support-link">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z"
                    fill="currentColor"
                  />
                </svg>
                Support
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      {showProgress && (
        <div className="progress-section">
          <div className="container">
            <div className="progress-indicator">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`progress-step ${
                    step.number === currentStep
                      ? 'current'
                      : step.number < currentStep
                      ? 'completed'
                      : 'upcoming'
                  }`}
                >
                  <div className="step-connector" aria-hidden="true">
                    {index > 0 && (
                      <div
                        className={`connector-line ${
                          step.number <= currentStep ? 'active' : ''
                        }`}
                      />
                    )}
                  </div>
                  
                  <div className="step-content">
                    <div className="step-number">
                      {step.number < currentStep ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                            fill="currentColor"
                          />
                        </svg>
                      ) : (
                        <span>{step.number}</span>
                      )}
                    </div>
                    
                    <div className="step-labels">
                      <div className="step-label">{step.label}</div>
                      <div className="step-description">{step.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="checkout-main">
        <div className="container">
          <div className="checkout-content">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="checkout-footer">
        <div className="container">
          <div className="footer-content">
            <div className="legal-links">
              <a href="/terms" className="legal-link">Terms of Service</a>
              <a href="/privacy" className="legal-link">Privacy Policy</a>
              <a href="/refunds" className="legal-link">Refund Policy</a>
            </div>
            
            <div className="company-info">
              <p className="company-details">
                Helix Law Limited • Company No. 12345678 • ICO No. ZA123456
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CheckoutLayout;
