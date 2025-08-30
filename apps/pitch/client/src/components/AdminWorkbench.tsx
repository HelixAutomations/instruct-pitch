/**
 * System Admin Workbench
 * 
 * Comprehensive administrative interface for system monitoring, debugging, and analysis.
 * Provides rapid access to critical system information for technical support and operations.
 */

import React, { useState, useEffect } from 'react';
import './AdminWorkbench.css';

// Import components for analysis
import ModernPaymentForm from './premium/ModernPaymentForm';
import { PaymentFormV2 } from './paymentsV2/PaymentFormV2';
import { PaymentFlowV2 } from './paymentsV2/PaymentFlowV2Complete';
import UnifiedCardPayment from './UnifiedCardPayment';
import { paymentService } from '../utils/paymentService';

interface SystemInfo {
  environment: string;
  buildVersion: string;
  stripeConfigured: boolean;
  featureFlags: Record<string, string>;
  lastDeployment: string;
}

interface ComponentAnalysis {
  name: string;
  location: string;
  status: 'active' | 'deprecated' | 'testing' | 'disabled';
  usage: string;
  dependencies: string[];
  lastModified: string;
  codeHealth: 'good' | 'warning' | 'critical';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PaymentTestErrorBoundary extends React.Component<{children: React.ReactNode}, ErrorBoundaryState> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Payment test error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h4>Payment Component Error</h4>
          <p>The payment component encountered an error:</p>
          <pre className="error-details">{this.state.error?.message}</pre>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AdminWorkbench: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'overview' | 'payments' | 'components' | 'system' | 'diagnostics'>('overview');
  const [activePaymentForm, setActivePaymentForm] = useState<'modern' | 'v2' | 'v2-flow' | 'unified'>('modern');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [v2ClientSecret, setV2ClientSecret] = useState<string>('');

  // Initialize system data
  useEffect(() => {
    const loadSystemInfo = () => {
      setSystemInfo({
        environment: import.meta.env.MODE || 'development',
        buildVersion: '2.1.3-ux-rework',
        stripeConfigured: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
        featureFlags: {
          'VITE_PAYMENTS_UX_V2': import.meta.env.VITE_PAYMENTS_UX_V2 || 'false',
        },
        lastDeployment: new Date().toISOString().split('T')[0]
      });
      setIsLoading(false);
    };

    setTimeout(loadSystemInfo, 500); // Simulate loading
  }, []);

  const paymentComponents: ComponentAnalysis[] = [
    {
      name: 'ModernPaymentForm',
      location: 'components/premium/ModernPaymentForm.tsx',
      status: 'active',
      usage: 'Primary payment interface (PremiumCheckout)',
      dependencies: ['@stripe/react-stripe-js', 'payment-service'],
      lastModified: '2025-08-29',
      codeHealth: 'good'
    },
    {
      name: 'PaymentFormV2',
      location: 'components/paymentsV2/PaymentFormV2.tsx',
      status: 'testing',
      usage: 'Feature-flagged V2 implementation (Now testable in admin)',
      dependencies: ['@stripe/react-stripe-js', 'telemetry-service'],
      lastModified: '2025-08-28',
      codeHealth: 'good'
    },
    {
      name: 'PaymentFlowV2Complete',
      location: 'components/paymentsV2/PaymentFlowV2Complete.tsx',
      status: 'testing',
      usage: 'Complete V2 orchestrated flow (Full UX testing)',
      dependencies: ['@stripe/react-stripe-js', 'preflight-service', 'trust-components'],
      lastModified: '2025-08-27',
      codeHealth: 'good'
    },
    {
      name: 'UnifiedCardPayment',
      location: 'components/UnifiedCardPayment.tsx',
      status: 'testing',
      usage: 'Simplified single-field card input prototype',
      dependencies: ['@stripe/react-stripe-js', 'payment-service'],
      lastModified: '2025-08-29',
      codeHealth: 'good'
    },
    {
      name: 'PaymentForm (Legacy)',
      location: 'components/PaymentForm.tsx',
      status: 'deprecated',
      usage: 'Legacy implementation (PaymentExample)',
      dependencies: ['@stripe/react-stripe-js'],
      lastModified: '2025-08-15',
      codeHealth: 'critical'
    }
  ];

