import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
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
  contactFirstName: string;
  pitchedAt: string;
  instructionReady: boolean;
  onPaymentData?: (data: { aliasId?: string; orderId?: string; shaSign?: string }) => void;
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
  contactFirstName,
  pitchedAt,
  instructionReady,
  onNext,
  onPaymentData,
}) => {
  const [flexUrl, setFlexUrl] = useState<string | null>(preloadFlexUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expiryText, setExpiryText] = useState('');

  const formatAmount = (amt: number) => {
    const hasDecimals = Math.floor(amt) !== amt;
    return amt.toLocaleString('en-GB', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    });
  };
  
  if (!instructionReady) {
    return (
      <div className="payment-section">
        <div className="form-container apple-form">
          <p>Setting up your instruction...</p>
          <div className="button-group">
            <button type="button" className="btn secondary" onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!pitchedAt) return;
    const pitchDate = new Date(pitchedAt);
    const expiry = new Date(pitchDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const update = () => {
      const now = new Date();
      let diff = expiry.getTime() - now.getTime();
      if (diff < 0) diff = 0;
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      setExpiryText(`${days}d ${hours}h`);
    };

    update();
    const timer = setInterval(update, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [pitchedAt]);

  const submitToIframe = () => {
    setSubmitting(true);
    iframeRef.current?.contentWindow?.postMessage({ flexMsg: 'submit' }, '*');
  };
  // min-height fallback

  /* Mark step 3 complete once *your* extra inputs are filled
     (you can remove this block if you rely solely on the gateway flow) */
  useEffect(() => {
    const complete = Object.values(paymentDetails).every(v => v.trim());
    setIsComplete(complete);
  }, [paymentDetails, setIsComplete]);

  /* Message listener – resize + submission flow */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.flexMsg === 'size' && typeof e.data.height === 'number') {
        setIframeHeight(e.data.height);
      } else if (e.data.flexMsg === 'ready') {
        setFormReady(true);
      } else if (e.data.flexMsg === 'navigate' && typeof e.data.href === 'string') {
        if (e.data.href.startsWith(acceptUrl)) {
          try {
            const url = new URL(e.data.href);
            const aliasId = url.searchParams.get('Alias.AliasId') || undefined;
            const orderId = url.searchParams.get('Alias.OrderId') || undefined;
            const shaSign = url.searchParams.get('SHASIGN') || url.searchParams.get('SHASign') || undefined;
            if (onPaymentData) {
              onPaymentData({ aliasId, orderId, shaSign });
            }
            if (aliasId) sessionStorage.setItem('aliasId', aliasId);
            if (orderId) sessionStorage.setItem('orderId', orderId);
            if (shaSign) sessionStorage.setItem('shaSign', shaSign);
          } catch (err) {
            console.error('Failed to parse payment params', err);
          }
          setPaymentDone(true);
          setSubmitting(false);
          sessionStorage.setItem('paymentDone', 'true');
          localStorage.setItem('paymentSuccess', 'true');
        } else if (e.data.href.startsWith(exceptionUrl)) {
          setSubmitting(false);
          onError('SUBMIT_FAILED');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [acceptUrl, exceptionUrl, onError]);

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
        setFlexUrl(
          `https://mdepayments.epdq.co.uk/Tokenization/HostedPage?${query}`
        );
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
      <div className="combined-section payment-pane">
        <div className="service-summary-box">
          <div className="question-banner">Service Summary</div>
          <div className="service-summary-grid">
            {contactFirstName && (
              <div className="summary-item">
                <div className="summary-label">Contact</div>
                <div className="summary-value">{contactFirstName}</div>
              </div>
            )}
            <div className="summary-item">
              <div className="summary-label">
                Amount <span className="summary-note">(inc. VAT)</span>
              </div>
              <div className="summary-value">£{formatAmount(amount)}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Expiry</div>
              <div className="summary-value">{expiryText}</div>
            </div>
          </div>
          {contactFirstName && (
            <p className="pitch-description">
              {contactFirstName} will begin work on your {product} once your ID is verified and your matter is open. The fee is £{formatAmount(amount)} including VAT.
            </p>
          )}
        </div>

        <div className="payment-details">

        <div className="iframe-wrapper">
          {flexUrl ? (
            <iframe
              ref={iframeRef}
              title="FlexCheckout"
              src={flexUrl}
              style={{ width: '100%', height: `${iframeHeight || 300}px`, border: 0 }}
            />
          ) : (
            <div>{error ? `Error: ${error}` : 'Loading secure payment form…'}</div>
          )}
        </div>

       <div className="button-group">
         <button className="btn secondary" onClick={onBack}>
           Back
         </button>
         <button
           className="btn primary"
           onClick={submitToIframe}
           disabled={!flexUrl || !formReady || submitting || paymentDone}
         >
           Pay
         </button>
         {paymentDone && (
           <button className="btn primary" onClick={onNext}>
             Next
           </button>
         )}
       </div>
       </div>
      </div>
    </div>
  );
};

export default Payment;
