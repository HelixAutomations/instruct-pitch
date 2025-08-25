import React from 'react';
import './OrderSummaryMinimal.css';

interface OrderSummaryMinimalProps {
  dealData: {
    Amount: number;
    ServiceDescription: string;
    InstructionRef?: string;
    ProspectId?: number;
  };
  isProcessing?: boolean;
}

const OrderSummaryMinimal: React.FC<OrderSummaryMinimalProps> = ({
  dealData,
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

  const subtotal = dealData.Amount;
  const vatAmount = subtotal * 0.20;
  const totalAmount = subtotal + vatAmount;

  return (
    <div className="order-summary-minimal">
      <div className="summary-card">
        {/* Service Item */}
        <div className="service-line">
          <div className="service-info">
            <div className="service-title">Legal Services</div>
            <div className="service-desc">{dealData.ServiceDescription}</div>
          </div>
          <div className="service-amount">{formatAmount(totalAmount)}</div>
        </div>

        {/* Price Breakdown */}
        <div className="price-breakdown">
          <div className="breakdown-line">
            <span>Subtotal</span>
            <span>{formatAmount(subtotal)}</span>
          </div>
          <div className="breakdown-line">
            <span>VAT (20%)</span>
            <span>{formatAmount(vatAmount)}</span>
          </div>
          <div className="breakdown-line total-line">
            <span>Total</span>
            <span>{formatAmount(totalAmount)}</span>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="processing-minimal">
            <div className="spinner-minimal"></div>
            <span>Processing payment...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSummaryMinimal;
