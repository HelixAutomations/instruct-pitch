import React, { useState, useEffect } from 'react';
import './premiumCheckout.css';
import './PreflightExperience.css';

interface PreflightExperienceProps {
  amount: number;
  instructionRef: string;
  onComplete: () => void;
}

const PreflightExperience: React.FC<PreflightExperienceProps> = ({
  amount,
  instructionRef,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Listen for dev skip events
  useEffect(() => {
    const handleDevSkip = () => {
      if (import.meta.env.DEV) {
        console.log('🚀 DEV: Skipping preflight experience');
        onComplete();
      }
    };

    window.addEventListener('dev-skip-to-payment', handleDevSkip);
    return () => window.removeEventListener('dev-skip-to-payment', handleDevSkip);
  }, [onComplete]);

  const steps = [
    {
      title: "Securing Your Payment",
      description: "Preparing encrypted connection...",
      duration: 500
    },
    {
      title: "Verifying Service Details", 
      description: "Confirming your instruction...",
      duration: 400
    },
    {
      title: "Loading Payment Gateway",
      description: "Connecting to secure processor...",
      duration: 600
    }
  ];

  useEffect(() => {
    let timeoutId: number;
    let progressInterval: number;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        // All steps complete
        setTimeout(() => onComplete(), 200);
        return;
      }

      setCurrentStep(stepIndex);
      const step = steps[stepIndex];
      
      // Animate progress for this step
      let stepProgress = 0;
      progressInterval = setInterval(() => {
        stepProgress += 2;
        setProgress((stepIndex / steps.length) * 100 + (stepProgress / steps.length));
        
        if (stepProgress >= 100) {
          clearInterval(progressInterval);
        }
      }, step.duration / 50) as unknown as number;

      // Move to next step
      timeoutId = setTimeout(() => {
        clearInterval(progressInterval);
        runStep(stepIndex + 1);
      }, step.duration) as unknown as number;
    };

    // Start the sequence
    runStep(0);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="preflight-container">
      <div className="preflight-content">
        
        {/* Helix Branding */}
        <div className="preflight-brand">
          <div className="preflight-logo">⚖️</div>
          <h1>Helix Law</h1>
        </div>

        {/* Main Message */}
        <div className="preflight-main">
          <h2>{steps[currentStep]?.title || "Preparing Payment"}</h2>
          <p>{steps[currentStep]?.description || "Setting up secure connection..."}</p>
        </div>

        {/* Progress Bar */}
        <div className="preflight-progress">
          <div className="preflight-progress-bar">
            <div 
              className="preflight-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="preflight-progress-text">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Payment Summary */}
        <div className="preflight-summary">
          <div className="preflight-summary-item">
            <span className="preflight-label">Instruction:</span>
            <span className="preflight-value">{instructionRef}</span>
          </div>
          <div className="preflight-summary-item">
            <span className="preflight-label">Amount:</span>
            <span className="preflight-value">£{amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Security Indicators */}
        <div className="preflight-security">
          <div className="security-indicator">
            <span className="security-icon">🔒</span>
            <span>256-bit SSL Encryption</span>
          </div>
          <div className="security-indicator">
            <span className="security-icon">🛡️</span>
            <span>PCI DSS Compliant</span>
          </div>
          <div className="security-indicator">
            <span className="security-icon">✅</span>
            <span>SRA Regulated</span>
          </div>
        </div>

        {/* Trust Message */}
        <div className="preflight-trust">
          <p>Your payment is processed securely by Stripe, trusted by millions of businesses worldwide.</p>
        </div>

        {/* Development Skip Button */}
        {import.meta.env.DEV && (
          <button 
            className="dev-skip-preflight"
            onClick={onComplete}
            title="Development only - Skip preflight animation"
            style={{
              position: 'fixed',
              top: '2rem',
              right: '2rem',
              background: '#374151',
              color: 'white',
              border: '2px dashed #fbbf24',
              opacity: 1,
              fontWeight: 'bold',
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 1000
            }}
          >
            ⚡ DEV: Skip Preflight
          </button>
        )}

      </div>
    </div>
  );
};

export default PreflightExperience;
