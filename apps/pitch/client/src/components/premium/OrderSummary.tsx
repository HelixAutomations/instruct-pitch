import React from 'react';
import { FiShield, FiClock, FiCheck, FiAward, FiUsers, FiStar, FiMapPin } from 'react-icons/fi';

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

        {/* Company Information */}
        <div className="company-info">
          <div className="company-header">
            <h4>Harcus Parker</h4>
            <div className="company-badges">
              <span className="badge-verified">
                <FiCheck className="badge-icon" />
                Verified
              </span>
              <span className="badge-rating">
                <FiStar className="badge-icon" />
                4.9/5
              </span>
            </div>
          </div>
          <div className="company-details">
            <div className="company-stat">
              <FiAward className="stat-icon" />
              <span>Award-winning legal firm</span>
            </div>
            <div className="company-stat">
              <FiUsers className="stat-icon" />
              <span>10,000+ clients served</span>
            </div>
            <div className="company-stat">
              <FiMapPin className="stat-icon" />
              <span>London & Manchester offices</span>
            </div>
          </div>
        </div>

        {/* Enhanced Security Features */}
        <div className="security-features">
          <h5>Your payment is secure</h5>
          <div className="security-grid">
            <div className="security-item">
              <FiShield className="security-icon" />
              <div className="security-text">
                <span className="security-title">Bank-level security</span>
                <span className="security-desc">256-bit SSL encryption</span>
              </div>
            </div>
            <div className="security-item">
              <FiClock className="security-icon" />
              <div className="security-text">
                <span className="security-title">Instant confirmation</span>
                <span className="security-desc">Immediate receipt & updates</span>
              </div>
            </div>
            <div className="security-item">
              <FiCheck className="security-icon" />
              <div className="security-text">
                <span className="security-title">SRA Regulated</span>
                <span className="security-desc">Professional standards</span>
              </div>
            </div>
            <div className="security-item">
              <FiAward className="security-icon" />
              <div className="security-text">
                <span className="security-title">PCI DSS compliant</span>
                <span className="security-desc">Industry-standard security</span>
              </div>
            </div>
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

      {/* Enhanced Trust Badges */}
      <div className="trust-badges">
        <div className="trust-badge">
          <span className="badge-text">Stripe</span>
          <span className="badge-subtext">Secure payments</span>
        </div>
        <div className="trust-badge">
          <span className="badge-text">SSL</span>
          <span className="badge-subtext">256-bit encryption</span>
        </div>
        <div className="trust-badge">
          <span className="badge-text">PCI DSS</span>
          <span className="badge-subtext">Compliant</span>
        </div>
        <div className="trust-badge">
          <span className="badge-text">Verified</span>
          <span className="badge-subtext">Legal firm</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
