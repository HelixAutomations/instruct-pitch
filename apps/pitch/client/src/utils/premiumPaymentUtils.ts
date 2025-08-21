/**
 * Premium Payment Utilities
 * 
 * Handles premium payment flow redirects and success/failure routing
 */

import { PaymentStatus } from './paymentService';

/**
 * Redirects to the appropriate premium payment result page
 */
export function redirectToPremiumResult(
  instructionRef: string,
  paymentStatus: PaymentStatus,
  replace: boolean = true
) {
  const isSuccess = paymentStatus.paymentStatus === 'succeeded' && 
                   paymentStatus.internalStatus === 'completed';
  
  const baseRef = extractBaseRef(instructionRef);
  const targetPath = isSuccess 
    ? `/${baseRef}/success`
    : `/${baseRef}/failure`;

  // Store payment details for the result page
  const paymentData = {
    paymentId: paymentStatus.paymentId,
    amount: paymentStatus.amount,
    currency: paymentStatus.currency,
    instructionRef: paymentStatus.instructionRef,
    status: paymentStatus.paymentStatus,
    internalStatus: paymentStatus.internalStatus,
    timestamp: new Date().toISOString(),
  };

  // Store in sessionStorage for the result page to access
  const storageKey = isSuccess ? 'premium-payment-success' : 'premium-payment-failure';
  sessionStorage.setItem(storageKey, JSON.stringify(paymentData));

  // Navigate to result page
  if (replace) {
    window.location.replace(targetPath);
  } else {
    window.location.href = targetPath;
  }
}

/**
 * Extracts the base reference from an instruction reference for routing
 * e.g., "HLX-12345-ABCD-EFGH" -> "HLX-12345-ABCD-EFGH"
 * e.g., "12345-67890" -> "12345-67890"
 */
export function extractBaseRef(instructionRef: string): string {
  // For now, just return the full instruction ref
  // This can be enhanced if we need to extract just parts of it
  return instructionRef;
}

/**
 * Gets stored payment data for success/failure pages
 */
export function getStoredPaymentData(type: 'success' | 'failure'): any | null {
  try {
    const storageKey = `premium-payment-${type}`;
    const data = sessionStorage.getItem(storageKey);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to parse stored payment data:', error);
  }
  return null;
}

/**
 * Clears stored payment data after use
 */
export function clearStoredPaymentData(type: 'success' | 'failure') {
  const storageKey = `premium-payment-${type}`;
  sessionStorage.removeItem(storageKey);
}

/**
 * Checks if the current page is a premium payment flow
 */
export function isPremiumPaymentFlow(): boolean {
  // For now, always return true since we're using premium layout everywhere
  // This can be enhanced if we need to support legacy flows
  return true;
}

/**
 * Creates a return URL for continuing after payment
 */
export function createReturnUrl(instructionRef: string): string {
  const baseRef = extractBaseRef(instructionRef);
  return `/${baseRef}`;
}

/**
 * Handles payment completion with premium flow logic
 */
export function handlePremiumPaymentComplete(
  paymentStatus: PaymentStatus,
  instructionRef: string,
  onLegacyFlow?: (status: PaymentStatus) => void
) {
  if (isPremiumPaymentFlow()) {
    // Use premium redirect flow
    redirectToPremiumResult(instructionRef, paymentStatus);
  } else {
    // Fallback to legacy in-component handling
    onLegacyFlow?.(paymentStatus);
  }
}

/**
 * Enhanced error handling for premium payments
 */
export function getPremiumErrorMessage(paymentStatus: PaymentStatus): string {
  if (paymentStatus.paymentStatus === 'failed') {
    return 'Your payment could not be processed. Please check your payment details and try again.';
  }
  
  if (paymentStatus.internalStatus === 'failed') {
    return 'Payment was received but could not be processed. Our team has been notified and will contact you shortly.';
  }
  
  return 'An unexpected error occurred during payment processing. Please try again or contact support.';
}
