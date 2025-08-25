import React from 'react';
import './PaymentSummaryMinimal.css';

interface PaymentSummaryMinimalProps {
  dealData: {
    Amount: number;
    ServiceDescription: string;
    InstructionRef?: string;
    ProspectId?: number;
  };
  instructionRef: string;
  onProceedToPayment: () => void;
}

const PaymentSummaryMinimal: React.FC<PaymentSummaryMinimalProps> = ({
  dealData,
  instructionRef,
  onProceedToPayment
}) => {
  // Calculate amounts
  const subtotal = dealData.Amount;
  const vatAmount = subtotal * 0.20;
  const totalAmount = subtotal + vatAmount;

  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="payment-summary-minimal">
      <div className="receipt-header">
        <h2>Order Summary</h2>
        <div className="order-info">
          <div className="order-number">Order #{instructionRef}</div>
          <div className="order-date">{currentDate}</div>
        </div>
      </div>

      <div className="receipt-content">
        {/* Product Line */}
        <div className="product-item">
          <div className="product-details">
            <div className="product-name">Legal Services</div>
            <div className="product-description">{dealData.ServiceDescription}</div>
            <div className="product-features">
              <span className="feature">Professional legal consultation</span>
              <span className="feature">SRA regulated solicitors</span>
              <span className="feature">Secure document handling</span>
            </div>
          </div>
          <div className="product-price">{formatAmount(subtotal)}</div>
        </div>

        {/* Pricing Summary */}
        <div className="pricing-summary">
          <div className="price-line">
            <span>Subtotal</span>
            <span>{formatAmount(subtotal)}</span>
          </div>
          <div className="price-line">
            <span>VAT (20%)</span>
            <span>{formatAmount(vatAmount)}</span>
          </div>
          <div className="price-line total">
            <span>Total</span>
            <span>{formatAmount(totalAmount)}</span>
          </div>
        </div>

        {/* Enhanced Service Provider Info */}
        <div className="provider-info">
          <div className="provider-header">
            <h4>Helix Law Limited</h4>
            <div className="provider-badges">
              <span className="badge">SRA Regulated</span>
              <span className="badge">Professional Indemnity Insured</span>
            </div>
          </div>
          <div className="provider-details">
            <p>Legal House, Brighton</p>
            <p>hello@helixlaw.co.uk</p>
            <div className="provider-note">
              Established legal practice providing professional services since 2018
            </div>
          </div>
        </div>

        {/* Service Features */}
        <div className="service-features">
          <h4>Service Includes</h4>
          <div className="features-list">
            <div className="feature-item">
              <span>Secure document review and handling</span>
            </div>
            <div className="feature-item">
              <span>Qualified solicitor consultation</span>
            </div>
            <div className="feature-item">
              <span>Professional legal support</span>
            </div>
            <div className="feature-item">
              <span>Regulatory compliance assurance</span>
            </div>
          </div>
        </div>

        {/* Proceed Button */}
        <button 
          className="proceed-button-minimal"
          onClick={onProceedToPayment}
        >
          <span>Proceed to Payment</span>
          <span className="button-amount">{formatAmount(totalAmount)}</span>
        </button>

        {/* Security Notice */}
        <div className="security-notice">
          <span>Secure payment processing • SSL encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryMinimal;
