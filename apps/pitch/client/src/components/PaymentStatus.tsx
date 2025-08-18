/**
 * Payment Status Component
 * 
 * Displays payment status with real-time updates
 */

import React, { useState, useEffect } from 'react';
import { paymentService, PaymentStatus as PaymentStatusType } from '../utils/paymentService';
import './PaymentStatus.css';

interface PaymentStatusProps {
  paymentId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStatusChange?: (status: PaymentStatusType) => void;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  paymentId,
  autoRefresh = false,
  refreshInterval = 5000,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<PaymentStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchStatus = async () => {
    try {
      setError('');
      const paymentStatus = await paymentService.getPaymentStatus(paymentId);
      setStatus(paymentStatus);
      
      if (onStatusChange) {
        onStatusChange(paymentStatus);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payment status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [paymentId]);

  useEffect(() => {
    if (!autoRefresh || !status) return;

    // Don't auto-refresh if payment is in final state
    const isFinalized = 
      (status.paymentStatus === 'succeeded' && status.internalStatus === 'completed') ||
      status.paymentStatus === 'failed' ||
      status.internalStatus === 'failed';

    if (isFinalized) return;

    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, status]);

  if (loading) {
    return (
      <div className="payment-status loading">
        <div className="payment-status__spinner"></div>
        <p>Loading payment status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-status error">
        <p className="error-text">{error}</p>
        <button onClick={fetchStatus} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="payment-status error">
        <p>Payment not found</p>
      </div>
    );
  }

  const severity = paymentService.getStatusSeverity(status.paymentStatus, status.internalStatus);
  const statusText = paymentService.getStatusDisplayText(status.paymentStatus, status.internalStatus);

  return (
    <div className={`payment-status ${severity}`}>
      <div className="payment-status__header">
        <h3>Payment Status</h3>
        <div className={`status-badge status-badge--${severity}`}>
          {statusText}
        </div>
      </div>

      <div className="payment-status__details">
        <div className="detail-row">
          <span className="label">Payment ID:</span>
          <span className="value">{status.paymentId}</span>
        </div>
        
        <div className="detail-row">
          <span className="label">Amount:</span>
          <span className="value">{paymentService.formatAmount(status.amount, status.currency)}</span>
        </div>
        
        <div className="detail-row">
          <span className="label">Instruction:</span>
          <span className="value">{status.instructionRef}</span>
        </div>
        
        <div className="detail-row">
          <span className="label">Created:</span>
          <span className="value">{new Date(status.createdAt).toLocaleString()}</span>
        </div>
        
        {status.updatedAt !== status.createdAt && (
          <div className="detail-row">
            <span className="label">Updated:</span>
            <span className="value">{new Date(status.updatedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {status.webhookEvents.length > 0 && (
        <div className="payment-status__events">
          <h4>Payment Events</h4>
          <div className="events-list">
            {status.webhookEvents.map((event, index) => (
              <div key={event.id || index} className="event-item">
                <span className="event-type">{event.type}</span>
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {autoRefresh && (
        <div className="payment-status__footer">
          <p className="auto-refresh-notice">
            <span className="refresh-icon">🔄</span>
            Status updates automatically
          </p>
        </div>
      )}
    </div>
  );
};
