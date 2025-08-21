/**
 * TrustStrip V2 Component
 * 
 * Compliance elements footer with T&Cs, Privacy links, and trust indicators
 * Addresses non-negotiable requirement for trust elements
 */

import React from 'react';
import { FiShield, FiFileText, FiPhone, FiMail, FiExternalLink } from 'react-icons/fi';

interface TrustStripProps {
  variant?: 'default' | 'compact' | 'floating';
  showSupportContacts?: boolean;
  showComplianceLinks?: boolean;
  showTrustBadges?: boolean;
}

export const TrustStrip: React.FC<TrustStripProps> = ({
  variant = 'default',
  showSupportContacts = true,
  showComplianceLinks = true,
  showTrustBadges = true
}) => {
  const handleContactClick = (type: 'phone' | 'email') => {
    if (type === 'phone') {
      window.open('tel:08001234567');
    } else {
      window.open('mailto:help@helixlaw.co.uk');
    }
  };

  const handleComplianceClick = (type: 'terms' | 'privacy') => {
    // These would typically open in a modal or new tab
    // For now, we'll use placeholder links
    if (type === 'terms') {
      window.open('/terms-and-conditions', '_blank');
    } else {
      window.open('/privacy-policy', '_blank');
    }
  };

  return (
    <div className={`trust-strip trust-strip--${variant}`}>
      <div className="trust-strip__content">
        {showTrustBadges && (
          <div className="trust-badges">
            <div className="trust-badge">
              <FiShield className="trust-badge__icon" />
              <div className="trust-badge__text">
                <div className="trust-badge__title">SRA Regulated</div>
                <div className="trust-badge__subtitle">ID: 565557</div>
              </div>
            </div>
          </div>
        )}

        {showSupportContacts && (
          <div className="support-contacts">
            <div className="support-header">Support</div>
            <div className="contact-items">
              <button 
                className="contact-item" 
                onClick={() => handleContactClick('phone')}
                aria-label="Call support"
              >
                <FiPhone size={16} />
                <span>0800 123 4567</span>
              </button>
              <button 
                className="contact-item" 
                onClick={() => handleContactClick('email')}
                aria-label="Email support"
              >
                <FiMail size={16} />
                <span>help@helixlaw.co.uk</span>
              </button>
            </div>
          </div>
        )}

        {showComplianceLinks && (
          <div className="compliance-links">
            <div className="compliance-header">Legal</div>
            <div className="compliance-items">
              <button 
                className="compliance-link" 
                onClick={() => handleComplianceClick('terms')}
                aria-label="View Terms and Conditions"
              >
                <FiFileText size={14} />
                <span>Terms & Conditions</span>
                <FiExternalLink size={12} />
              </button>
              <button 
                className="compliance-link" 
                onClick={() => handleComplianceClick('privacy')}
                aria-label="View Privacy Policy"
              >
                <FiFileText size={14} />
                <span>Privacy Policy</span>
                <FiExternalLink size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .trust-strip {
          background: #1e293b;
          color: #e2e8f0;
          border-top: 1px solid #334155;
        }

        .trust-strip--default {
          padding: 1.5rem 1rem;
        }

        .trust-strip--compact {
          padding: 1rem;
        }

        .trust-strip--floating {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 1rem;
          box-shadow: 0 -4px 6px rgba(0, 0, 0, 0.1);
        }

        .trust-strip__content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 2rem;
          align-items: center;
        }

        .trust-badges {
          display: flex;
          gap: 1rem;
        }

        .trust-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid #334155;
          border-radius: 8px;
        }

        .trust-badge__icon {
          color: #10b981;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .trust-badge__text {
          line-height: 1.2;
        }

        .trust-badge__title {
          font-weight: 600;
          font-size: 0.85rem;
          color: #f1f5f9;
        }

        .trust-badge__subtitle {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 0.125rem;
        }

        .support-contacts, .compliance-links {
          text-align: center;
        }

        .support-header, .compliance-header {
          font-size: 0.8rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .contact-items, .compliance-items {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .contact-item, .compliance-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: #cbd5e1;
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .contact-item:hover, .compliance-link:hover {
          color: #f1f5f9;
          background: rgba(148, 163, 184, 0.1);
        }

        .contact-item:focus, .compliance-link:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .compliance-link {
          font-size: 0.8rem;
        }

        @media (max-width: 1024px) {
          .trust-strip__content {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            text-align: center;
          }

          .trust-badges {
            justify-content: center;
          }

          .contact-items, .compliance-items {
            gap: 0.75rem;
          }
        }

        @media (max-width: 768px) {
          .trust-strip--default, .trust-strip--compact {
            padding: 1rem 0.5rem;
          }

          .trust-strip__content {
            gap: 1rem;
          }

          .trust-badge {
            padding: 0.5rem 0.75rem;
          }

          .contact-items, .compliance-items {
            flex-direction: column;
            gap: 0.5rem;
          }

          .contact-item, .compliance-link {
            justify-content: center;
          }

          .trust-strip--floating {
            padding: 0.75rem 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .trust-badges {
            flex-direction: column;
            width: 100%;
          }

          .trust-badge {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};