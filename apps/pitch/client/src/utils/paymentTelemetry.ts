/**
 * Payment Telemetry Service
 * 
 * Production telemetry and error handling for PaymentsV2
 * Provides analytics, error tracking, and performance monitoring
 */

interface PaymentEvent {
  event: string;
  paymentIntentId?: string;
  instructionRef?: string;
  amount?: number;
  currency?: string;
  error?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

interface ErrorEvent {
  error: string;
  stack?: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class PaymentTelemetryService {
  private sessionId: string;
  private startTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  private generateSessionId(): string {
    return 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Track payment flow events
   */
  trackEvent(event: PaymentEvent): void {
    try {
      const telemetryData = {
        ...event,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        source: 'payments_v2'
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Payment Telemetry:', telemetryData);
      }

      // Send to analytics service (placeholder)
      this.sendToAnalytics(telemetryData);

    } catch (error) {
      console.warn('Failed to track payment event:', error);
    }
  }

  /**
   * Track payment errors
   */
  trackError(error: ErrorEvent): void {
    try {
      const errorData = {
        ...error,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        source: 'payments_v2'
      };

      // Log to console
      console.error('❌ Payment Error:', errorData);

      // Send to error tracking service (placeholder)
      this.sendToErrorTracking(errorData);

    } catch (err) {
      console.warn('Failed to track payment error:', err);
    }
  }

  /**
   * Track payment flow performance
   */
  trackPerformance(step: string, duration: number): void {
    this.trackEvent({
      event: 'performance_metric',
      metadata: {
        step,
        duration,
        sessionDuration: Date.now() - this.startTime
      }
    });
  }

  /**
   * Track payment attempt
   */
  trackPaymentAttempt(amount: number, currency: string, instructionRef: string): void {
    this.trackEvent({
      event: 'payment_attempt',
      amount,
      currency,
      instructionRef
    });
  }

  /**
   * Track payment success
   */
  trackPaymentSuccess(paymentIntentId: string, amount: number, currency: string, instructionRef: string, duration: number): void {
    this.trackEvent({
      event: 'payment_success',
      paymentIntentId,
      amount,
      currency,
      instructionRef,
      duration
    });
  }

  /**
   * Track payment failure
   */
  trackPaymentFailure(error: string, amount: number, currency: string, instructionRef: string): void {
    this.trackEvent({
      event: 'payment_failure',
      amount,
      currency,
      instructionRef,
      error
    });

    this.trackError({
      error: 'Payment failure: ' + error,
      severity: 'high',
      context: {
        amount,
        currency,
        instructionRef
      }
    });
  }

  /**
   * Track 3D Secure events
   */
  track3DSecure(status: 'initiated' | 'completed' | 'failed', paymentIntentId: string): void {
    this.trackEvent({
      event: '3d_secure_' + status,
      paymentIntentId,
      metadata: {
        securityLevel: '3d_secure'
      }
    });
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(action: string, context?: Record<string, any>): void {
    this.trackEvent({
      event: 'user_interaction',
      metadata: {
        action,
        ...context
      }
    });
  }

  /**
   * Track page load performance
   */
  trackPageLoad(): void {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationTiming) {
      this.trackEvent({
        event: 'page_load',
        metadata: {
          loadTime: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
          domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
          firstPaint: this.getFirstPaint()
        }
      });
    }
  }

  private getFirstPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  private sendToAnalytics(data: any): void {
    // In production, this would send to your analytics service
    // Examples: Google Analytics, Mixpanel, Amplitude, etc.
    
    // For now, we'll use a mock implementation
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', data.event, {
        custom_parameter_1: data.sessionId,
        custom_parameter_2: data.instructionRef,
        value: data.amount
      });
    }
  }

  private sendToErrorTracking(data: any): void {
    // In production, this would send to your error tracking service
    // Examples: Sentry, Rollbar, Bugsnag, etc.
    
    // For now, we'll use a mock implementation
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(data.error), {
        tags: {
          component: 'payments_v2',
          severity: data.severity
        },
        extra: data.context
      });
    }
  }

  /**
   * Get session summary for debugging
   */
  getSessionSummary(): any {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      url: window.location.href
    };
  }
}

// Export singleton instance
export const paymentTelemetry = new PaymentTelemetryService();

// Declare global gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}