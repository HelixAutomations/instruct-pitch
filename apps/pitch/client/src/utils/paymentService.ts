/**
 * Payment Service
 * 
 * Handles all payment-related API calls
 */

export interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  instructionRef: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntentResponse {
  paymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface PaymentStatus {
  paymentId: string;
  paymentStatus: 'processing' | 'succeeded' | 'failed' | 'requires_action';
  internalStatus: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  instructionRef: string;
  createdAt: string;
  updatedAt: string;
  webhookEvents: Array<{
    id: string;
    type: string;
    created: number;
    timestamp: string;
  }>;
}

export interface InstructionPayments {
  instructionRef: string;
  payments: Array<{
    paymentId: string;
    paymentStatus: string;
    internalStatus: string;
    amount: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

class PaymentService {
  private baseUrl = '/api/payments';

  /**
   * Create a new PaymentIntent
   */
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      console.log('Creating payment intent:', request);
      
      const response = await fetch(`${this.baseUrl}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: PaymentIntentResponse = await response.json();
      console.log('✅ Payment intent created:', result.paymentId);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to create payment intent:', error);
      throw error;
    }
  }

  /**
   * Get payment status by ID
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${paymentId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: PaymentStatus = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Failed to get payment status:', error);
      throw error;
    }
  }

  /**
   * Get all payments for an instruction
   */
  async getInstructionPayments(instructionRef: string): Promise<InstructionPayments> {
    try {
      const response = await fetch(`${this.baseUrl}/instruction/${instructionRef}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: InstructionPayments = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Failed to get instruction payments:', error);
      throw error;
    }
  }

  /**
   * Poll payment status until completion
   */
  async pollPaymentStatus(
    paymentId: string,
    onUpdate?: (status: PaymentStatus) => void,
    maxAttempts = 30,
    intervalMs = 2000
  ): Promise<PaymentStatus> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getPaymentStatus(paymentId);
        
        if (onUpdate) {
          onUpdate(status);
        }

        // Check if payment is in final state
        if (
          (status.paymentStatus === 'succeeded' && status.internalStatus === 'completed') ||
          (status.paymentStatus === 'failed') ||
          (status.internalStatus === 'failed')
        ) {
          console.log(`✅ Payment ${paymentId} reached final state: ${status.paymentStatus}/${status.internalStatus}`);
          return status;
        }

        // If requires action, don't keep polling (user needs to complete 3DS)
        if (status.paymentStatus === 'requires_action') {
          console.log(`⚠️  Payment ${paymentId} requires user action`);
          return status;
        }

        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Polling payment status (${attempts}/${maxAttempts}): ${status.paymentStatus}/${status.internalStatus}`);
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.error('❌ Error polling payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    }

    throw new Error(`Payment status polling timed out after ${maxAttempts} attempts`);
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  /**
   * Get display text for payment status
   */
  getStatusDisplayText(paymentStatus: string, internalStatus: string): string {
    if (paymentStatus === 'succeeded' && internalStatus === 'completed') {
      return 'Payment completed successfully';
    }
    
    if (paymentStatus === 'succeeded' && internalStatus === 'failed') {
      return 'Payment received, processing failed';
    }
    
    if (paymentStatus === 'failed') {
      return 'Payment failed';
    }
    
    if (paymentStatus === 'requires_action') {
      return 'Authentication required';
    }
    
    if (paymentStatus === 'processing') {
      return 'Processing payment...';
    }
    
    return 'Payment status unknown';
  }

  /**
   * Get status severity for styling
   */
  getStatusSeverity(paymentStatus: string, internalStatus: string): 'success' | 'warning' | 'error' | 'info' {
    if (paymentStatus === 'succeeded' && internalStatus === 'completed') {
      return 'success';
    }
    
    if (paymentStatus === 'failed' || internalStatus === 'failed') {
      return 'error';
    }
    
    if (paymentStatus === 'requires_action') {
      return 'warning';
    }
    
    return 'info';
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
