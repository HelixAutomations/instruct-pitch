/**
 * Payment Error Handler
 * 
 * Centralized error handling for PaymentsV2 with user-friendly messages
 * and proper error categorization for debugging and support
 */

import { paymentTelemetry } from './paymentTelemetry';

interface PaymentError {
  type: 'card_error' | 'validation_error' | 'api_error' | 'network_error' | 'rate_limit_error' | 'authentication_error' | 'processing_error' | 'unknown_error';
  code?: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retry: boolean;
  supportContact: boolean;
}

export class PaymentErrorHandler {
  
  /**
   * Process and categorize payment errors
   */
  static handleError(error: any, context?: Record<string, any>): PaymentError {
    let processedError: PaymentError;

    // Handle Stripe errors
    if (error?.type) {
      processedError = this.handleStripeError(error);
    }
    // Handle API errors
    else if (error?.response || error?.status) {
      processedError = this.handleApiError(error);
    }
    // Handle network errors
    else if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
      processedError = this.handleNetworkError(error);
    }
    // Handle unknown errors
    else {
      processedError = this.handleUnknownError(error);
    }

    // Track error for telemetry
    paymentTelemetry.trackError({
      error: processedError.message,
      stack: error?.stack,
      context: {
        type: processedError.type,
        code: processedError.code,
        severity: processedError.severity,
        ...context
      },
      severity: processedError.severity
    });

