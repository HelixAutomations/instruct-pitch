import React, { useState, useEffect } from 'react';
import { FiCheck, FiDownload, FiMail, FiArrowLeft, FiCalendar, FiUser, FiCreditCard } from 'react-icons/fi';

interface PaymentReceiptProps {
  paymentId: string;
  dealData: {
    Amount: number;
    ServiceDescription: string;
    InstructionRef?: string;
    ProspectId?: number;
  };
  instructionRef: string;
  onNewPayment: () => void;
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = ({
  paymentId,
  dealData,
  instructionRef,
  onNewPayment
}) => {
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailSent, setEmailSent] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  useEffect(() => {
    // Simulate loading payment details
    const timer = setTimeout(() => {
      setPaymentDetails({
        id: paymentId,
        amount: dealData.Amount * 1.2, // Include VAT
        currency: 'GBP',
        status: 'succeeded',
        created: new Date(),
        paymentMethod: 'card',
        last4: '4242'
      });
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [paymentId, dealData.Amount]);

  const handleDownloadReceipt = () => {
    // Implementation for PDF download
    console.log('Downloading receipt for payment:', paymentId);
  };

  const handleEmailReceipt = () => {
    setEmailSent(true);
    // Implementation for email receipt
    console.log('Emailing receipt for payment:', paymentId);
  };

  if (isLoading) {
    return (
      <div className="receipt-loading">
        <div className="loading-spinner" />
        <p>Generating your receipt...</p>
      </div>
    );
  }

  return (
    <div className="payment-receipt">
      {/* Success Header */}
      <div className="receipt-header">
        <div className="success-icon">
          <FiCheck />
        </div>
        <h2>Payment Successful!</h2>
        <p>Your payment has been processed successfully</p>
      </div>

      {/* Receipt Details */}
      <div className="receipt-details">
        <div className="receipt-section">
          <h3>Payment Information</h3>
          
          <div className="detail-row">
            <span className="detail-label">
              <FiCreditCard />
              Payment ID
            </span>
            <span className="detail-value">{paymentId}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              <FiCalendar />
              Date & Time
            </span>
            <span className="detail-value">{formatDate(paymentDetails.created)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              <FiUser />
              Reference
            </span>
            <span className="detail-value">HLX-{instructionRef.includes('-') ? instructionRef.split('-').pop() : instructionRef}</span>
          </div>
        </div>

        <div className="receipt-section">
          <h3>Service Details</h3>
          
          <div className="service-breakdown">
            <div className="service-line">
              <span className="service-name">{dealData.ServiceDescription}</span>
              <span className="service-amount">{formatAmount(dealData.Amount)}</span>
            </div>
            
            <div className="service-line">
              <span className="service-name">VAT (20%)</span>
              <span className="service-amount">{formatAmount(dealData.Amount * 0.2)}</span>
            </div>
            
            <div className="service-line total-line">
              <span className="service-name">Total Paid</span>
              <span className="service-amount">{formatAmount(dealData.Amount * 1.2)}</span>
            </div>
          </div>
        </div>

        <div className="receipt-section">
          <h3>Payment Method</h3>
          
          <div className="payment-method-info">
            <FiCreditCard className="payment-method-icon" />
            <div className="payment-method-details">
              <span className="payment-method-type">Card Payment</span>
              <span className="payment-method-last4">•••• •••• •••• {paymentDetails.last4}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="receipt-actions">
        <div className="receipt-buttons">
          <button
            onClick={handleDownloadReceipt}
            className="receipt-button secondary"
          >
            <FiDownload />
            Download PDF
          </button>
          
          <button
            onClick={handleEmailReceipt}
            className={`receipt-button secondary ${emailSent ? 'sent' : ''}`}
            disabled={emailSent}
          >
            <FiMail />
            {emailSent ? 'Email Sent!' : 'Email Receipt'}
          </button>
        </div>

        <button
          onClick={onNewPayment}
          className="receipt-button primary"
        >
          <FiArrowLeft />
          Make Another Payment
        </button>
      </div>

      {/* Thank You Message */}
      <div className="thank-you-section">
        <h4>Thank you for your payment!</h4>
        <p>
          We've received your payment and will begin processing your instruction immediately. 
          You'll receive a confirmation email shortly with next steps.
        </p>
      </div>
    </div>
  );
};

export default PaymentReceipt;
