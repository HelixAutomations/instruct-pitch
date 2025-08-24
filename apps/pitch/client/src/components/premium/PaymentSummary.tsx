import React from 'react';
import './PaymentSummary-enhanced.css';

interface PaymentSummaryProps {
  dealData: {
    Amount: number;
    ServiceDescription: string;
    InstructionRef?: string;
    ProspectId?: number;
  };
  instructionRef: string;
  onProceedToPayment: () => void;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  dealData,
  instructionRef,
  onProceedToPayment
}) => {
  // Development helper
  React.useEffect(() => {
    console.log('🔍 Environment check:', {
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
      env: import.meta.env
    });
    if (import.meta.env.DEV) {
      console.log('🚀 DEV MODE: Skip to Payment button should be visible');
    } else {
      console.log('📦 PRODUCTION MODE: Skip buttons hidden');
    }
  }, []);

  // Calculate VAT and total amounts
  const subtotal = dealData.Amount;
  const vatRate = 0.20;
  const vatAmount = subtotal * vatRate;
  const totalAmount = subtotal + vatAmount;

  return (
    <div className="payment-summary-container">
      <div className="payment-summary-content">
        
        {/* Enhanced Header Section */}
        <div className="payment-summary-header-enhanced">
          <div className="header-primary">
            <h1 className="summary-title-enhanced">Review Your Legal Services Order</h1>
            <p className="summary-description-enhanced">
              Please carefully review all details below before proceeding to secure payment processing
            </p>
          </div>
          <div className="header-metadata">
            <div className="order-reference">
              <span className="ref-label">Order Reference</span>
              <span className="ref-value">{instructionRef}</span>
            </div>
            <div className="security-indicators">
              <span className="security-badge-header">SSL Encrypted</span>
              <span className="security-badge-header">SRA Regulated</span>
            </div>
          </div>
        </div>

        {/* Professional Service Details Card */}
        <div className="service-details-card-enhanced">
          <div className="service-card-header">
            <div className="service-title-section">
              <h2 className="service-title-enhanced">Legal Service Details</h2>
              <span className="service-category">Professional Legal Services</span>
            </div>
            <div className="service-badges">
              <span className="quality-badge">Premium Service</span>
              <span className="compliance-badge">SRA Compliant</span>
            </div>
          </div>
          
          <div className="service-description-section">
            <h3 className="service-name">{dealData.ServiceDescription}</h3>
            <p className="service-explanation">
              Professional legal services provided by qualified solicitors regulated by the 
              Solicitors Regulation Authority. All work is conducted to the highest professional standards.
            </p>
          </div>

          <div className="service-metadata-grid">
            <div className="metadata-item">
              <span className="metadata-label">Service Type</span>
              <span className="metadata-value">Legal Consultation & Documentation</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Reference Number</span>
              <span className="metadata-value">{instructionRef}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Regulatory Body</span>
              <span className="metadata-value">Solicitors Regulation Authority</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Service Standard</span>
              <span className="metadata-value">Professional Indemnity Insured</span>
            </div>
          </div>

          {/* Detailed Pricing Breakdown */}
          <div className="pricing-breakdown-enhanced">
            <h4 className="pricing-title">Pricing Breakdown</h4>
            <div className="price-lines">
              <div className="price-line subtotal">
                <span className="price-label">Legal Services (Subtotal)</span>
                <span className="price-value">£{subtotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="price-line vat">
                <span className="price-label">VAT (20%)</span>
                <span className="price-value">£{vatAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="price-line total">
                <span className="price-label">Total Amount</span>
                <span className="price-value-total">£{totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="pricing-note">
              <p>All prices include VAT at the current rate. No additional charges will be applied.</p>
            </div>
          </div>
        </div>

        {/* Enhanced Trust & Compliance Grid */}
        <div className="trust-compliance-grid">
          <div className="grid-header">
            <h3>Why Choose Helix Law</h3>
            <p>Professional standards and security you can trust</p>
          </div>
          
          <div className="trust-items-enhanced">
            <div className="trust-item-enhanced security">
              <div className="trust-content-enhanced">
                <h4>Bank-Level Security</h4>
                <p>256-bit SSL encryption and PCI DSS compliance</p>
                <span className="trust-detail">Your data is protected by industry-leading security standards</span>
              </div>
            </div>
            
            <div className="trust-item-enhanced regulation">
              <div className="trust-content-enhanced">
                <h4>SRA Regulated Firm</h4>
                <p>Fully regulated by the Solicitors Regulation Authority</p>
                <span className="trust-detail">Professional indemnity insurance and regulatory oversight</span>
              </div>
            </div>
            
            <div className="trust-item-enhanced expertise">
              <div className="trust-content-enhanced">
                <h4>Expert Legal Team</h4>
                <p>Qualified solicitors with specialist expertise</p>
                <span className="trust-detail">Years of experience in providing professional legal services</span>
              </div>
            </div>
            
            <div className="trust-item-enhanced support">
              <div className="trust-content-enhanced">
                <h4>Dedicated Support</h4>
                <p>Professional support throughout your matter</p>
                <span className="trust-detail">Available Monday to Friday, 9:00 AM to 6:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Company Information */}
        <div className="company-information-enhanced">
          <div className="company-header-enhanced">
            <h3>About Helix Law Limited</h3>
            <div className="company-credentials">
              <span className="credential">Established Legal Practice</span>
              <span className="credential">SRA Regulated</span>
              <span className="credential">Professional Indemnity Insured</span>
            </div>
          </div>
          
          <div className="company-details-grid">
            <div className="company-section regulatory">
              <h4>Regulatory Information</h4>
              <div className="detail-item">
                <span className="detail-label">Company Registration:</span>
                <span className="detail-value">12345678</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">SRA Number:</span>
                <span className="detail-value">654321</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">VAT Registration:</span>
                <span className="detail-value">GB123456789</span>
              </div>
            </div>
            
            <div className="company-section contact">
              <h4>Contact Information</h4>
              <div className="detail-item">
                <span className="detail-label">Business Address:</span>
                <span className="detail-value">Legal House, 123 Law Street, London, SW1A 1AA</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">hello@helixlaw.co.uk</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">020 1234 5678</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Security & Compliance Strip */}
        <div className="security-compliance-strip">
          <div className="security-section">
            <h4>Payment Security</h4>
            <div className="security-badges-enhanced">
              <div className="security-badge-detailed">
                <div className="badge-content">
                  <span className="badge-title">SSL Encryption</span>
                  <span className="badge-subtitle">256-bit security</span>
                </div>
              </div>
              <div className="security-badge-detailed">
                <div className="badge-content">
                  <span className="badge-title">PCI DSS Compliant</span>
                  <span className="badge-subtitle">Secure processing</span>
                </div>
              </div>
              <div className="security-badge-detailed">
                <div className="badge-content">
                  <span className="badge-title">SRA Regulated</span>
                  <span className="badge-subtitle">Professional standards</span>
                </div>
              </div>
              <div className="security-badge-detailed">
                <div className="badge-content">
                  <span className="badge-title">Data Protection</span>
                  <span className="badge-subtitle">GDPR compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Proceed Section */}
        <div className="proceed-section-enhanced">
          <div className="proceed-header">
            <h3>Ready to Proceed</h3>
            <p>Your payment will be processed securely using industry-standard encryption</p>
          </div>
          
          <button 
            className="proceed-button-enhanced"
            onClick={onProceedToPayment}
          >
            <span className="button-content">
              <span className="button-text">Proceed to Secure Payment</span>
              <span className="button-amount">£{totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </span>
            <span className="button-icon">→</span>
          </button>
          
          {/* Premium Navigation Section */}
          <div className="premium-navigation">
            {/* Development Only - Skip to Payment */}
            {(import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <button 
                className="premium-button-dev"
                onClick={() => {
                  console.log('🚀 DEV: Skipping to payment...');
                  // Skip preflight and go directly to payment
                  setTimeout(() => {
                    onProceedToPayment();
                    // Trigger another skip to bypass preflight
                    setTimeout(() => {
                      const event = new CustomEvent('dev-skip-to-payment');
                      window.dispatchEvent(event);
                    }, 100);
                  }, 100);
                }}
                title="Development only - Skip directly to payment"
                style={{
                  marginLeft: '1rem',
                  background: 'rgb(5, 150, 105)',
                  color: 'white',
                  border: '2px dashed rgb(251, 191, 36)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 8px'
                }}
              >
                � DEV: Skip to Payment
              </button>
            )}
            
            {/* Step Counter */}
            <div className="navigation-step-counter">
              <span className="nav-step-text">Step 1 of 3</span>
            </div>
          </div>
          
          {/* Instruction Reference */}
          <div className="instruction-reference">
            <span className="instruction-ref">Ref: {instructionRef}</span>
          </div>
          
          <div className="proceed-footer">
            <p className="security-notice">
              🔒 Your payment details are processed by Stripe and never stored by Helix Law
            </p>
            <p className="redirect-notice">
              You will be redirected to our secure payment processor to complete your transaction
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentSummary;
