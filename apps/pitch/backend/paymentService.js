/**
 * Payment Service
 * 
 * Helper functions for fetching payment data from the new Payments table
 * Used by email templates and other services that need payment information
 */

const { getSqlPool } = require('./sqlClient');

/**
 * Get payment data for an instruction reference
 * @param {string} instructionRef - The instruction reference (e.g., HLX-12345-ABCDE)
 * @returns {Promise<Object|null>} Payment data or null if not found
 */
async function getPaymentByInstructionRef(instructionRef) {
  try {
    const pool = await getSqlPool();
    const request = pool.request()
      .input('InstructionRef', instructionRef);

    const result = await request.query(`
      SELECT TOP 1
        PaymentIntentId,
        Amount,
        Currency,
        Status,
        Method,
        ReceiptUrl,
        CreatedAt,
        UpdatedAt
      FROM Payments 
      WHERE InstructionRef = @InstructionRef
      ORDER BY CreatedAt DESC
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error('❌ Error fetching payment data:', error);
    return null;
  }
}

/**
 * Get formatted payment amount for display
 * @param {Object} payment - Payment object
 * @returns {string} Formatted amount (e.g., "750.00")
 */
function formatPaymentAmount(payment) {
  if (!payment || payment.Amount == null) return '';
  return Number(payment.Amount).toFixed(2);
}

/**
 * Get payment status for display
 * @param {Object} payment - Payment object  
 * @returns {string} Human-readable status
 */
function getPaymentStatusDisplay(payment) {
  if (!payment) return '';
  
  switch (payment.Status) {
    case 'succeeded':
      return 'Succeeded';
    case 'processing':
      return 'Processing';
    case 'requires_action':
      return 'Requires Action';
    case 'failed':
      return 'Failed';
    default:
      return payment.Status || '';
  }
}

/**
 * Get payment method for display
 * @param {Object} payment - Payment object
 * @returns {string} Human-readable payment method
 */
function getPaymentMethodDisplay(payment) {
  if (!payment) return 'N/A';
  
  switch (payment.Method) {
    case 'card':
      return payment.Status === 'succeeded' ? 'Card payment Succeeded' : 'Card payment';
    case 'bank':
      return 'Bank transfer confirmed by client';
    default:
      return payment.Method || 'N/A';
  }
}

module.exports = {
  getPaymentByInstructionRef,
  formatPaymentAmount,
  getPaymentStatusDisplay,
  getPaymentMethodDisplay
};
