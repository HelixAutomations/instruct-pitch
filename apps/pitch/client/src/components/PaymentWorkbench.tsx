/**
 * Development Workbench
 * 
 * Comprehensive sandbox environment for testing, prototyping, and development
 * Only available in development mode (localhost)
 */

import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import './PaymentWorkbench.css';

// Import components for testing
import ModernPaymentForm from './premium/ModernPaymentForm';

// Initialize Stripe for components that need it
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

type WorkbenchTab = 'payments' | 'components' | 'api' | 'forms' | 'ui-kit' | 'data';

const DevWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('payments');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testData, setTestData] = useState({
    amount: 15000,
    currency: 'gbp' as const,
    instructionRef: 'WORKBENCH-TEST-001',
    clientId: '27367-20200'
  });

  // Initialize with error handling
  React.useEffect(() => {
    try {
      console.log('🔧 Development Workbench initializing...');
      console.log('Environment:', import.meta.env.MODE);
      console.log('Stripe Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Present' : 'Missing');
      console.log('V2 Flag:', import.meta.env.VITE_PAYMENTS_UX_V2);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Workbench initialization error:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  }, []);

  const handleSuccess = (paymentIntentId: string) => {
    console.log('✅ Workbench Payment Success:', paymentIntentId);
    alert(`Payment successful! ID: ${paymentIntentId}`);
  };

  const handleError = (error: string) => {
    console.error('❌ Workbench Payment Error:', error);
    alert(`Payment error: ${error}`);
  };

  const testApiCall = async (endpoint: string) => {
    try {
      console.log(`🧪 Testing API: ${endpoint}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log('API Response:', data);
      alert(`API Test: ${response.status} - Check console for details`);
    } catch (error) {
      console.error('API Test Error:', error);
      alert(`API Test Failed: ${error}`);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return (
      <div className="dev-workbench">
        <div className="workbench-header">
          <h1>🔒 Development Workbench</h1>
          <p>This tool is only available in development mode</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="dev-workbench">
        <div className="workbench-header">
          <h1>🔧 Development Workbench</h1>
          <p>Initializing development environment...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="dev-workbench">
        <div className="workbench-header">
          <h1>🔧 Development Workbench</h1>
          <p style={{color: 'red'}}>Error: {loadError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-workbench">
      <div className="workbench-header">
        <h1>🔧 Development Workbench</h1>
        <p>Comprehensive sandbox environment for testing and prototyping</p>
        <div className="env-info">
          <span>Environment: <strong>{import.meta.env.MODE}</strong></span>
          <span>V2 Payments: <strong>{import.meta.env.VITE_PAYMENTS_UX_V2 || 'false'}</strong></span>
          <span>Client ID: <strong>{testData.clientId}</strong></span>
        </div>
      </div>

      <div className="workbench-tabs">
        <button 
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💳 Payments
        </button>
        <button 
          className={`tab ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
        >
          🧩 Components
        </button>
        <button 
          className={`tab ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          🔌 API Testing
        </button>
        <button 
          className={`tab ${activeTab === 'forms' ? 'active' : ''}`}
          onClick={() => setActiveTab('forms')}
        >
          � Forms
        </button>
        <button 
          className={`tab ${activeTab === 'ui-kit' ? 'active' : ''}`}
          onClick={() => setActiveTab('ui-kit')}
        >
          � UI Kit
        </button>
        <button 
          className={`tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          📊 Data
        </button>
      </div>

      <div className="workbench-content">
        {/* Payment Components Testing */}
        {activeTab === 'payments' && (
          <div className="workbench-panel">
            <h2>� Payment Components Testing</h2>
            <div className="test-controls">
              <div className="control-group">
                <label>Amount (pence):</label>
                <input 
                  type="number" 
                  value={testData.amount} 
                  onChange={(e) => setTestData({...testData, amount: parseInt(e.target.value)})}
                />
              </div>
              <div className="control-group">
                <label>Currency:</label>
                <select 
                  value={testData.currency} 
                  onChange={(e) => setTestData({...testData, currency: e.target.value as 'gbp'})}
                >
                  <option value="gbp">GBP</option>
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                </select>
              </div>
              <div className="control-group">
                <label>Instruction Ref:</label>
                <input 
                  type="text" 
                  value={testData.instructionRef} 
                  onChange={(e) => setTestData({...testData, instructionRef: e.target.value})}
                />
              </div>
            </div>
            
            <div className="payment-demo">
              <h3>🎯 ModernPaymentForm (Current)</h3>
              <div className="demo-container">
                <Elements stripe={stripePromise} options={{ mode: 'payment', amount: testData.amount, currency: testData.currency }}>
                  <ModernPaymentForm
                    amount={testData.amount}
                    currency={testData.currency}
                    instructionRef={testData.instructionRef}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onProcessingChange={(processing) => console.log('Processing:', processing)}
                  />
                </Elements>
              </div>
            </div>
          </div>
        )}

        {/* Component Testing */}
        {activeTab === 'components' && (
          <div className="workbench-panel">
            <h2>🧩 Component Testing</h2>
            <div className="component-grid">
              <div className="component-card">
                <h3>Payment Components</h3>
                <ul>
                  <li>✅ ModernPaymentForm - Active</li>
                  <li>⚠️ PaymentFormV2 - Feature flagged</li>
                  <li>📜 PaymentForm - Legacy</li>
                  <li>🔄 PaymentFlowV2 - Complete flow</li>
                </ul>
              </div>
              <div className="component-card">
                <h3>Form Components</h3>
                <ul>
                  <li>📝 Contact forms</li>
                  <li>🏠 Address forms</li>
                  <li>🔐 Authentication forms</li>
                  <li>📋 Data collection forms</li>
                </ul>
              </div>
              <div className="component-card">
                <h3>UI Components</h3>
                <ul>
                  <li>🎨 Buttons and controls</li>
                  <li>📊 Charts and graphs</li>
                  <li>🔔 Notifications</li>
                  <li>🧭 Navigation</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* API Testing */}
        {activeTab === 'api' && (
          <div className="workbench-panel">
            <h2>🔌 API Testing</h2>
            <div className="api-tests">
              <div className="api-group">
                <h3>Payment APIs</h3>
                <button onClick={() => testApiCall('http://localhost:3000/api/payments/create-intent')}>
                  Test Create Payment Intent
                </button>
                <button onClick={() => testApiCall('http://localhost:3000/api/payments/status/test-123')}>
                  Test Payment Status
                </button>
              </div>
              <div className="api-group">
                <h3>Client APIs</h3>
                <button onClick={() => testApiCall('http://localhost:3000/api/generate-instruction-ref?cid=TEST')}>
                  Test Generate Instruction Ref
                </button>
              </div>
              <div className="api-group">
                <h3>Data APIs</h3>
                <button onClick={() => testApiCall('http://localhost:3000/api/client-data?cid=TEST')}>
                  Test Client Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forms Testing */}
        {activeTab === 'forms' && (
          <div className="workbench-panel">
            <h2>📝 Forms Testing</h2>
            <p>Form component testing and validation playground</p>
            <div className="form-demos">
              <div className="form-card">
                <h3>Contact Form</h3>
                <p>Test contact information collection</p>
              </div>
              <div className="form-card">
                <h3>Address Form</h3>
                <p>Test address validation and formatting</p>
              </div>
              <div className="form-card">
                <h3>Payment Form</h3>
                <p>Test payment form variations</p>
              </div>
            </div>
          </div>
        )}

        {/* UI Kit */}
        {activeTab === 'ui-kit' && (
          <div className="workbench-panel">
            <h2>🎨 UI Kit</h2>
            <p>Design system components and patterns</p>
            <div className="ui-showcase">
              <div className="ui-section">
                <h3>Buttons</h3>
                <button className="btn-primary">Primary Button</button>
                <button className="btn-secondary">Secondary Button</button>
                <button className="btn-danger">Danger Button</button>
              </div>
              <div className="ui-section">
                <h3>Colors</h3>
                <div className="color-palette">
                  <div className="color-swatch" style={{backgroundColor: '#007bff'}}>#007bff</div>
                  <div className="color-swatch" style={{backgroundColor: '#28a745'}}>#28a745</div>
                  <div className="color-swatch" style={{backgroundColor: '#dc3545'}}>#dc3545</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Testing */}
        {activeTab === 'data' && (
          <div className="workbench-panel">
            <h2>📊 Data Testing</h2>
            <div className="data-tools">
              <h3>Test Data Generator</h3>
              <p>Generate sample data for testing</p>
              <div className="data-controls">
                <button onClick={() => console.log('Generated test client data')}>
                  Generate Client Data
                </button>
                <button onClick={() => console.log('Generated test payment data')}>
                  Generate Payment Data
                </button>
                <button onClick={() => console.log('Generated test form data')}>
                  Generate Form Data
                </button>
              </div>
              
              <h3>Current Test Data</h3>
              <pre className="data-display">
                {JSON.stringify(testData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevWorkbench;
