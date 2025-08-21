/**
 * Order Summary Component
 * 
 * The first step in the premium checkout flow.
 * Builds confidence with clear pricing, service details, and trust signals.
 */

import React from 'react';
import './OrderSummary.css';

interface ServiceDetail {
  title: string;
  description?: string;
  included?: boolean;
}

interface OrderSummaryProps {
  /** The main service being purchased */
  serviceName: string;
  /** Brief description of the service */
  serviceDescription: string;
  /** Amount in pounds (major units) */
  amount: number;
  /** Currency code */
  currency?: string;
  /** VAT amount if applicable */
  vatAmount?: number;
  /** Whether VAT is included in the main amount */
  vatIncluded?: boolean;
  /** List of what's included in the service */
  serviceDetails?: ServiceDetail[];
  /** Fee earner/solicitor name */
  solicitorName?: string;
  /** Matter type or legal area */
  matterType?: string;
  /** Expiry information */
  expiryInfo?: {
    expiresAt: Date;
    formattedExpiry: string;
  };
  /** Callback when user proceeds to payment */
  onProceed: () => void;
  /** Loading state */
  isLoading?: boolean;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  serviceName,
  serviceDescription,
  amount,
  currency = 'GBP',
  vatAmount,
  vatIncluded = true,
  serviceDetails = [],
  solicitorName,
  matterType,
  expiryInfo,
  onProceed,
  isLoading = false,
}) => {
  const formatCurrency = (value: number, currencyCode: string = currency) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const defaultServiceDetails: ServiceDetail[] = [
    {
      title: 'Professional legal consultation',
      description: 'Expert advice from qualified solicitors',
      included: true,
    },
    {
      title: 'Document preparation and review',
      description: 'All necessary legal documents prepared',
      included: true,
    },
    {
      title: 'Ongoing support during your matter',
      description: 'Guidance throughout the legal process',
      included: true,
    },
    {
      title: 'No hidden fees',
      description: 'Transparent pricing with no surprises',
      included: true,
    },
  ];

  const displayServiceDetails = serviceDetails.length > 0 ? serviceDetails : defaultServiceDetails;

  return (
    <div className="order-summary">
      <div className="order-summary__content animate-slide-up">
        
        {/* Header Section */}
        <header className="summary-header">
          <h1 className="summary-title">Review Your Order</h1>
          <p className="summary-subtitle">
            Please review the details below before proceeding to secure payment
          </p>
        </header>

        {/* Service Details Card */}
        <div className="service-card premium-card">
          <div className="service-header">
            <h2 className="service-name">{serviceName}</h2>
            <p className="service-description">{serviceDescription}</p>
          </div>

          {/* Service Meta Information */}
          {(solicitorName || matterType) && (
            <div className="service-meta">
              {solicitorName && (
                <div className="meta-item">
                  <span className="meta-label">Solicitor:</span>
                  <span className="meta-value">{solicitorName}</span>
                </div>
              )}
              {matterType && (
                <div className="meta-item">
                  <span className="meta-label">Matter type:</span>
                  <span className="meta-value">{matterType}</span>
                </div>
              )}
              {expiryInfo && (
                <div className="meta-item">
                  <span className="meta-label">Quote expires:</span>
                  <span className="meta-value">{expiryInfo.formattedExpiry}</span>
                </div>
              )}
            </div>
          )}

          {/* Pricing Section */}
          <div className="pricing-section">
            <div className="price-breakdown">
              <div className="price-line main-price">
                <span className="price-label">Legal services</span>
                <span className="price-value">
                  {formatCurrency(vatIncluded ? amount : amount - (vatAmount || 0))}
                </span>
              </div>
              
              {vatAmount && vatAmount > 0 && (
                <div className="price-line vat-line">
                  <span className="price-label">VAT (20%)</span>
                  <span className="price-value">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              
              <div className="price-line total-line">
                <span className="price-label">
                  Total {vatIncluded && '(inc. VAT)'}
                </span>
                <span className="price-value amount-display">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* What's Included Section */}
        <div className="included-section premium-card">
          <h3 className="included-title">What's included</h3>
          <ul className="included-list">
            {displayServiceDetails.map((detail, index) => (
              <li key={index} className="included-item">
                <div className="item-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="item-content">
                  <div className="item-title">{detail.title}</div>
                  {detail.description && (
                    <div className="item-description">{detail.description}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust Signals Section */}
        <div className="trust-section">
          <div className="trust-badges">
            <div className="trust-badge">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M8 1a2 2 0 012 2v1h1a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h1V3a2 2 0 012-2zM7 4V3a1 1 0 112 0v1H7zm1 4a1 1 0 100 2 1 1 0 000-2z"
                  fill="currentColor"
                />
              </svg>
              <span>Secure payment via our PCI-compliant processor</span>
            </div>
            
            <div className="trust-badge">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.857 6.857l-4.5 4.5a.857.857 0 01-1.214 0l-2.286-2.286a.857.857 0 111.214-1.214L6.857 9.643l3.786-3.786a.857.857 0 111.214 1.214z"
                  fill="currentColor"
                />
              </svg>
              <span>256-bit SSL encryption</span>
            </div>
          </div>

          {/* Card Brands */}
          <div className="card-brands">
            <span className="brands-label">We accept:</span>
            <div className="brand-icons">
              {/* Visa */}
              <div className="brand-icon" aria-label="Visa">
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
                  <rect width="32" height="20" rx="3" fill="#f8f9fa" stroke="#e9ecef"/>
                  <text x="16" y="13" textAnchor="middle" fontSize="8" fill="#6c757d">VISA</text>
                </svg>
              </div>
              
              {/* Mastercard */}
              <div className="brand-icon" aria-label="Mastercard">
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
                  <rect width="32" height="20" rx="3" fill="#f8f9fa" stroke="#e9ecef"/>
                  <text x="16" y="13" textAnchor="middle" fontSize="7" fill="#6c757d">MC</text>
                </svg>
              </div>
              
              {/* American Express */}
              <div className="brand-icon" aria-label="American Express">
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
                  <rect width="32" height="20" rx="3" fill="#f8f9fa" stroke="#e9ecef"/>
                  <text x="16" y="13" textAnchor="middle" fontSize="7" fill="#6c757d">AMEX</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="action-section">
          <button
            type="button"
            className="proceed-button premium-button"
            onClick={onProceed}
            disabled={isLoading}
            aria-describedby="payment-security-info"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" aria-hidden="true"></span>
                <span>Preparing payment...</span>
              </>
            ) : (
              <>
                <span>Proceed to Secure Payment</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.44 8.5H2.75a.75.75 0 010-1.5h6.69L6.22 4.28a.75.75 0 010-1.06z"
                    fill="currentColor"
                  />
                </svg>
              </>
            )}
          </button>
          
          <p id="payment-security-info" className="security-notice">
            Your payment will be processed securely. We never store your card details.
          </p>
        </div>

      </div>
    </div>
  );
};

export default OrderSummary;
