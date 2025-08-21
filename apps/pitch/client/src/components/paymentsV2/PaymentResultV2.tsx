/**
 * PaymentResultV2 Component
 * 
 * Comprehensive success/failure result screens for PaymentsV2
 * Features: Trust elements, detailed status, next steps, support contacts
 */

import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle, FiRefreshCw, FiMail, FiPhone, FiDownload, FiExternalLink } from 'react-icons/fi';

interface PaymentResultV2Props {
  status: 'success' | 'failed' | 'processing' | 'requires_action';
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  instructionRef?: string;
  legalService?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onContinue?: () => void;
  onDownloadReceipt?: () => void;
}

export const PaymentResultV2: React.FC<PaymentResultV2Props> = ({
  status,
  paymentIntentId,
  amount,
  currency = 'gbp',
  instructionRef,
  legalService,
  errorMessage,
  onRetry,
  onContinue,
  onDownloadReceipt
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Track time for processing status
  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const formatAmount = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(amount);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSuccessResult = () => (
    <div className="result-container success">
      <div className="result-header">
        <div className="result-icon success">
          <FiCheckCircle />
        </div>
        <h2>Payment Successful</h2>
        <p className="result-subtitle">Your legal service payment has been processed successfully</p>
      </div>

      <div className="result-details">
        <div className="detail-card">
          <h3>Payment Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Amount Paid:</span>
              <span className="value">{formatAmount(amount || 0, currency)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Payment ID:</span>
              <span className="value">{paymentIntentId}</span>
            </div>
            <div className="summary-item">
              <span className="label">Instruction Reference:</span>
              <span className="value">{instructionRef}</span>
            </div>
            <div className="summary-item">
              <span className="label">Legal Service:</span>
              <span className="value">{legalService}</span>
            </div>
            <div className="summary-item">
              <span className="label">Payment Date:</span>
              <span className="value">{new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          {onDownloadReceipt && (
            <button onClick={onDownloadReceipt} className="action-button secondary">
              <FiDownload />
              Download Receipt
            </button>
          )}
          {onContinue && (
            <button onClick={onContinue} className="action-button primary">
              Continue
            </button>
          )}
        </div>
      </div>

      <div className="next-steps">
        <h4>What happens next?</h4>
        <ul>
          <li>You will receive a confirmation email shortly</li>
          <li>Your legal team will be notified of the payment</li>
          <li>Work on your instruction will continue as scheduled</li>
          <li>A detailed receipt is available for your records</li>
        </ul>
      </div>
    </div>
  );

  const renderFailedResult = () => (
    <div className="result-container failed">
      <div className="result-header">
        <div className="result-icon failed">
          <FiXCircle />
        </div>
        <h2>Payment Failed</h2>
        <p className="result-subtitle">We were unable to process your payment</p>
      </div>

      <div className="result-details">
        <div className="error-card">
          <h3>Error Details</h3>
          <div className="error-message">
            <FiAlertTriangle className="error-icon" />
            <p>{errorMessage || 'Your payment could not be processed. This may be due to insufficient funds, an expired card, or a temporary issue with your bank.'}</p>
          </div>
        </div>

        <div className="retry-section">
          <h4>Try Again</h4>
          <p>Most payment issues can be resolved by:</p>
          <ul>
            <li>Checking your card details are correct</li>
            <li>Ensuring you have sufficient funds</li>
            <li>Trying a different payment method</li>
            <li>Contacting your bank if the issue persists</li>
          </ul>
          
          <div className="action-buttons">
            {onRetry && (
              <button onClick={onRetry} className="action-button primary">
                <FiRefreshCw />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProcessingResult = () => (
    <div className="result-container processing">
      <div className="result-header">
        <div className="result-icon processing">
          <FiClock />
        </div>
        <h2>Processing Payment</h2>
        <p className="result-subtitle">Please wait while we process your payment</p>
      </div>

      <div className="result-details">
        <div className="processing-card">
          <div className="processing-spinner">
            <div className="spinner"></div>
          </div>
          
          <div className="processing-info">
            <p>Processing time: {formatTime(timeElapsed)}</p>
            <p>Do not close this window or navigate away</p>
          </div>

          <div className="processing-steps">
            <div className="step completed">
              <FiCheckCircle />
              <span>Payment information received</span>
            </div>
            <div className="step active">
              <div className="step-spinner"></div>
              <span>Verifying with your bank</span>
            </div>
            <div className="step pending">
              <FiClock />
              <span>Completing transaction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRequiresActionResult = () => (
    <div className="result-container requires-action">
      <div className="result-header">
        <div className="result-icon requires-action">
          <FiAlertTriangle />
        </div>
        <h2>Additional Verification Required</h2>
        <p className="result-subtitle">Your bank requires additional verification to complete this payment</p>
      </div>

      <div className="result-details">
        <div className="action-card">
          <h3>3D Secure Authentication</h3>
          <p>Your bank has requested additional verification for this transaction. This is a security measure to protect your payment.</p>
          
          <div className="verification-steps">
            <ol>
              <li>You may receive an SMS with a verification code</li>
              <li>Or you may be redirected to your bank's verification page</li>
              <li>Complete the verification process</li>
              <li>Return to this page to complete your payment</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSupportContact = () => (
    <div className="support-section">
      <h4>Need Help?</h4>
      <div className="support-contacts">
        <div className="contact-method">
          <FiPhone className="contact-icon" />
          <div className="contact-info">
            <span className="contact-label">Phone Support:</span>
            <span className="contact-value">0203 950 3222</span>
          </div>
        </div>
        <div className="contact-method">
          <FiMail className="contact-icon" />
          <div className="contact-info">
            <span className="contact-label">Email Support:</span>
            <span className="contact-value">support@helixlaw.co.uk</span>
          </div>
        </div>
      </div>
      <p className="support-note">Our support team is available Monday to Friday, 9am to 6pm</p>
    </div>
  );

  const renderTrustFooter = () => (
    <div className="trust-footer">
      <div className="sra-info">
        <span className="sra-label">SRA ID:</span>
        <span className="sra-id">565557</span>
      </div>
      <div className="compliance-links">
        <a href="#" className="compliance-link">
          <FiExternalLink />
          Terms & Conditions
        </a>
        <a href="#" className="compliance-link">
          <FiExternalLink />
          Privacy Policy
        </a>
      </div>
    </div>
  );

  return (
    <div className="payment-result-v2">
      {status === 'success' && renderSuccessResult()}
      {status === 'failed' && renderFailedResult()}
      {status === 'processing' && renderProcessingResult()}
      {status === 'requires_action' && renderRequiresActionResult()}
      
      {(status === 'failed' || status === 'requires_action') && renderSupportContact()}
      {renderTrustFooter()}

      <style jsx>{`
        .payment-result-v2 {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }

        .result-container {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .result-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .result-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin-bottom: 1rem;
          font-size: 2.5rem;
        }

        .result-icon.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .result-icon.failed {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .result-icon.processing {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .result-icon.requires-action {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .result-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          color: #1e293b;
          font-weight: 600;
        }

        .result-subtitle {
          margin: 0;
          color: #64748b;
          font-size: 1.1rem;
        }

        .result-details {
          margin-bottom: 2rem;
        }

        .detail-card,
        .error-card,
        .processing-card,
        .action-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .detail-card h3,
        .error-card h3,
        .action-card h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
          font-weight: 600;
        }

        .summary-grid {
          display: grid;
          gap: 0.75rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .label {
          color: #64748b;
          font-weight: 500;
        }

        .value {
          color: #1e293b;
          font-weight: 600;
          text-align: right;
        }

        .error-message {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #991b1b;
        }

        .error-icon {
          font-size: 20px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .processing-card {
          text-align: center;
        }

        .processing-spinner {
          margin-bottom: 1.5rem;
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .processing-info {
          margin-bottom: 2rem;
        }

        .processing-info p {
          margin: 0.5rem 0;
          color: #64748b;
        }

        .processing-steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 6px;
        }

        .step.completed {
          background: #f0fdf4;
          color: #16a34a;
        }

        .step.active {
          background: #eff6ff;
          color: #2563eb;
        }

        .step.pending {
          background: #f8fafc;
          color: #94a3b8;
        }

        .step-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .verification-steps ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .verification-steps li {
          margin: 0.5rem 0;
          color: #64748b;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-button.primary {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: white;
        }

        .action-button.primary:hover {
          background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
          transform: translateY(-1px);
        }

        .action-button.secondary {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }

        .action-button.secondary:hover {
          background: #f8fafc;
        }

        .next-steps {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .next-steps h4 {
          margin: 0 0 1rem 0;
          color: #16a34a;
          font-weight: 600;
        }

        .next-steps ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .next-steps li {
          margin: 0.5rem 0;
          color: #166534;
        }

        .retry-section h4 {
          margin: 1rem 0 0.5rem 0;
          color: #1e293b;
          font-weight: 600;
        }

        .retry-section p,
        .retry-section ul {
          color: #64748b;
        }

        .retry-section ul {
          padding-left: 1.5rem;
        }

        .retry-section li {
          margin: 0.25rem 0;
        }

        .support-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .support-section h4 {
          margin: 0 0 1rem 0;
          color: #1e293b;
          font-weight: 600;
        }

        .support-contacts {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .contact-method {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .contact-icon {
          font-size: 18px;
          color: #3b82f6;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
        }

        .contact-label {
          font-size: 0.875rem;
          color: #64748b;
        }

        .contact-value {
          font-weight: 600;
          color: #1e293b;
        }

        .support-note {
          margin: 0;
          font-size: 0.875rem;
          color: #94a3b8;
        }

        .trust-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .sra-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sra-label {
          color: #64748b;
        }

        .sra-id {
          font-weight: 600;
          color: #1e293b;
        }

        .compliance-links {
          display: flex;
          gap: 1rem;
        }

        .compliance-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #3b82f6;
          text-decoration: none;
        }

        .compliance-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 640px) {
          .payment-result-v2 {
            padding: 1rem;
          }

          .result-container {
            padding: 1.5rem;
          }

          .action-buttons {
            flex-direction: column;
          }

          .trust-footer {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .compliance-links {
            justify-content: center;
          }

          .support-contacts {
            gap: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};