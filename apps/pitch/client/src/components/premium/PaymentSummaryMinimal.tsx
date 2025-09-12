import React, { useState } from 'react';
import { useClient } from '../../context/ClientContext';
import './PaymentSummaryMinimal.css';
import PreflightExperience from './PreflightExperience';
import lawSocietyLogo from '../../assets/The Law society.svg';
import legal500Logo from '../../assets/The Legal 500.svg';
import chambersPartnersLogo from '../../assets/Chambers & Partners.svg';

declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test' | string
  }
}

interface PaymentSummaryMinimalProps {
  dealData: {
    Amount: number;
    ServiceDescription: string;
    InstructionRef?: string;
    ProspectId?: number;
    SolicitorName?: string;
    SolicitorTitle?: string;
    SolicitorEmail?: string;
    SolicitorPhone?: string;
  };
  // Called when the user proceeds; passes the chosen subtotal (pre-VAT)
  onProceedToPayment: (chosenSubtotal: number) => void;
  showPreflight?: boolean;
  onPreflightComplete?: () => void;
}

const PaymentSummaryMinimal: React.FC<PaymentSummaryMinimalProps> = ({
  dealData,
  onProceedToPayment,
  showPreflight = false,
  onPreflightComplete
}) => {
  // Access global deal data to persist user edits beyond this component
  const { dealData: ctxDealData, setDealData } = useClient();
  // State for editable amount
  const [editableAmount, setEditableAmount] = useState(dealData.Amount);
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  const persistAmount = (newAmount: number) => {
    const base = ctxDealData ?? dealData;
    setDealData({ ...base, Amount: newAmount });
  };

  // Calculate amounts based on editable amount
  const subtotal = editableAmount;
  const vatAmount = subtotal * 0.20;
  const totalAmount = subtotal + vatAmount;

  // Solicitor information with fallbacks
  const solicitorName = dealData.SolicitorName || 'Lukasz Zemanek';
  const solicitorTitle = dealData.SolicitorTitle || 'Solicitor';
  const solicitorEmail = dealData.SolicitorEmail || 'lz@helix-law.com';
  const solicitorPhone = dealData.SolicitorPhone || '0345 314 2044';

  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="payment-summary-minimal">
      {/* Enhanced Header */}
      <div className="receipt-header">
        <div className="header-content">
          <h1 className="summary-title">Service Summary</h1>
        </div>
      </div>

      <div className="receipt-content">
        {showPreflight && (
          <div className="pricing-summary">
            <div className="morph-container preflight-mode">
              <PreflightExperience
                amount={totalAmount}
                instructionRef={dealData.InstructionRef || 'Unknown'}
                serviceDescription="Payment on Account of Costs"
                solicitorName={solicitorName}
                onComplete={onPreflightComplete || (() => {})}
                isVisible={true}
              />
            </div>
          </div>
        )}

        {/* Service Card with Editable Amount and Price Breakdown */}
        <div className="service-card">
          <div className="service-header">
            <div className="service-details">
              <h2 className="service-name">Payment on Account of Costs</h2>
            </div>
          </div>
          
          <div className="amount-section">
            <div className="amount-display-container">
              {!isEditingAmount ? (
                <div className="amount-display" onClick={() => setIsEditingAmount(true)}>
                  <span className="amount-value">{formatAmount(editableAmount)}</span>
                  <button className="edit-amount-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758L11.013 1.427z" fill="currentColor"/>
                    </svg>
                    Edit amount
                  </button>
                </div>
              ) : (
                <div className="amount-edit-container">
                  <div className="service-price-editable">
                    <span className="currency-symbol">£</span>
                    <input
                      type="number"
                      value={editableAmount.toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const next = Number.isFinite(val) ? val : 0;
                        setEditableAmount(next);
                        persistAmount(next);
                      }}
                      onBlur={() => {
                        // Small delay to allow click on confirm button
                        setTimeout(() => setIsEditingAmount(false), 150);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingAmount(false);
                        }
                        if (e.key === 'Escape') {
                          setEditableAmount(dealData.Amount); // Reset to original
                          persistAmount(dealData.Amount);
                          setIsEditingAmount(false);
                        }
                      }}
                      className="amount-input"
                      step="0.01"
                      min="0"
                      autoFocus
                    />
                    <button 
                      className="confirm-amount-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditingAmount(false);
                      }}
                      type="button"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="amount-explanation-info">
              <p>This amount represents our estimate based on the information provided. You may adjust this payment on account to reflect your preferred contribution at this time.</p>
            </div>
            
            {editableAmount !== dealData.Amount && (
              <div className="amount-change-note">
                <span className="original-amount">Original estimate: {formatAmount(dealData.Amount)}</span>
              </div>
            )}

            {/* Price Breakdown within Service Card */}
            {!showPreflight && (
              <div className="price-breakdown-card">
                <div className="price-line">
                  <span className="price-label">Subtotal</span>
                  <span className="price-value">{formatAmount(subtotal)}</span>
                </div>
                <div className="price-line vat-line">
                  <span className="price-label">VAT (20%)</span>
                  <span className="price-value">{formatAmount(vatAmount)}</span>
                </div>
                <div className="price-line total-line">
                  <span className="price-label">Total</span>
                  <span className="price-value total-amount">{formatAmount(totalAmount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Proceed Button */}
        <button 
          className="proceed-button-minimal"
          onClick={() => onProceedToPayment(editableAmount)}
        >
          <div className="button-content">
            <span className="button-text">Pay Now</span>
            <span className="button-amount">{formatAmount(totalAmount)}</span>
          </div>
          <div className="button-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" fill="currentColor"/>
            </svg>
          </div>
        </button>        
        {/* Solicitor Card - Hidden in production */}
        {process.env.NODE_ENV !== 'production' && (
          <>
            {process.env.NODE_ENV === 'development' && (
              <div style={{ 
                background: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                padding: '8px 12px', 
                margin: '10px 0', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#856404'
              }}>
                🚧 DEV ONLY: Author box hidden in production
              </div>
            )}
            <div className="solicitor-card">
              <div className="solicitor-header">
                <div className="solicitor-avatar">
                  <img 
                    src="/assets/dark blue mark.svg" 
                    alt="Helix Law"
                    className="solicitor-logo"
                  />
                  <div className="solicitor-person-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="solicitor-info">
                  <h3 className="solicitor-name">{solicitorName}</h3>
                  <p className="solicitor-title">{solicitorTitle}</p>
                  <div className="solicitor-qualifications">
                    <span className="qualification-badge">LLB (Hons)</span>
                    <span className="qualification-badge">SRA Qualified</span>
                    <span className="qualification-badge experience-tag">8+ Years Experience</span>
                  </div>
                </div>
                <div className="trust-indicators">
                  {/* Experience now moved to qualifications */}
                </div>
              </div>
              
              <div className="solicitor-details">
                <div className="fee-earner-description">
                  <p>
                    Specialist in commercial litigation with extensive experience in contract disputes, 
                    professional negligence claims, and debt recovery. {solicitorName.split(' ')[0]} has successfully handled 
                    cases ranging from £5,000 to £2M+ and maintains a 95% success rate.
                  </p>
                </div>
                
                <div className="contact-methods">
                  <a href={`mailto:${solicitorEmail}`} className="contact-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="contact-icon">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>{solicitorEmail}</span>
                  </a>
                  <a href={`tel:${solicitorPhone.replace(/\s/g, '')}`} className="contact-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="contact-icon">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                    <span>{solicitorPhone}</span>
                  </a>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Trust Signals - Independent */}
        <div className="trust-section-independent">
          <div className="company-info">
            <strong>Helix Law Limited</strong> • SRA ID: 565557
          </div>
          <div className="trust-logos-independent">
            <img src={lawSocietyLogo} alt="The Law Society" className="trust-logo-independent" />
            <img src={legal500Logo} alt="The Legal 500" className="trust-logo-independent" />
            <img src={chambersPartnersLogo} alt="Chambers and Partners" className="trust-logo-independent chambers-logo" />
          </div>
        </div>

        {/* Footer */}
        <div className="order-footer">
          <div className="security-notice">
            Secure payment processing • Data protection guaranteed
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryMinimal;
