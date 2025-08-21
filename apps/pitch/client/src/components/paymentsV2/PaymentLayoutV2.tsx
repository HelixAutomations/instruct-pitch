/**
 * PaymentLayout V2 Component
 * 
 * Trust-first payment layout with legal entity information and support contacts
 * Addresses non-negotiable requirements: SRA ID, support contacts, legal services only
 */

import React from 'react';
import { FiShield, FiPhone, FiMail, FiFileText, FiLock } from 'react-icons/fi';

interface PaymentLayoutProps {
  children: React.ReactNode;
  title?: string;
  showTrustElements?: boolean;
}

export const PaymentLayout: React.FC<PaymentLayoutProps> = ({
  children,
  title = 'Secure Payment',
  showTrustElements = true,
}) => {
  return (
    <div className="payment-layout-v2">
      {/* Header with trust elements */}
      <div className="payment-header">
        <div className="trust-indicators">
          <FiShield className="shield-icon" />
          <h1 className="payment-title">{title}</h1>
          <FiLock className="lock-icon" />
        </div>
        
        {showTrustElements && (
          <div className="legal-entity-info">
            <p className="sra-info">
              <strong>Helix Law</strong> - Authorised and regulated by the Solicitors Regulation Authority
            </p>
            <p className="sra-id">SRA ID: 565557</p>
          </div>
        )}
      </div>

      {/* Main payment content */}
      <div className="payment-content">
        {children}
      </div>

      {/* Trust strip with compliance elements */}
      {showTrustElements && (
        <div className="trust-strip">
          <div className="support-contacts">
            <div className="contact-item">
              <FiPhone size={16} />
              <span>Support: 0800 123 4567</span>
            </div>
            <div className="contact-item">
              <FiMail size={16} />
              <span>help@helixlaw.co.uk</span>
            </div>
          </div>
          
          <div className="compliance-links">
            <a href="/terms" className="compliance-link">
              <FiFileText size={14} />
              Terms & Conditions
            </a>
            <a href="/privacy" className="compliance-link">
              <FiFileText size={14} />
              Privacy Policy
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        .payment-layout-v2 {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .payment-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 2rem 1rem 1.5rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .trust-indicators {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .shield-icon, .lock-icon {
          color: #059669;
          font-size: 1.5rem;
        }

        .payment-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .legal-entity-info {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem auto 0;
          max-width: 500px;
        }

        .sra-info {
          font-size: 0.9rem;
          color: #065f46;
          margin: 0 0 0.5rem 0;
          font-weight: 600;
        }

        .sra-id {
          font-size: 0.8rem;
          color: #047857;
          margin: 0;
          font-weight: 500;
        }

        .payment-content {
          max-width: 600px;
          margin: 2rem auto;
          padding: 0 1rem;
        }

        .trust-strip {
          background: #1e293b;
          color: white;
          padding: 1.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: auto;
        }

        .support-contacts {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #e2e8f0;
        }

        .compliance-links {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .compliance-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #cbd5e1;
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 0.2s ease;
        }

        .compliance-link:hover {
          color: #f1f5f9;
        }

        @media (max-width: 768px) {
          .payment-title {
            font-size: 1.5rem;
          }
          
          .trust-strip {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .support-contacts {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .compliance-links {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};