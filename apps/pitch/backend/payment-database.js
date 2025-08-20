/**
 * Payment Database Service
 * 
 * Handles all database operations related to payments including:
 * - Payment record creation and updates
 * - Status tracking
 * - Payment history
 */

const { getSqlClient } = require('./sqlClient');

class PaymentDatabase {
  /**
   * Initialize payment tables if they don't exist
   */
  async initializeTables() {
    const { getSqlPool } = require('./sqlClient');
    
    try {
      const pool = await getSqlPool();
      // Create payments table
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='payments' AND xtype='U')
        CREATE TABLE payments (
          id NVARCHAR(50) PRIMARY KEY,
          payment_intent_id NVARCHAR(100) UNIQUE,
      amount DECIMAL(10,2) NOT NULL, -- major units (legacy)
      amount_minor INT NULL,         -- minor units (new canonical)
          currency NVARCHAR(3) NOT NULL DEFAULT 'GBP',
          payment_status NVARCHAR(20) NOT NULL DEFAULT 'processing',
          internal_status NVARCHAR(20) NOT NULL DEFAULT 'pending',
          client_secret NVARCHAR(255),
          metadata NVARCHAR(MAX),
          instruction_ref NVARCHAR(50),
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE(),
          webhook_events NVARCHAR(MAX) DEFAULT '[]'
        )
      `);

    // Backfill column if table pre-existed
    await pool.request().query(`IF COL_LENGTH('payments','amount_minor') IS NULL ALTER TABLE payments ADD amount_minor INT NULL`);

      // Create index for faster lookups
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_payments_payment_intent_id')
        CREATE INDEX IX_payments_payment_intent_id ON payments(payment_intent_id)
      `);

      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_payments_instruction_ref')
        CREATE INDEX IX_payments_instruction_ref ON payments(instruction_ref)
      `);

      console.log('✅ Payment database tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize payment tables:', error);
      throw error;
    }
  }

  /**
   * Create a new payment record
   * @param {Object} payment - Payment details
   * @returns {Object} Created payment record
   */
  async createPayment(payment) {
    const { getSqlPool } = require('./sqlClient');
    const sql = require('mssql');
    
    try {
      const {
        id,
        paymentIntentId,
        amount,          // major units
        amountMinor,      // minor units (canonical)
        currency = 'GBP',
        clientSecret,
        metadata = {},
        instructionRef
      } = payment;

      const pool = await getSqlPool();
      const result = await pool.request()
        .input('id', sql.NVarChar, id)
        .input('paymentIntentId', sql.NVarChar, paymentIntentId)
        .input('amount', sql.Decimal(10,2), amount)
        .input('amountMinor', sql.Int, amountMinor)
        .input('currency', sql.NVarChar, currency.toUpperCase())
        .input('clientSecret', sql.NVarChar, clientSecret)
        .input('metadata', sql.NVarChar, JSON.stringify(metadata))
        .input('instructionRef', sql.NVarChar, instructionRef)
        .query(`
          INSERT INTO payments (
            id, payment_intent_id, amount, amount_minor, currency, 
            client_secret, metadata, instruction_ref,
            payment_status, internal_status
          )
          OUTPUT INSERTED.*
          VALUES (
            @id, @paymentIntentId, @amount, @amountMinor, @currency,
            @clientSecret, @metadata, @instructionRef,
            'processing', 'pending'
          )
        `);

      console.log(`✅ Created payment record: ${id}`);
      return result.recordset[0];
    } catch (error) {
      console.error('❌ Failed to create payment:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   * @param {string} paymentIntentId - Stripe PaymentIntent ID
   * @param {Object} status - Status update
   * @param {string} webhookEvent - Webhook event data
   * @returns {Object} Updated payment record
   */
  async updatePaymentStatus(paymentIntentId, status, webhookEvent = null) {
    const { getSqlPool } = require('./sqlClient');
    const sql = require('mssql');
    
    try {
      const { payment_status, internal_status } = status;
      
      // Get current webhook events
      const pool = await getSqlPool();
      const current = await pool.request()
        .input('paymentIntentId', sql.NVarChar, paymentIntentId)
        .query(`
          SELECT webhook_events FROM payments WHERE payment_intent_id = @paymentIntentId
        `);

      let webhookEvents = [];
      if (current.recordset.length > 0) {
        try {
          webhookEvents = JSON.parse(current.recordset[0].webhook_events || '[]');
        } catch (e) {
          webhookEvents = [];
        }
      }

      // Add new webhook event if provided
      if (webhookEvent) {
        webhookEvents.push({
          id: webhookEvent.id,
          type: webhookEvent.type,
          created: webhookEvent.created,
          timestamp: new Date().toISOString()
        });
      }

      const result = await pool.request()
        .input('paymentIntentId2', sql.NVarChar, paymentIntentId)
        .input('paymentStatus', sql.NVarChar, payment_status)
        .input('internalStatus', sql.NVarChar, internal_status)
        .input('webhookEvents', sql.NVarChar, JSON.stringify(webhookEvents))
        .query(`
          UPDATE payments 
          SET payment_status = @paymentStatus,
              internal_status = @internalStatus,
              webhook_events = @webhookEvents,
              updated_at = GETUTCDATE()
          OUTPUT INSERTED.*
          WHERE payment_intent_id = @paymentIntentId2
        `);

      if (result.recordset.length === 0) {
        throw new Error(`Payment not found: ${paymentIntentId}`);
      }

      console.log(`✅ Updated payment status: ${paymentIntentId} -> ${payment_status}/${internal_status}`);
      return result.recordset[0];
    } catch (error) {
      console.error('❌ Failed to update payment status:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   * @param {string} paymentId - Internal payment ID
   * @returns {Object} Payment record
   */
  async getPaymentById(paymentId) {
    const { getSqlPool } = require('./sqlClient');
    const sql = require('mssql');
    
    try {
      const pool = await getSqlPool();
      const result = await pool.request()
        .input('paymentId', sql.NVarChar, paymentId)
        .query(`
          SELECT * FROM payments WHERE id = @paymentId
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      const payment = result.recordset[0];
      