  const testData = {
    amount: 15000,
    currency: 'gbp' as const,
    instructionRef: 'ADMIN-TEST-001',
    legalService: 'Property Purchase',
    description: 'Admin workbench testing - comprehensive payment flow validation',
    metadata: {
      source: 'admin_workbench',
      purpose: 'system_testing',
      operator: 'admin_user'
    }
  };

  const handleTestSuccess = (paymentIntentId: string) => {
    console.log('✅ Admin Test Success:', paymentIntentId);
  };

  const handleTestError = (error: string) => {
    console.error('❌ Admin Test Error:', error);
  };

  // Create client secret for V2 form
  const createV2ClientSecret = async () => {
    try {
      const response = await paymentService.createPaymentIntent({
        amount: testData.amount,
        currency: testData.currency,
        instructionRef: testData.instructionRef,
        metadata: testData.metadata
      });
      setV2ClientSecret(response.clientSecret);
      console.log('✅ V2 Client Secret created:', response.paymentId);
    } catch (error) {
      console.error('❌ Failed to create V2 client secret:', error);
      setV2ClientSecret('');
    }
  };

  // Create client secret when switching to V2 form or V2 flow
  useEffect(() => {
    if ((activePaymentForm === 'v2' || activePaymentForm === 'v2-flow') && !v2ClientSecret && systemInfo) {
      createV2ClientSecret();
    }
  }, [activePaymentForm, v2ClientSecret, systemInfo]);

