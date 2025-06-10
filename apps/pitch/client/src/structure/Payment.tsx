import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import '../styles/payments.css';
import '../styles/SummaryReview.css';
import InfoPopover from '../components/InfoPopover';

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
  onPaymentData?: (data: { aliasId?: string; orderId?: string; shaSign?: string; paymentMethod?: 'card' | 'bank' }) => void;
  style?: React.CSSProperties;
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
  style,
}) => {
  const [flexUrl, setFlexUrl] = useState<string | null>(preloadFlexUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expiryText, setExpiryText] = useState('');
  const [stage, setStage] = useState<'choose' | 'card' | 'bank'>('choose');
  const [choice, setChoice] = useState<'card' | 'bank' | null>(null);
  const [bankConfirmed, setBankConfirmed] = useState(false);

  useEffect(() => {
    if (contactFirstName) {
      sessionStorage.setItem('feeEarnerName', contactFirstName);
    }
  }, [contactFirstName]);

  // Restore payment state if user returns to this step after paying
  useEffect(() => {
    if (sessionStorage.getItem('paymentDone') === 'true') {
      setPaymentDone(true);
      setIsComplete(true);
    }
  }, [setIsComplete]);

  useEffect(() => {
    if (sessionStorage.getItem('paymentDone') === 'true') {
      const method = sessionStorage.getItem('paymentMethod');
      if (method === 'card') {
        setStage('card');
      } else if (method === 'bank') {
        setStage('bank');
        setBankConfirmed(true);
      }
    }
  }, []);

  const formatAmount = (amt: number) => {
    const hasDecimals = Math.floor(amt) !== amt;
    return amt.toLocaleString('en-GB', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  };

  const bankRef = orderId.replace(/^HLX-/, '');
  
  let content;

  if (!instructionReady) {
    content = (
      <div className="form-container apple-form">
        <p>Setting up your instruction...</p>
        <div className="button-group">
          <button type="button" className="btn secondary" onClick={onBack}>
            Back
          </button>
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
              onPaymentData({ aliasId, orderId, shaSign, paymentMethod: 'card' });
            }
            sessionStorage.setItem('paymentMethod', 'card');
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
        if (onPaymentData) onPaymentData({ orderId, shaSign: json.shasign, paymentMethod: 'card' });
        sessionStorage.setItem('paymentMethod', 'card');
      } catch (err) {
        console.error(err);
        setError('Failed to load payment form. Please try again.');
        onError('FLEX_URL_FAILED');
      }
    };

    generateShasignUrl();
  }, [pspid, orderId, acceptUrl, exceptionUrl, preloadFlexUrl, onError]);

  if (!content && instructionReady) {
    let paymentDetailsContent;

    if (stage === 'choose') {
      paymentDetailsContent = (
        <div className="form-container apple-form">
          <div className="form-group step1-centered question-container">
            <label id="payment-method-label" className="question-banner">
              How would you like to pay?
            </label>
            <div
              className="modern-toggle-group"
              role="radiogroup"
              aria-labelledby="payment-method-label"
            >
              <button
                type="button"
                className={`modern-toggle-button ${choice === 'card' ? 'active' : ''}`}
                onClick={() => setChoice('card')}
              >
                Card
              </button>
              <button
                type="button"
                className={`modern-toggle-button ${choice === 'bank' ? 'active' : ''}`}
                onClick={() => setChoice('bank')}
              >
                Bank Transfer
              </button>
            </div>
          </div>
          <div className="button-group">
            <button type="button" className="btn secondary" onClick={onBack}>
              Back
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!choice}
              onClick={() => {
                if (!choice) return;
                if (onPaymentData) onPaymentData({ paymentMethod: choice });
                sessionStorage.setItem('paymentMethod', choice);
                setStage(choice);
              }}
            >
              Next
            </button>
          </div>
        </div>
      );
    } else if (stage === 'card') {
      paymentDetailsContent = (
        <>
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
            <button
              className="btn secondary"
              onClick={() => setStage('choose')}
              disabled={paymentDone}
            >
              Back
            </button>
            {paymentDone ? (
              <button className="btn primary" onClick={onNext}>
                Next
              </button>
            ) : (
              <button
                className="btn primary"
                onClick={submitToIframe}
                disabled={!flexUrl || !formReady || submitting}
              >
                Pay
              </button>
            )}
          </div>
        </>
      );
    } else {
      paymentDetailsContent = (
        <>
          <p>
            Please pay £{formatAmount(amount)} on account of costs, using our account details below:
          </p>
          <div className="question-container">
            <div className="copy-box">
              <p>
                <strong>Helix Law General Client Account</strong>
              </p>
              <p>Barclays Bank</p>
              <p>Account Number: 93472434</p>
              <p>Sort Code: 20-27-91</p>
              <p>Reference: {bankRef}</p>
            </div>
          </div>
          <p>Please ensure to quote the above reference so that we promptly identify your payment.</p>
          <div className="summary-confirmation">
            <label className="modern-checkbox-label">
              <input
                type="checkbox"
                className="modern-checkbox-input"
                checked={bankConfirmed}
                onChange={(e) => setBankConfirmed(e.target.checked)}
              />
              <span className="modern-checkbox-custom" aria-hidden="true">
                <svg className="checkbox-tick" viewBox="0 0 24 24" width="26" height="26">
                  <polyline
                    className="tick"
                    points="5,13 10,18 19,7"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="modern-checkbox-text">
                I confirm I have made the bank transfer.
              </span>
            </label>
          </div>
          <div className="button-group">
            <button className="btn secondary" onClick={() => setStage('choose')}>
              Back
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setPaymentDone(true);
                setIsComplete(true);
                sessionStorage.setItem('paymentDone', 'true');

                sessionStorage.setItem('paymentMethod', 'bank');
                localStorage.setItem('paymentSuccess', 'true');
                if (onPaymentData) onPaymentData({ paymentMethod: 'bank' });
                onNext();
              }}
              disabled={!bankConfirmed}
            >
              Next
            </button>
          </div>
        </>
      );
    }
    content = (
      <div className="combined-section payment-pane">
        <div className="service-summary-box">
          <div className="question-banner">Service Summary</div>
          <div className="service-summary-grid">
            {contactFirstName && (
              <div className="summary-item">
              <div className="summary-label">Solicitor</div>
                <div className="summary-value">{contactFirstName}</div>
              </div>
            )}
            <div className="summary-item">
              <div className="summary-label">
                Expires in{' '}
                <InfoPopover text="Please note that this fee quotation is subject to a time limit and must be accepted before the stated expiry date to remain valid." />
              </div>
              <div className="summary-value">{expiryText}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">
                Amount <span className="summary-note">(inc. VAT)</span>
              </div>
              <div className="summary-value">£{formatAmount(amount)}</div>
            </div>
          </div>
          {contactFirstName && (
            <p className="pitch-description">
              {contactFirstName} will begin work on {product} once your ID is verified and your matter is open. The fee is £{formatAmount(amount)} including VAT.
            </p>
          )}
        </div>

        <div className="payment-details">

          {paymentDetailsContent}
        </div>
      </div>
    );
  }

  return <div className="payment-section" style={style}>{content}</div>;
};

export default Payment;
