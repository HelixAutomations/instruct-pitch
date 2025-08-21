import React from 'react';
import { FiShield, FiClock, FiCheck } from 'react-icons/fi';

interface OrderSummaryProps {
  dealData: {
    Amount: number;
    ServiceDescription: string;
    InstructionRef?: string;
    ProspectId?: number;
  };
  instructionRef: string;
  isProcessing?: boolean;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  dealData,
  instructionRef,
  isProcessing = false
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="order-summary">
      <div className="summary-header">
        <h3>Order Summary</h3>
        <span className="instruction-ref">{instructionRef}</span>
      </div>

      <div className="summary-content">
        {/* Service Details */}
        <div className="service-item">
          <div className="service-details">
            <h4 className="service-title">Legal Services</h4>
            <p className="service-description">{dealData.ServiceDescription}</p>
            <span className="service-ref">Ref: {instructionRef}</span>
          </div>
          <div className="service-amount">
            {formatAmount(dealData.Amount)}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="pricing-breakdown">
          <div className="price-line">
            <span>Subtotal</span>
            <span>{formatAmount(dealData.Amount)}</span>
          </div>
          <div className="price-line">
            <span>VAT (20%)</span>
            <span>{formatAmount(dealData.Amount * 0.2)}</span>
          </div>
          <div className="price-line total">
            <span>Total</span>
            <span>{formatAmount(dealData.Amount * 1.2)}</span>
          </div>
        </div>

        {/* Security Features */}
        <div className="security-features">
          <div className="security-item">
            <FiShield className="security-icon" />
            <span>Secure SSL encryption</span>
          </div>
          <div className="security-item">
            <FiClock className="security-icon" />
            <span>Instant confirmation</span>
          </div>
          <div className="security-item">
            <FiCheck className="security-icon" />
            <span>Money-back guarantee</span>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="processing-indicator">
            <div className="processing-spinner-small" />
            <span>Processing your payment...</span>
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="trust-badges">
        <div className="trust-badge">
          <span className="badge-text">Stripe</span>
          <span className="badge-subtext">Secure payments</span>
        </div>
        <div className="trust-badge">
          <span className="badge-text">SSL</span>
          <span className="badge-subtext">256-bit encryption</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