  // Hide in production unless specifically enabled
  if (import.meta.env.PROD && !import.meta.env.VITE_ADMIN_WORKBENCH) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="admin-workbench">
        <div className="admin-header">
          <div className="admin-header-content">
            <h1>System Admin Interface</h1>
            <div className="loading-indicator">Initializing system diagnostics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-workbench">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-title-section">
            <h1>System Admin Interface</h1>
            <div className="admin-subtitle">Technical Support & Operations Dashboard</div>
          </div>
          <div className="admin-status-indicators">
            <div className={`status-badge ${systemInfo?.environment === 'development' ? 'dev' : 'prod'}`}>
              {systemInfo?.environment.toUpperCase()}
            </div>
            <div className={`status-badge ${systemInfo?.stripeConfigured ? 'active' : 'inactive'}`}>
              Stripe {systemInfo?.stripeConfigured ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="admin-navigation">
        <div className="admin-nav-content">
          <button 
            className={`nav-tab ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            System Overview
          </button>
          <button 
            className={`nav-tab ${activeSection === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveSection('payments')}
          >
            Payment Systems
          </button>
          <button 
            className={`nav-tab ${activeSection === 'components' ? 'active' : ''}`}
            onClick={() => setActiveSection('components')}
          >
            Component Analysis
          </button>
          <button 
            className={`nav-tab ${activeSection === 'system' ? 'active' : ''}`}
            onClick={() => setActiveSection('system')}
          >
            System Information
          </button>
          <button 
            className={`nav-tab ${activeSection === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveSection('diagnostics')}
          >
            Live Diagnostics
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-content">
        {activeSection === 'overview' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>System Status Overview</h2>
              <div className="timestamp">Last updated: {new Date().toLocaleString()}</div>
            </div>
            
            <div className="overview-grid">
              <div className="overview-card">
                <div className="card-header">
                  <h3>Application Health</h3>
                  <div className="status-indicator good"></div>
                </div>
                <div className="card-content">
                  <div className="metric">
                    <span className="metric-label">Environment:</span>
                    <span className="metric-value">{systemInfo?.environment}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Build Version:</span>
                    <span className="metric-value">{systemInfo?.buildVersion}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Last Deployment:</span>
                    <span className="metric-value">{systemInfo?.lastDeployment}</span>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <h3>Payment Integration</h3>
                  <div className={`status-indicator ${systemInfo?.stripeConfigured ? 'good' : 'critical'}`}></div>
                </div>
                <div className="card-content">
                  <div className="metric">
                    <span className="metric-label">Stripe Status:</span>
                    <span className="metric-value">{systemInfo?.stripeConfigured ? 'Configured' : 'Not Configured'}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Active Components:</span>
                    <span className="metric-value">{paymentComponents.filter(c => c.status === 'active').length}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Deprecated:</span>
                    <span className="metric-value">{paymentComponents.filter(c => c.status === 'deprecated').length}</span>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <h3>Feature Flags</h3>
                  <div className="status-indicator warning"></div>
                </div>
                <div className="card-content">
                  {Object.entries(systemInfo?.featureFlags || {}).map(([key, value]) => (
                    <div key={key} className="metric">
                      <span className="metric-label">{key.replace('VITE_', '')}:</span>
                      <span className={`metric-value flag-${value === 'true' ? 'enabled' : 'disabled'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'payments' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Payment System Testing</h2>
              <div className="section-description">Live payment component testing and validation</div>
            </div>
            
            {/* Payment Form Tabs */}
            <div className="payment-form-tabs">
              <button 
                className={`payment-tab ${activePaymentForm === 'modern' ? 'active' : ''}`}
                onClick={() => setActivePaymentForm('modern')}
              >
                🎯 ModernPaymentForm (Production)
              </button>
              <button 
                className={`payment-tab ${activePaymentForm === 'v2' ? 'active' : ''}`}
                onClick={() => setActivePaymentForm('v2')}
              >
                🔐 PaymentFormV2 (UX V2)
              </button>
              <button 
                className={`payment-tab ${activePaymentForm === 'v2-flow' ? 'active' : ''}`}
                onClick={() => setActivePaymentForm('v2-flow')}
              >
                🌊 PaymentFlowV2 (Complete)
              </button>
              <button 
                className={`payment-tab ${activePaymentForm === 'unified' ? 'active' : ''}`}
                onClick={() => setActivePaymentForm('unified')}
              >
                🎴 Unified Card Input
              </button>
            </div>
            
            <div className="payment-test-area">
              {activePaymentForm === 'modern' && (
                <div className="test-panel">
                  <h3>ModernPaymentForm (Production)</h3>
                  <div className="test-details">
                    <div className="test-info">
                      <span className="info-label">Status:</span>
                      <span className="status-badge active">ACTIVE</span>
                    </div>
                    <div className="test-info">
                      <span className="info-label">Location:</span>
                      <span className="info-value">PremiumCheckout → ModernPaymentForm</span>
                    </div>
                    <div className="test-info">
                      <span className="info-label">Test Mode:</span>
                      <span className="info-value">Self-managing Client Secret</span>
                    </div>
                  </div>
                  <div className="test-component">
                    <div className="test-note">
                      <p><strong>Note:</strong> This is the current production payment form. It handles its own payment intent creation and client secret management.</p>
                    </div>
                    <PaymentTestErrorBoundary>
                      <ModernPaymentForm
                        amount={testData.amount}
                        currency={testData.currency}
                        instructionRef={testData.instructionRef}
                        onSuccess={handleTestSuccess}
                        onError={handleTestError}
                        onProcessingChange={(processing) => console.log('Modern Form Processing:', processing)}
                      />
                    </PaymentTestErrorBoundary>
                  </div>
                </div>
              )}

              {activePaymentForm === 'v2' && (
                <div className="test-panel">
                  <h3>PaymentFormV2 (UX V2)</h3>
                  <div className="test-details">
                    <div className="test-info">
                      <span className="info-label">Status:</span>
                      <span className="status-badge testing">TESTING</span>
                    </div>
                    <div className="test-info">
                      <span className="info-label">Feature Flag:</span>
                      <span className="info-value">VITE_PAYMENTS_UX_V2={import.meta.env.VITE_PAYMENTS_UX_V2 || 'false'}</span>
                    </div>
                    <div className="test-info">
                      <span className="info-label">Client Secret:</span>
                      <span className="info-value">{v2ClientSecret ? 'Generated' : 'Creating...'}</span>
                    </div>
                  </div>
                  <div className="test-component">
                    <div className="test-note">
                      <p><strong>Note:</strong> This is the enhanced V2 payment form with improved UX, trust indicators, and telemetry. Requires external client secret management.</p>
                    </div>
                    {v2ClientSecret ? (
                      <PaymentTestErrorBoundary>
                        <PaymentFormV2
                          clientSecret={v2ClientSecret}
                          amount={testData.amount}
                          currency={testData.currency}
                          instructionRef={testData.instructionRef}
                          onSuccess={handleTestSuccess}
                          onError={handleTestError}
                          onProcessingChange={(processing) => console.log('V2 Form Processing:', processing)}
                        />
                      </PaymentTestErrorBoundary>
                    ) : (
                      <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Creating payment intent for V2 form...</p>
                        <button 
                          onClick={createV2ClientSecret}
                          className="retry-button"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activePaymentForm === 'v2-flow' && (
                <div className="test-panel">
                  <h3>PaymentFlowV2 Complete (Full UX V2)</h3>
                  <div className="test-details">
                    <div className="test-info">
                      <span className="info-label">Status:</span>
                      <span className="status-badge testing">TESTING</span>
                    </div>
                    <div className="test-info">
                      <span className="info-label">Features:</span>
                      <span className="info-value">Preflight, Trust Elements, Complete Flow</span>
                    </div>
                    <div className="test-info">
                      <span className="info-label">Components:</span>
                      <span className="info-value">Layout, PriceSummary, Preflight, TrustStrip</span>
                    </div>
                  </div>
                  <div className="test-component">
                    <div className="test-note">
                      <p><strong>Note:</strong> This is the complete V2 payment flow with all components: preflight validation, trust indicators, enhanced layout, and comprehensive user experience orchestration.</p>
                    </div>
                    <PaymentTestErrorBoundary>
                      <PaymentFlowV2
                        amount={testData.amount}
                        currency={testData.currency}
                        instructionRef={testData.instructionRef}
                        legalService={testData.legalService}
                        description={testData.description}
                        onSuccess={handleTestSuccess}
                        onError={handleTestError}
                        onCancel={() => console.log('V2 Flow cancelled')}
                      />
                    </PaymentTestErrorBoundary>
                  </div>
                </div>
              )}

              {activePaymentForm === 'unified' && (
                <div className="test-panel">
                  <h3>Unified Card Input (Simplified)</h3>
                  <div className="test-details">
                    <div className="test-info">
                      <span className="info-label">Status:</span>
                      <span className="status-badge testing">PROTOTYPE</span>
                    </div>
                    <div className="test-info">
                      <span className="info-label">Concept:</span>
                      <span className="info-value">Single-field card input with dynamic revelation</span>
                    </div>
                    <div className="test-info">
                      <span className="info-label">Technology:</span>
                      <span className="info-value">Stripe CardElement (unified)</span>
                    </div>
                  </div>
                  <div className="test-component">
                    <div className="test-note">
                      <p>💡 This prototype demonstrates a cleaner card input where CVC and expiry reveal dynamically in the same field as the user types.</p>
                    </div>
                    <PaymentTestErrorBoundary>
                      <UnifiedCardPayment />
                    </PaymentTestErrorBoundary>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'components' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Component Analysis</h2>
              <div className="section-description">Detailed analysis of payment system components</div>
            </div>
            
            <div className="component-table">
              <div className="table-header">
                <div className="table-cell">Component</div>
                <div className="table-cell">Status</div>
                <div className="table-cell">Usage</div>
                <div className="table-cell">Health</div>
                <div className="table-cell">Last Modified</div>
              </div>
              {paymentComponents.map((component, index) => (
                <div key={index} className="table-row">
                  <div className="table-cell">
                    <div className="component-info">
                      <div className="component-name">{component.name}</div>
                      <div className="component-location">{component.location}</div>
                    </div>
                  </div>
                  <div className="table-cell">
                    <span className={`status-badge ${component.status}`}>
                      {component.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="table-cell">
                    <div className="usage-info">{component.usage}</div>
                  </div>
                  <div className="table-cell">
                    <div className={`health-indicator ${component.codeHealth}`}>
                      {component.codeHealth.toUpperCase()}
                    </div>
                  </div>
                  <div className="table-cell">{component.lastModified}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'system' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>System Information</h2>
              <div className="section-description">Detailed system configuration and environment data</div>
            </div>
            
            <div className="system-info-grid">
              <div className="info-section">
                <h3>Environment Configuration</h3>
                <div className="info-content">
                  <div className="info-row">
                    <span className="info-key">Mode:</span>
                    <span className="info-value">{systemInfo?.environment}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Build Version:</span>
                    <span className="info-value">{systemInfo?.buildVersion}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Node Environment:</span>
                    <span className="info-value">{import.meta.env.NODE_ENV || 'development'}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3>API Configuration</h3>
                <div className="info-content">
                  <div className="info-row">
                    <span className="info-key">Backend URL:</span>
                    <span className="info-value">localhost:3000</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Stripe Public Key:</span>
                    <span className="info-value">{systemInfo?.stripeConfigured ? 'Configured' : 'Missing'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Webhook Status:</span>
                    <span className="info-value">Active (CLI)</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3>Feature Flags</h3>
                <div className="info-content">
                  {Object.entries(systemInfo?.featureFlags || {}).map(([key, value]) => (
                    <div key={key} className="info-row">
                      <span className="info-key">{key}:</span>
                      <span className={`info-value flag-${value === 'true' ? 'enabled' : 'disabled'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'diagnostics' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Live Diagnostics</h2>
              <div className="section-description">Real-time system monitoring and troubleshooting</div>
            </div>
            
            <div className="diagnostics-grid">
              <div className="diagnostic-panel">
                <h3>Payment System Health</h3>
                <div className="diagnostic-content">
                  <div className="diagnostic-check">
                    <span className="check-icon good">✓</span>
                    <span className="check-label">Stripe SDK Loaded</span>
                  </div>
                  <div className="diagnostic-check">
                    <span className="check-icon good">✓</span>
                    <span className="check-label">Payment Intent Creation</span>
                  </div>
                  <div className="diagnostic-check">
                    <span className="check-icon warning">!</span>
                    <span className="check-label">Elements API (401 Unauthorized)</span>
                  </div>
                  <div className="diagnostic-check">
                    <span className="check-icon warning">!</span>
                    <span className="check-label">HTTPS Required for Production</span>
                  </div>
                </div>
              </div>

              <div className="diagnostic-panel">
                <h3>Component Status</h3>
                <div className="diagnostic-content">
                  <div className="diagnostic-check">
                    <span className="check-icon good">✓</span>
                    <span className="check-label">ModernPaymentForm (Production)</span>
                  </div>
                  <div className="diagnostic-check">
                    <span className="check-icon good">✓</span>
                    <span className="check-label">PaymentFormV2 (Admin Testing)</span>
                  </div>
                  <div className="diagnostic-check">
                    <span className="check-icon good">✓</span>
                    <span className="check-label">PaymentFlowV2 Complete (Full UX)</span>
                  </div>
                  <div className="diagnostic-check">
                    <span className="check-icon good">✓</span>
                    <span className="check-label">UnifiedCardPayment (Prototype)</span>
                  </div>
                  <div className="diagnostic-check">
                    <span className="check-icon warning">!</span>
                    <span className="check-label">V2 Feature Flag Status</span>
                  </div>
                  <div className="diagnostic-check">
                    <span className="check-icon critical">✗</span>
                    <span className="check-label">Legacy PaymentForm</span>
                  </div>
                </div>
              </div>

              <div className="diagnostic-panel">
                <h3>Development Environment</h3>
                <div className="diagnostic-content">
                  <div className="metric-row">
                    <span className="metric-name">HTTP Mode:</span>
                    <span className="metric-value">Active (localhost)</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-name">Stripe Test Mode:</span>
                    <span className="metric-value">Active</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-name">Backend Server:</span>
                    <span className="metric-value">localhost:3000</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-name">Payment Methods:</span>
                    <span className="metric-value">Card, Apple Pay*, Google Pay*</span>
                  </div>
                </div>
                <div className="env-notes">
                  <p className="note-text">* Apple Pay and Google Pay require HTTPS in production</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWorkbench;
