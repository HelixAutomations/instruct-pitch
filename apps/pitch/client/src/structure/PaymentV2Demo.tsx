/**
 * PaymentV2Demo Component
 * 
 * Demo page to showcase the new V2 payment components
 * Available at /payment-v2-demo for testing
 */

import React from 'react';
import { useFeatureFlag } from '../utils/featureFlags';
import { PaymentFlowV2 } from '../components/paymentsV2';

const PaymentV2Demo: React.FC = () => {
  const isV2Enabled = useFeatureFlag('PAYMENTS_UX_V2');

  const handleSuccess = (paymentIntentId: string) => {
    console.log('Payment successful:', paymentIntentId);
    alert(`Payment successful! ID: ${paymentIntentId}`);
  };

  const handleError = (error: string) => {
    console.error('Payment error:', error);
    alert(`Payment error: ${error}`);
  };

  if (!isV2Enabled) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        maxWidth: '600px', 
        margin: '2rem auto',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h2>Payment V2 Demo</h2>
        <p>Feature flag <code>PAYMENTS_UX_V2</code> is disabled.</p>
        <p>To enable, set <code>VITE_PAYMENTS_UX_V2=true</code> in your environment.</p>
        <p>Current feature flag status: <strong>{isV2Enabled ? 'Enabled' : 'Disabled'}</strong></p>
      </div>
    );
  }

  return (
    <div>
      <PaymentFlowV2
        amount={15000} // £150.00
        currency="gbp"
        instructionRef="INS-2024-001234"
        legalService="Property Purchase Legal Services"
        description="Complete legal service package for residential property purchase including searches, contract review, and completion"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
};

export default PaymentV2Demo;