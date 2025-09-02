import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { FiLock, FiAlertCircle, FiCreditCard } from 'react-icons/fi';
import { FaApple, FaGoogle, FaUniversity } from 'react-icons/fa';
import { paymentService } from '../../utils/paymentService';
// Trust / accreditation assets (reuse from preflight)
import lawSocietyLogo from '../../assets/The Law society.svg';
import legal500Logo from '../../assets/The Legal 500.svg';
import chambersPartnersLogo from '../../assets/Chambers & Partners.svg';

interface ModernPaymentFormProps {
  amount: number;
  currency: string;
  instructionRef: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessingChange: (processing: boolean) => void;
}

const ModernPaymentForm: React.FC<ModernPaymentFormProps> = ({
  amount,
  currency,
  instructionRef,
  onSuccess,
  onError,
  onProcessingChange
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cardComplete, setCardComplete] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'card' | 'bank'>('card');
  const [copiedField, setCopiedField] = useState<string>('');

  // Card element options for clean, simplified styling
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: '#2d3748',
        '::placeholder': {
          color: '#a0aec0',
        },
      },
      invalid: {
        color: '#e53e3e',
        iconColor: '#e53e3e'
      },
      complete: {
  color: '#14B07A',
      }
    },
    hidePostalCode: false,
  };

  // Create payment intent on component mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        console.log('🔧 Creating payment intent for modern form:', { amount, currency, instructionRef });
        
        const response = await paymentService.createPaymentIntent({
          amount,
          currency,
          instructionRef,
          metadata: {
            source: 'premium_checkout',
            instructionRef,
            amount: amount.toString()
          }
        });
        
        if (response.clientSecret) {
          setClientSecret(response.clientSecret);
          console.log('✅ Modern payment form - client secret set:', response.paymentId);
        } else {
          throw new Error('No client secret received');
        }
      } catch (error) {
        console.error('❌ Error creating payment intent:', error);
        setErrorMessage('Failed to initialize payment. Please try again.');
        onError('Failed to initialize payment');
      } finally {
        setIsLoading(false);
      }
    };

    if (stripe && amount > 0) {
      createPaymentIntent();
    }
  }, [stripe, amount, currency, instructionRef, onError]);

  // Setup Apple Pay payment request
  useEffect(() => {
    if (stripe && amount > 0) {
      console.log('🍎 Setting up Apple Pay payment request...');
      
      const pr = stripe.paymentRequest({
        country: 'GB',
        currency: currency.toLowerCase(),
        total: {
          label: 'Legal Services',
          amount: Math.round(amount * 1.2 * 100), // Convert to pence and add VAT
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      // Check if Apple Pay is available
      pr.canMakePayment().then((result) => {
        console.log('🍎 Apple Pay availability check:', result);
        if (result) {
          console.log('✅ Apple Pay is available');
          setPaymentRequest(pr);
        } else {
          console.log('❌ Apple Pay not available on this device/browser');
        }
      }).catch((error) => {
        console.log('❌ Apple Pay check failed:', error);
      });

      pr.on('paymentmethod', async (event) => {
        console.log('🍎 Apple Pay payment method selected');
        try {
          if (!clientSecret) {
            console.error('❌ No client secret available for Apple Pay');
            event.complete('fail');
            return;
          }

          const { error, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            {
              payment_method: event.paymentMethod.id
            },
            { handleActions: false }
          );

          if (error) {
            console.error('❌ Apple Pay confirmation error:', error);
            event.complete('fail');
            setErrorMessage(error.message || 'Apple Pay payment failed');
          } else {
            console.log('✅ Apple Pay payment succeeded');
            event.complete('success');
            if (paymentIntent && paymentIntent.status === 'succeeded') {
              onSuccess(paymentIntent.id);
            }
          }
        } catch (error) {
          console.error('❌ Apple Pay processing error:', error);
          event.complete('fail');
          setErrorMessage('Apple Pay payment failed');
        }
      });
    }
  }, [stripe, amount, currency, clientSecret, onSuccess]);

  // Update parent processing state
  useEffect(() => {
    onProcessingChange(isProcessing);
  }, [isProcessing, onProcessingChange]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMessage('Card element not found');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Payment on Account of Costs',
          }
        }
      });

      if (error) {
        console.error('Payment error:', error);
        setErrorMessage(error.message || 'An error occurred during payment');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        onSuccess(paymentIntent.id);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      onError('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (label: string, value: string) => {
    try {
      navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 1800);
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  };

  const handleCardElementChange = (event: any) => {
    setCardComplete(event.complete);
    
    // Clear errors when user is typing
    if (errorMessage && event.complete !== undefined) {
      setErrorMessage('');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="modern-payment-loading">
        <div className="loading-spinner" />
        <p>Initialising secure payment...</p>
      </div>
    );
  }

  return (
    <div className="modern-payment-form">
      <form onSubmit={handleSubmit} className="payment-form">
        
        {/* Payment Method Tabs */}
        <div className="payment-methods-tabs">
          <button
            type="button"
            className={`payment-tab ${activePaymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('card')}
          >
            <FiCreditCard />
            Card
          </button>
          <button
            type="button"
            className={`payment-tab ${activePaymentMethod === 'bank' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('bank')}
          >
            <FaUniversity />
            Bank Transfer
          </button>
        </div>

        {/* Digital Wallets */}
        {activePaymentMethod === 'card' && (
          <div className="digital-wallets">
            {paymentRequest ? (
              <PaymentRequestButtonElement
                options={{
                  paymentRequest,
                  style: {
                    paymentRequestButton: {
                      type: 'default',
                      theme: 'dark',
                      height: '48px',
                    },
                  },
                }}
              />
            ) : (
              <>
                <button type="button" className="wallet-button apple-pay" disabled>
                  <FaApple />
                  Apple Pay
                </button>
                <button type="button" className="wallet-button google-pay" disabled>
                  <FaGoogle />
                  Google Pay
                </button>
              </>
            )}
            
            <div className="payment-method-divider">
              <span>or pay with card</span>
            </div>
          </div>
        )}

        {/* Bank Transfer Instructions */}
        {activePaymentMethod === 'bank' && (
          <div className="bank-transfer-section">
            <div className="bank-instructions">
              <div className="bank-header-row">
                <h4>Bank Transfer Details</h4>
                <span className="bank-badge">Manual Settlement</span>
              </div>
              <p className="bank-intro">Send a transfer using your online banking. Use the exact reference so we can match your payment instantly.</p>
              <div className="bank-details-grid">
                <div className="bank-detail-item">
                  <span className="detail-label">Account Name</span>
                  <span className="detail-value" onClick={() => handleCopy('accountName','Helix Law General Client Account')}>
                    Helix Law General Client Account
                  </span>
                  <button type="button" className="copy-btn" onClick={() => handleCopy('accountName','Helix Law General Client Account')}>{copiedField==='accountName' ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="bank-detail-item">
                  <span className="detail-label">Bank</span>
                  <span className="detail-value" onClick={() => handleCopy('bank','Barclays Bank, Eastbourne')}>
                    Barclays Bank, Eastbourne
                  </span>
                  <button type="button" className="copy-btn" onClick={() => handleCopy('bank','Barclays Bank, Eastbourne')}>{copiedField==='bank' ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="bank-detail-item">
                  <span className="detail-label">Sort Code</span>
                  <span className="detail-value" onClick={() => handleCopy('sortCode','20-27-91')}>20-27-91</span>
                  <button type="button" className="copy-btn" onClick={() => handleCopy('sortCode','20-27-91')}>{copiedField==='sortCode' ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="bank-detail-item">
                  <span className="detail-label">Account Number</span>
                  <span className="detail-value" onClick={() => handleCopy('accountNumber','9347 2434')}>9347 2434</span>
                  <button type="button" className="copy-btn" onClick={() => handleCopy('accountNumber','9347 2434')}>{copiedField==='accountNumber' ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="bank-detail-item">
                  <span className="detail-label">Reference</span>
                  <span className="detail-value" onClick={() => handleCopy('reference', instructionRef)}>{instructionRef}</span>
                  <button type="button" className="copy-btn" onClick={() => handleCopy('reference', instructionRef)}>{copiedField==='reference' ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="bank-detail-item">
                  <span className="detail-label">Amount (GBP)</span>
                  <span className="detail-value" onClick={() => handleCopy('amount', formatAmount(amount * 1.2))}>{formatAmount(amount * 1.2)}</span>
                  <button type="button" className="copy-btn" onClick={() => handleCopy('amount', formatAmount(amount * 1.2))}>{copiedField==='amount' ? 'Copied' : 'Copy'}</button>
                </div>
              </div>
              <div className="bank-hints">
                <div className="hint-item">Use the reference exactly – it links your payment to your matter.</div>
                <div className="hint-item">Faster Payments usually arrive within minutes; some banks may take up to 2 hours.</div>
              </div>
            </div>
          </div>
        )}

        {/* Card Input Element */}
        {activePaymentMethod === 'card' && clientSecret && (
          <div className="payment-element-container">
            <div className="payment-element-wrapper">
              <div className="card-input-container">
                <label htmlFor="card-element" className="card-label">
                  Card Details
                </label>
                <div className="card-element-wrapper">
                  <CardElement
                    id="card-element"
                    options={cardElementOptions}
                    onChange={handleCardElementChange}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="payment-error">
            <FiAlertCircle />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Payment Button */}
        {activePaymentMethod === 'card' ? (
          <button
            type="submit"
            disabled={!stripe || !clientSecret || isProcessing || !cardComplete}
            className={`pay-button ${isProcessing ? 'processing' : ''} ${cardComplete ? 'ready' : 'pending'}`}
          >
            {isProcessing ? (
              <>
                <div className="button-spinner" />
                Processing Payment...
              </>
            ) : (
              <>
                <FiLock />
                Pay {formatAmount(amount * 1.2)}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSuccess('bank-transfer-pending')}
            className="pay-button bank-transfer-button"
          >
            <FaUniversity />
            Confirm Bank Transfer Details
          </button>
        )}
      </form>
      {/* Trust Footer: mirrors preflight styling (uniform grey logos + security signals) */}
      <div className="payment-trust-footer" aria-label="Professional accreditations and security">
        <div className="payment-trust-logos" role="group" aria-label="Accreditations">
          <span
            role="img"
            aria-label="The Law Society"
            className="trust-logo-mask"
            style={{ WebkitMaskImage: `url(${lawSocietyLogo})`, maskImage: `url(${lawSocietyLogo})` }}
          />
          <span
            role="img"
            aria-label="The Legal 500"
            className="trust-logo-mask"
            style={{ WebkitMaskImage: `url(${legal500Logo})`, maskImage: `url(${legal500Logo})` }}
          />
          <span
            role="img"
            aria-label="Chambers and Partners"
            className="trust-logo-mask chambers-size"
            style={{ WebkitMaskImage: `url(${chambersPartnersLogo})`, maskImage: `url(${chambersPartnersLogo})` }}
          />
        </div>
        <div className="payment-security-inline" role="group" aria-label="Security assurances">
          <span className="security-signal" aria-label="256-bit SSL encryption">
            <svg className="fluent-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M8.25 10V8a3.75 3.75 0 1 1 7.5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="5.75" y="10" width="12.5" height="9" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 13.25v2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="12.75" r="1" fill="currentColor" />
            </svg>
            <span className="signal-label">256‑bit SSL</span>
          </span>
          <span className="security-signal" aria-label="SRA regulated firm">
            <svg className="fluent-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 3.5 5 6v5.25c0 4.06 2.83 7.88 7 8.75 4.17-.87 7-4.69 7-8.75V6l-7-2.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="m9.25 12.25 1.75 1.75 3.75-3.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="signal-label">SRA Regulated</span>
          </span>
        </div>
      </div>

      <style>{`
        .modern-payment-form {
          width: 100%;
          max-width: 100%; /* allow parent card to control width */
          margin: 0; /* remove auto margins causing horizontal shift */
        }
        /* Defensive override when embedded in minimal summary */
        .payment-section .modern-payment-form { max-width: 100%; margin: 0; }

        .payment-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Bank Transfer Enhanced Styles */
        .bank-transfer-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem 1.25rem 1.5rem;
          animation: fadeInBank 400ms ease;
        }
        @keyframes fadeInBank { from { opacity: 0; transform: translateY(4px);} to {opacity:1; transform: translateY(0);} }
        .bank-header-row { display:flex; align-items:center; gap:.75rem; margin:0 0 .5rem; }
        .bank-header-row h4 { font-size:1rem; font-weight:600; color:#0D2F60; letter-spacing:.3px; margin:0; }
        .bank-badge { background:#0D2F6010; color:#0D2F60; font-size:.625rem; font-weight:600; letter-spacing:.5px; padding:4px 8px; border-radius:6px; text-transform:uppercase; }
        .bank-intro { font-size:.75rem; line-height:1.3; color:#475569; margin:0 0 .875rem; }
        .bank-details-grid { display:grid; grid-template-columns:1fr; gap:.75rem; margin-bottom:1rem; }
        .bank-detail-item { position:relative; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:.8rem .75rem .7rem; display:flex; flex-direction:column; gap:4px; transition:border-color .15s ease, box-shadow .15s ease; }
        .bank-detail-item:hover { border-color:#cbd5e1; box-shadow:0 1px 2px rgba(0,0,0,0.06); }
        .detail-label { font-size:.575rem; font-weight:600; letter-spacing:.7px; text-transform:uppercase; color:#64748b; }
        .detail-value { font-size:.85rem; font-weight:600; color:#0f172a; word-break:break-all; cursor:pointer; padding-right:50px; line-height:1.3; }
  /* Removed special ref-item styling so Reference appears like others */
        .copy-btn { position:absolute; top:8px; right:8px; background:#f1f5f9; border:1px solid #e2e8f0; font-size:.55rem; font-weight:600; letter-spacing:.5px; padding:4px 8px; border-radius:4px; cursor:pointer; color:#475569; transition:all .15s ease; }
        .copy-btn:hover { background:#e2e8f0; }
        .copy-btn.primary { background:#0D2F60; border-color:#0D2F60; color:#fff; }
        .copy-btn.primary:hover { background:#061733; }
        .bank-hints { display:flex; flex-direction:column; gap:6px; }
        .hint-item { font-size:.65rem; line-height:1.25; color:#475569; padding:6px 8px; background:#fff; border:1px dashed #e2e8f0; border-radius:6px; }
        @media (min-width:768px){
          .bank-details-grid { grid-template-columns:repeat(2,1fr); gap:.75rem .85rem; }
          .bank-detail-item { padding:.6rem .65rem .55rem; gap:2px; }
          .detail-value { font-size:.8rem; padding-right:40px; }
          .copy-btn { top:6px; right:6px; padding:3px 6px; }
        }
        @media (max-width:520px){
          .detail-value { font-size:.8rem; }
        }

        .payment-element-container {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .payment-element-wrapper {
          padding: 1.5rem;
        }

        .apple-pay-container {
          margin-bottom: 1.5rem;
        }

        .apple-pay-note {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          text-align: center;
        }

        .apple-pay-note p {
          margin: 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .payment-divider {
          display: flex;
          align-items: center;
          margin: 1.5rem 0;
          text-align: center;
        }

        .payment-divider::before,
        .payment-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .payment-divider span {
          padding: 0 1rem;
          color: #64748b;
          font-size: 0.875rem;
          background: white;
        }

        .card-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .card-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .card-element-wrapper {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          transition: border-color 150ms ease;
        }

        .card-element-wrapper:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .payment-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
        }

        .pay-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: clamp(6px, 2vw, 10px);
          padding: clamp(14px, 4vw, 18px) clamp(20px, 6vw, 40px);
          border: none;
          border-radius: clamp(8px, 2.5vw, 14px);
          font-size: clamp(0.875rem, 3.5vw, 1rem);
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 150ms ease;
          min-height: clamp(48px, 12vw, 56px);
          touch-action: manipulation;
          width: 100%;
          -webkit-tap-highlight-color: transparent;
          background: #0D2F60;
          color: #FFFFFF;
          font-family: 'Raleway', sans-serif;
        }

        .pay-button:hover:not(:disabled) {
          background: #061733;
          transform: translateY(-1px);
        }

        .pay-button:active {
          transform: translateY(0);
        }

        .pay-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .pay-button.processing {
          background: #0D2F60;
          opacity: 0.8;
        }

        .pay-button.ready {
          background: #14B07A; /* mid-tone unified green */
        }

        .pay-button.ready:hover:not(:disabled) {
          background: #129869; /* darker hover derived from mid-tone */
          transform: translateY(-1px);
        }

        .button-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .modern-payment-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .payment-element-wrapper {
            padding: 1rem;
          }
        }

  /* Trust footer styles (scoped here to avoid pulling full preflight CSS) */
  .payment-trust-footer { margin-top: 1.25rem; padding-top: 1.2rem; border-top: 1px solid #e5e7eb; display:flex; flex-direction:column; align-items:center; gap:14px; }
  .payment-trust-logos { display:flex; align-items:center; justify-content:center; gap:1.85rem; }
  .trust-logo-mask { display:inline-block; flex:0 0 82px; height:40px; background:#6B7280; opacity:0.58; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; -webkit-mask-position:center; mask-position:center; -webkit-mask-size:contain; mask-size:contain; transition:opacity .35s ease, transform .45s cubic-bezier(0.16,1,0.3,1); }
  .trust-logo-mask.chambers-size { flex:0 0 82px; height:22px; }
  .trust-logo-mask:hover { opacity:.75; transform:translateY(-3px); }
  .payment-security-inline { display:flex; align-items:center; justify-content:center; gap:48px; }
  .security-signal { display:inline-flex; align-items:center; gap:10px; padding:4px 8px; border-radius:6px; color:#14B07A; position:relative; }
  .fluent-icon { width:26px; height:26px; stroke:currentColor; color:#14B07A; opacity:.9; transition:opacity .3s ease, transform .4s cubic-bezier(0.16,1,0.3,1); }
  .security-signal:hover .fluent-icon { opacity:1; transform:translateY(-2px); }
  .signal-label { font-size:0.6875rem; letter-spacing:.05em; font-weight:600; text-transform:uppercase; color:#64748b; opacity:.7; line-height:1; white-space:nowrap; font-family:'Raleway',sans-serif; }
  .security-signal:hover .signal-label { opacity:1; }
  @media (max-width:640px){ .payment-security-inline { gap:32px; } .trust-logo-mask { height:32px; } .trust-logo-mask.chambers-size { height:18px; } .fluent-icon { width:22px; height:22px; } }
  @media (prefers-reduced-motion: reduce) { .trust-logo-mask { transition:none; } .trust-logo-mask:hover { transform:none; } }
      `}</style>
    </div>
  );
};

export default ModernPaymentForm;