      // Parse JSON fields
      try {
        payment.metadata = JSON.parse(payment.metadata || '{}');
        payment.webhook_events = JSON.parse(payment.webhook_events || '[]');
      } catch (e) {
        payment.metadata = {};
        payment.webhook_events = [];
      }

      return payment;
    } catch (error) {
      console.error('❌ Failed to get payment by ID:', error);
      throw error;
    }
  }

  /**
   * Get payment by PaymentIntent ID
   * @param {string} paymentIntentId - Stripe PaymentIntent ID
   * @returns {Object} Payment record
   */
  async getPaymentByIntentId(paymentIntentId) {
    const { getSqlPool } = require('./sqlClient');
    const sql = require('mssql');
    
    try {
      const pool = await getSqlPool();
      const result = await pool.request()
        .input('paymentIntentId', sql.NVarChar, paymentIntentId)
        .query(`
          SELECT * FROM payments WHERE payment_intent_id = @paymentIntentId
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      const payment = result.recordset[0];
      
      // Parse JSON fields
      try {
        payment.metadata = JSON.parse(payment.metadata || '{}');
        payment.webhook_events = JSON.parse(payment.webhook_events || '[]');
      } catch (e) {
        payment.metadata = {};
        payment.webhook_events = [];
      }

      return payment;
    } catch (error) {
      console.error('❌ Failed to get payment by intent ID:', error);
      throw error;
    }
  }

  /**
   * Get payments for an instruction
   * @param {string} instructionRef - Instruction reference
   * @returns {Array} Payment records
   */
  async getPaymentsByInstruction(instructionRef) {
    const { getSqlPool } = require('./sqlClient');
    const sql = require('mssql');
    
    try {
      const pool = await getSqlPool();
      const result = await pool.request()
        .input('instructionRef', sql.NVarChar, instructionRef)
        .query(`
          SELECT * FROM payments 
          WHERE instruction_ref = @instructionRef
          ORDER BY created_at DESC
        `);

      return result.recordset.map(payment => {
        try {
          payment.metadata = JSON.parse(payment.metadata || '{}');
          payment.webhook_events = JSON.parse(payment.webhook_events || '[]');
        } catch (e) {
          payment.metadata = {};
          payment.webhook_events = [];
        }
        return payment;
      });
    } catch (error) {
      console.error('❌ Failed to get payments by instruction:', error);
      throw error;
    }
  }
}

// Export singleton instance
const paymentDatabase = new PaymentDatabase();
module.exports = paymentDatabase;
