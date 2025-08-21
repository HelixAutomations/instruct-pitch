/**
 * PriceSummaryCard V2 Component
 * 
 * Prominent amount display for legal services with clear breakdown
 * No retail artifacts - legal services only
 */

import React from 'react';
import { FiCheck, FiShield } from 'react-icons/fi';

interface PriceSummaryCardProps {
  amount: number;
  currency: string;
  description: string;
  instructionRef: string;
  legalService: string;
  vatIncluded?: boolean;
  breakdown?: Array<{ label: string; amount: number }>;
}

export const PriceSummaryCard: React.FC<PriceSummaryCardProps> = ({
  amount,
  currency,
  description,
  instructionRef,
  legalService,
  vatIncluded = true,
  breakdown = []
}) => {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="price-summary-card">
      <div className="card-header">
        <div className="service-indicator">
          <FiShield className="shield-icon" />
          <span className="service-type">Legal Service</span>
        </div>
        <div className="instruction-ref">
          Ref: {instructionRef}
        </div>
      </div>

      <div className="service-details">
        <h3 className="service-name">{legalService}</h3>
        <p className="service-description">{description}</p>
      </div>

      {breakdown.length > 0 && (
        <div className="price-breakdown">
          {breakdown.map((item, index) => (
            <div key={index} className="breakdown-item">
              <span className="breakdown-label">{item.label}</span>
              <span className="breakdown-amount">
                {formatAmount(item.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="total-amount">
        <div className="amount-display">
          <span className="amount-label">Total Amount</span>
          <span className="amount-value">
            {formatAmount(amount, currency)}
          </span>
        </div>
        {vatIncluded && (
          <div className="vat-notice">
            <FiCheck size={16} />
            <span>VAT included where applicable</span>
          </div>
        )}
      </div>

      <div className="payment-security">
        <div className="security-badge">
          <FiShield size={16} />
          <span>Secure payment processing</span>
        </div>
      </div>

      <style jsx>{`
        .price-summary-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .card-header {
          background: #f8fafc;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .service-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .shield-icon {
          color: #059669;
          font-size: 1.1rem;
        }

        .service-type {
          font-weight: 600;
          color: #065f46;
          font-size: 0.9rem;
        }

        .instruction-ref {
          font-size: 0.8rem;
          color: #64748b;
          font-family: 'Courier New', monospace;
          background: #f1f5f9;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .service-details {
          padding: 1.5rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .service-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .service-description {
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        .price-breakdown {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          font-size: 0.9rem;
        }

        .breakdown-label {
          color: #64748b;
        }

        .breakdown-amount {
          font-weight: 600;
          color: #1e293b;
        }

        .total-amount {
          padding: 1.5rem;
          background: #f8fafc;
        }

        .amount-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .amount-label {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }

        .amount-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.025em;
        }

        .vat-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #059669;
        }

        .payment-security {
          padding: 1rem 1.5rem;
          background: #f0fdf4;
          border-top: 1px solid #bbf7d0;
        }

        .security-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #065f46;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .amount-value {
            font-size: 1.75rem;
          }

          .service-details {
            padding: 1rem;
          }

          .total-amount {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};