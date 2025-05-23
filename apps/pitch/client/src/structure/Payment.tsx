import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { FaClipboardList, FaCreditCard } from 'react-icons/fa';
import '../styles/payments.css';

interface PaymentDetails {
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface PaymentProps {
  paymentDetails: PaymentDetails;
  setIsComplete: Dispatch<SetStateAction<boolean>>;
  onError: (errorCode: string) => void;
  onBack: () => void;
  onNext: () => void;
  pspid: string;
  orderId: string;
  acceptUrl: string;
  exceptionUrl: string;
  preloadFlexUrl: string | null;
  amount: number;
  product: string;
  workType: string;
}

const Payment: React.FC<PaymentProps> = ({
  paymentDetails,
  setIsComplete,
  onError,
  onBack,
  pspid,
  orderId,
  acceptUrl,
  exceptionUrl,
  preloadFlexUrl,
  amount,
  product,
  onNext,
}) => {
  const [flexUrl, setFlexUrl] = useState<string | null>(preloadFlexUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(0);
  // min-height fallback

  /* Mark step 3 complete once *your* extra inputs are filled
     (you can remove this block if you rely solely on the gateway flow) */
  useEffect(() => {
    const complete = Object.values(paymentDetails).every(v => v.trim());
    setIsComplete(complete);
  }, [paymentDetails, setIsComplete]);

  /* Resize listener – reacts to messages from master.htm */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.flexMsg === 'size' && typeof e.data.height === 'number') {
      const raw = e.data.height;
      const max = Math.floor(window.innerHeight * 0.9);   // still cap at 90vh if you like
      const clamped = Math.min(raw, max);                // ← drop the “Math.max(raw,600)”
      setIframeHeight(clamped);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  /* Build the FlexCheckout URL (unless it’s preloaded) */
  useEffect(() => {
    if (preloadFlexUrl) {
      setFlexUrl(preloadFlexUrl);
      return;   // don’t regenerate
    }
    if (!pspid || !orderId || !acceptUrl || !exceptionUrl) return;

    const generateShasignUrl = async () => {
      const params: Record<string, string> = {
        'ACCOUNT.PSPID':           pspid,
        'ALIAS.ORDERID':           orderId,
        'PARAMETERS.ACCEPTURL':    acceptUrl,
        'PARAMETERS.EXCEPTIONURL': exceptionUrl,
        /* Let the gateway show *all* card brands */
        'CARD.PAYMENTMETHOD':      'CreditCard',
        'LAYOUT.TEMPLATENAME':     'master.htm',
        'LAYOUT.LANGUAGE':         'en_GB',
        'ALIAS.STOREPERMANENTLY':  'Y',
      };

      try {
        const res   = await fetch('/pitch/get-shasign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const json  = await res.json();
        if (!res.ok || !json.shasign) {
          throw new Error(`SHA-sign service returned ${res.status}`);
        }
        const query = new URLSearchParams({ ...params, SHASIGN: json.shasign }).toString();
        setFlexUrl(`https://mdepayments.epdq.co.uk/Tokenization/HostedPage?${query}`);
      } catch (err) {
        console.error(err);
        setError('Failed to load payment form. Please try again.');
        onError('FLEX_URL_FAILED');
      }
    };

    generateShasignUrl();
  }, [pspid, orderId, acceptUrl, exceptionUrl, preloadFlexUrl, onError]);

  return (
    <div className="payment-section">
      <div className="secure-banner">🔒 Secure payment powered by Barclays</div>

      {/* ─────────────────── Service summary ─────────────────── */}
      <div className="combined-section service-summary-section">
        <div className="group-header">
          <FaClipboardList className="header-icon" /> Service Summary
        </div>
        <div className="service-summary-grid">
          <div className="summary-label">Product</div>
          <div className="summary-value">{product}</div>
          <div className="summary-label">Amount</div>
          <div className="summary-value">£{amount.toFixed(2)}</div>
        </div>
      </div>

      <div className="separator" />

      {/* ─────────────────── Payment iFrame ─────────────────── */}
      <div className="payment-details-clean">
        <div className="group-header">
          <FaCreditCard className="header-icon" /> Payment
        </div>

        <div className="iframe-wrapper">
          {flexUrl ? (
            <iframe
              title="FlexCheckout"
              src={flexUrl}
              style={{ width: '100%', height: `${iframeHeight}px`, border: 0 }}
            />
          ) : (
            <div>{error ? `Error: ${error}` : 'Loading secure payment form…'}</div>
          )}
        </div>

       <div className="button-group">
         <button className="btn secondary" onClick={onBack}>
           Back
         </button>
        <button className="btn primary" onClick={onNext} disabled={!flexUrl}>
          Next
        </button>
       </div>
      </div>
    </div>
  );
};

export default Payment;
