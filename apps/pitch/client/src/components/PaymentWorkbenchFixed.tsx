/**
 * Payment Components Workbench
 * 
 * Development-only component to compare all payment forms side by side
 * Only available in development mode (localhost)
 */

import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import './PaymentWorkbench.css';

// Import all payment components for comparison
import { PaymentForm } from './PaymentForm';
import { PaymentFormV2 } from './paymentsV2/PaymentFormV2';
import ModernPaymentForm from './premium/ModernPaymentForm';
import { PaymentFlowV2 } from './paymentsV2/PaymentFlowV2Complete';

// Initialize Stripe for components that need it
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const PaymentWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'modern' | 'v2-form' | 'v2-flow' | 'legacy-form'>('modern');

  // Sample data for testing
  const sampleData = {
    amount: 15000, // £150.00
    currency: 'gbp' as const,
    instructionRef: 'INS-WORKBENCH-001',
    metadata: {
      source: 'workbench_testing',
      product: 'Legal Services Testing',
      workType: 'Property Purchase',
      contactFirstName: 'John'
    }
  };

  const handleSuccess = (paymentIntentId: string) => {
    console.log('✅ Workbench Payment Success:', paymentIntentId);
    alert(`Payment successful! ID: ${paymentIntentId}`);
  };

  const handleError = (error: string) => {
    console.error('❌ Workbench Payment Error:', error);
    alert(`Payment error: ${error}`);
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="payment-workbench">
      <div className="workbench-header">
        <h1>🔧 Payment Components Workbench</h1>
        <p>Development tool to compare all payment form implementations</p>
      </div>

      <div className="workbench-tabs">
        <button 
          className={`tab ${activeTab === 'modern' ? 'active' : ''}`}
          onClick={() => setActiveTab('modern')}
        >
          🎯 ModernPaymentForm (CURRENT)
        </button>
        <button 
          className={`tab ${activeTab === 'v2-form' ? 'active' : ''}`}
          onClick={() => setActiveTab('v2-form')}
        >
          🔐 PaymentFormV2
        </button>
        <button 
          className={`tab ${activeTab === 'v2-flow' ? 'active' : ''}`}
          onClick={() => setActiveTab('v2-flow')}
        >
          🌊 PaymentFlowV2 (Complete)
        </button>
        <button 
          className={`tab ${activeTab === 'legacy-form' ? 'active' : ''}`}
          onClick={() => setActiveTab('legacy-form')}
        >
          📜 PaymentForm (Legacy)
        </button>
      </div>

      <div className="workbench-content">
        <div className="component-info">
          {activeTab === 'modern' && (
            <div className="info-card">
              <h3>🎯 ModernPaymentForm.tsx</h3>
              <p><strong>Status:</strong> ✅ Currently Active (used by PremiumCheckout)</p>
              <p><strong>Location:</strong> <code>components/premium/ModernPaymentForm.tsx</code></p>
              <p><strong>Features:</strong> Stripe Elements, modern styling, used in production flow</p>
              <p><strong>Usage:</strong> HomePage → PremiumCheckout → ModernPaymentForm</p>
            </div>
          )}

          {activeTab === 'v2-form' && (
            <div className="info-card">
              <h3>🔐 PaymentFormV2.tsx</h3>
              <p><strong>Status:</strong> ⚠️ Available but requires feature flag</p>
              <p><strong>Location:</strong> <code>components/paymentsV2/PaymentFormV2.tsx</code></p>
              <p><strong>Features:</strong> Full V2 implementation, enhanced UX, telemetry</p>
              <p><strong>Activation:</strong> Requires <code>VITE_PAYMENTS_UX_V2=true</code></p>
            </div>
          )}

          {activeTab === 'v2-flow' && (
            <div className="info-card">
              <h3>🌊 PaymentFlowV2Complete.tsx</h3>
              <p><strong>Status:</strong> ⚠️ Complete V2 flow with preflight</p>
              <p><strong>Location:</strong> <code>components/paymentsV2/PaymentFlowV2Complete.tsx</code></p>
              <p><strong>Features:</strong> Full orchestrated flow, preflight, trust elements</p>
              <p><strong>Activation:</strong> Requires <code>VITE_PAYMENTS_UX_V2=true</code></p>
            </div>
          )}

          {activeTab === 'legacy-form' && (
            <div className="info-card">
              <h3>📜 PaymentForm.tsx</h3>
              <p><strong>Status:</strong> 🚫 Legacy component, not in current flow</p>
              <p><strong>Location:</strong> <code>components/PaymentForm.tsx</code></p>
              <p><strong>Features:</strong> Basic Stripe integration, older styling</p>
              <p><strong>Usage:</strong> Previously used by PaymentExample</p>
              <p><strong>Note:</strong> Payment.tsx removed from workbench due to type conflicts</p>
            </div>
          )}
        </div>

        <div className="component-preview">
          <Elements stripe={stripePromise}>
            {activeTab === 'modern' && (
              <div className="preview-container">
                <h4>🎯 ModernPaymentForm Preview</h4>
                <ModernPaymentForm
                  amount={sampleData.amount}
                  currency={sampleData.currency}
                  instructionRef={sampleData.instructionRef}
                  onSuccess={handleSuccess}
                  onError={handleError}
                  onProcessingChange={(processing) => console.log('Processing:', processing)}
                />
              </div>
            )}

            {activeTab === 'v2-form' && (
              <div className="preview-container">
                <h4>🔐 PaymentFormV2 Preview</h4>
                <div className="note">⚠️ Requires client secret from backend - may not work in workbench</div>
                <PaymentFormV2
                  clientSecret="pi_test_client_secret_placeholder"
                  amount={sampleData.amount}
                  currency={sampleData.currency}
                  instructionRef={sampleData.instructionRef}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </div>
            )}

            {activeTab === 'v2-flow' && (
              <div className="preview-container">
                <h4>🌊 PaymentFlowV2 Complete Preview</h4>
                <div className="note">⚠️ Requires feature flag VITE_PAYMENTS_UX_V2=true</div>
                <PaymentFlowV2
                  amount={sampleData.amount}
                  currency={sampleData.currency}
                  instructionRef={sampleData.instructionRef}
                  legalService="Property Purchase Legal Services"
                  description="Complete legal service package for residential property purchase"
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </div>
            )}

            {activeTab === 'legacy-form' && (
              <div className="preview-container">
                <h4>📜 PaymentForm Legacy Preview</h4>
                <div className="note">⚠️ Legacy component - may have compatibility issues</div>
                <PaymentForm
                  amount={sampleData.amount}
                  currency={sampleData.currency}
                  instructionRef={sampleData.instructionRef}
                  metadata={sampleData.metadata}
                  onSuccess={(payment) => handleSuccess(payment.paymentId)}
                  onError={handleError}
                  onStatusUpdate={(status) => console.log('Status:', status)}
                />
              </div>
            )}
          </Elements>
        </div>
      </div>
    </div>
  );
};

export default PaymentWorkbench;
