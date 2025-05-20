import React, { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from 'react';
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
  workType,
}) => {
  const [flexUrl, setFlexUrl] = useState<string | null>(preloadFlexUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const complete = Object.values(paymentDetails).every(v => v.trim());
    setIsComplete(complete);
  }, [paymentDetails, setIsComplete]);

useEffect(() => {
  if (preloadFlexUrl) {
    setFlexUrl(preloadFlexUrl);
    return;
  }

  // Only run if orderId, pspid, etc. are present
  if (!pspid || !orderId || !acceptUrl || !exceptionUrl) return;

  const generateShasignUrl = async () => {
    const params: Record<string, string> = {
      'ACCOUNT.PSPID': pspid,
      'ALIAS.ORDERID': orderId,
      'PARAMETERS.ACCEPTURL': acceptUrl,
      'PARAMETERS.EXCEPTIONURL': exceptionUrl,
      'CARD.BRAND': 'VISA',
    };

    try {
      const response = await fetch('/pitch/get-shasign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.shasign) {
        throw new Error(`Invalid response: ${response.status} ${response.statusText}`);
      }

      const query = new URLSearchParams({ ...params, SHASIGN: result.shasign }).toString();
      const url = `https://mdepayments.epdq.co.uk/Tokenization/HostedPage?${query}`;
      setFlexUrl(url);
    } catch (err) {
      setError('Failed to load payment form. Please try again.');
      onError('FLEX_URL_FAILED');
    }
  };

  generateShasignUrl();
}, [pspid, orderId, acceptUrl, exceptionUrl, preloadFlexUrl, onError]);

  return (
    <div className="payment-section">
      <div className="secure-banner">🔒 Secure payment powered by Barclays</div>
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
      <div className="combined-section payment-details-section">
        <div className="group-header">
          <FaCreditCard className="header-icon" /> Payment Details
        </div>
        <div className="iframe-wrapper">
          {flexUrl ? (
            <iframe title="FlexCheckout" src={flexUrl} />
          ) : (
            <div>
              {error ? `Error: ${error}` : 'Loading secure payment form…'}
            </div>
          )}
        </div>
        <div className="button-group">
          <button className="form-button secondary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment;