    return processedError;
  }

  /**
   * Handle Stripe-specific errors
   */
  private static handleStripeError(error: any): PaymentError {
    const { type, code, message, decline_code } = error;

    switch (type) {
      case 'card_error':
        return this.handleCardError(code, decline_code, message);
      
      case 'validation_error':
        return {
          type: 'validation_error',
          code,
          message,
          userMessage: 'Please check your payment details and try again.',
          severity: 'medium',
          retry: true,
          supportContact: false
        };

      case 'rate_limit_error':
        return {
          type: 'rate_limit_error',
          code,
          message,
          userMessage: 'Too many payment attempts. Please wait a moment and try again.',
          severity: 'medium',
          retry: true,
          supportContact: false
        };

      case 'api_error':
        return {
          type: 'api_error',
          code,
          message,
          userMessage: 'We\'re experiencing technical difficulties. Please try again or contact support.',
          severity: 'high',
          retry: true,
          supportContact: true
        };

      case 'authentication_error':
        return {
          type: 'authentication_error',
          code,
          message,
          userMessage: 'Payment authentication failed. Please refresh the page and try again.',
          severity: 'high',
          retry: false,
          supportContact: true
        };

      default:
        return {
          type: 'processing_error',
          code,
          message,
          userMessage: 'Payment processing failed. Please try again or contact support.',
          severity: 'high',
          retry: true,
          supportContact: true
        };
    }
  }

  /**
   * Handle card-specific errors with detailed messaging
   */
  private static handleCardError(code: string, decline_code: string, message: string): PaymentError {
    const commonCardErrors: Record<string, Partial<PaymentError>> = {
      // Insufficient funds
      'insufficient_funds': {
        userMessage: 'Your card has insufficient funds. Please use a different payment method.',
        severity: 'medium',
        retry: true,
        supportContact: false
      },
      
      // Card declined
      'generic_decline': {
        userMessage: 'Your card was declined. Please contact your bank or try a different payment method.',
        severity: 'medium',
        retry: true,
        supportContact: false
      },

      // Expired card
      'expired_card': {
        userMessage: 'Your card has expired. Please use a different payment method.',
        severity: 'medium',
        retry: true,
        supportContact: false
      },

      // Incorrect CVC
      'incorrect_cvc': {
        userMessage: 'The security code is incorrect. Please check and try again.',
        severity: 'low',
        retry: true,
        supportContact: false
      },

      // Incorrect number
      'incorrect_number': {
        userMessage: 'The card number is incorrect. Please check and try again.',
        severity: 'low',
        retry: true,
        supportContact: false
      },

      // Processing error
      'processing_error': {
        userMessage: 'We couldn\'t process your payment. Please try again or contact your bank.',
        severity: 'medium',
        retry: true,
        supportContact: true
      },

      // Card not supported
      'card_not_supported': {
        userMessage: 'This card type is not supported. Please use a different payment method.',
        severity: 'medium',
        retry: true,
        supportContact: false
      }
    };

    const errorInfo = commonCardErrors[code] || commonCardErrors[decline_code] || {
      userMessage: 'Your card was declined. Please try a different payment method or contact your bank.',
      severity: 'medium' as const,
      retry: true,
      supportContact: true
    };

    return {
      type: 'card_error',
      code,
      message,
      userMessage: errorInfo.userMessage!,
      severity: errorInfo.severity!,
      retry: errorInfo.retry!,
      supportContact: errorInfo.supportContact!
    };
  }

  /**
   * Handle API and server errors
   */
  private static handleApiError(error: any): PaymentError {
    const status = error.response?.status || error.status;
    const responseData = error.response?.data;

    switch (status) {
      case 400:
        return {
          type: 'validation_error',
          code: 'invalid_request',
          message: responseData?.error || 'Invalid request',
          userMessage: 'Please check your payment details and try again.',
          severity: 'medium',
          retry: true,
          supportContact: false
        };

      case 401:
        return {
          type: 'authentication_error',
          code: 'unauthorized',
          message: 'Authentication failed',
          userMessage: 'Payment authentication failed. Please refresh the page and try again.',
          severity: 'high',
          retry: false,
          supportContact: true
        };

      case 402:
        return {
          type: 'card_error',
          code: 'payment_required',
          message: 'Payment required',
          userMessage: 'Payment could not be processed. Please try a different payment method.',
          severity: 'high',
          retry: true,
          supportContact: true
        };

      case 403:
        return {
          type: 'authentication_error',
          code: 'forbidden',
          message: 'Access forbidden',
          userMessage: 'Payment access denied. Please contact support.',
          severity: 'high',
          retry: false,
          supportContact: true
        };

      case 404:
        return {
          type: 'api_error',
          code: 'not_found',
          message: 'Payment service not found',
          userMessage: 'Payment service temporarily unavailable. Please try again later.',
          severity: 'high',
          retry: true,
          supportContact: true
        };

      case 429:
        return {
          type: 'rate_limit_error',
          code: 'too_many_requests',
          message: 'Too many requests',
          userMessage: 'Too many payment attempts. Please wait a moment and try again.',
          severity: 'medium',
          retry: true,
          supportContact: false
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'api_error',
          code: 'server_error',
          message: 'Server error',
          userMessage: 'We\'re experiencing technical difficulties. Please try again in a few minutes.',
          severity: 'critical',
          retry: true,
          supportContact: true
        };

      default:
        return {
          type: 'api_error',
          code: 'unknown_api_error',
          message: error.message || 'Unknown API error',
          userMessage: 'Payment processing failed. Please try again or contact support.',
          severity: 'high',
          retry: true,
          supportContact: true
        };
    }
  }

  /**
   * Handle network connectivity errors
   */
  private static handleNetworkError(error: any): PaymentError {
    return {
      type: 'network_error',
      code: 'network_error',
      message: error.message || 'Network connection failed',
      userMessage: 'Network connection failed. Please check your internet connection and try again.',
      severity: 'medium',
      retry: true,
      supportContact: false
    };
  }

  /**
   * Handle unknown or unexpected errors
   */
  private static handleUnknownError(error: any): PaymentError {
    return {
      type: 'unknown_error',
      code: 'unknown',
      message: error.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      severity: 'high',
      retry: true,
      supportContact: true
    };
  }

  /**
   * Get support contact information based on error type
   */
  static getSupportInfo(errorType: string): { phone: string; email: string; hours: string } {
    return {
      phone: '0203 950 3222',
      email: 'support@helixlaw.co.uk',
      hours: 'Monday to Friday, 9am to 6pm'
    };
  }

  /**
   * Generate error report for support
   */
  static generateErrorReport(error: PaymentError, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const sessionSummary = paymentTelemetry.getSessionSummary();
    
    return `
PAYMENT ERROR REPORT
Generated: ${timestamp}

Error Details:
- Type: ${error.type}
- Code: ${error.code || 'N/A'}
- Message: ${error.message}
- Severity: ${error.severity}

Session Information:
- Session ID: ${sessionSummary.sessionId}
- Duration: ${sessionSummary.duration}ms
- URL: ${sessionSummary.url}

Context:
${context ? JSON.stringify(context, null, 2) : 'No additional context'}

User Agent: ${navigator.userAgent}
    `.trim();
  }
}