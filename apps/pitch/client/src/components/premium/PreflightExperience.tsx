import React, { useState, useEffect } from 'react';
import './premiumCheckout.css';
import './PreflightExperience.css';

interface PreflightExperienceProps {
  amount: number;
  instructionRef: string;
  onComplete: () => void;
  isVisible: boolean;
}

const PreflightExperience: React.FC<PreflightExperienceProps> = ({
  amount,
  instructionRef,
  onComplete,
  isVisible
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isDevFrozen, setIsDevFrozen] = useState(false);

  // Listen for dev skip events
  useEffect(() => {
    const handleDevSkip = () => {
      if (import.meta.env.DEV) {
        console.log('🚀 DEV: Skipping preflight experience');
        onComplete();
      }
    };

    const handleDevFreeze = () => {
      if (import.meta.env.DEV) {
        setIsDevFrozen(prev => !prev);
        console.log('🧊 DEV: Toggled preflight freeze:', !isDevFrozen);
      }
    };

    window.addEventListener('dev-skip-to-payment', handleDevSkip);
    window.addEventListener('dev-freeze-preflight', handleDevFreeze);
    
    return () => {
      window.removeEventListener('dev-skip-to-payment', handleDevSkip);
      window.removeEventListener('dev-freeze-preflight', handleDevFreeze);
    };
  }, [onComplete, isDevFrozen]);

  const steps = [
    {
      title: "Initializing Secure Session",
      description: "Establishing encrypted connection with our secure payment gateway",
      duration: 800
    },
    {
      title: "Verifying Service Details", 
      description: "Confirming instruction details and service parameters",
      duration: 600
    },
    {
      title: "Preparing Payment Interface",
      description: "Loading secure payment form with PCI DSS compliance",
      duration: 700
    },
    {
      title: "Ready for Payment",
      description: "All security checks complete - redirecting to payment",
      duration: 300
    }
  ];

  useEffect(() => {
    if (isDevFrozen) return; // Don't progress if frozen

    let timeoutId: number;
    let progressInterval: number;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        // All steps complete
        setTimeout(() => onComplete(), 400);
        return;
      }

      setCurrentStep(stepIndex);
      const step = steps[stepIndex];
      
      // Smooth progress animation for this step
      let stepProgress = 0;
      const startProgress = (stepIndex / steps.length) * 100;
      const stepWidth = 100 / steps.length;
      
      progressInterval = setInterval(() => {
        stepProgress += 1.5;
        const newProgress = startProgress + (stepProgress / 100) * stepWidth;
        setProgress(Math.min(newProgress, 100));
        
        if (stepProgress >= 100) {
          clearInterval(progressInterval);
        }
      }, step.duration / 70) as unknown as number;

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
  }, [onComplete, isDevFrozen]);

  return (
    <div className={`preflight-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="preflight-content">
        
        {/* Enhanced Helix Branding */}
        <div className="preflight-brand">
          <div className="brand-tagline">
            <span className="brand-name">Helix Law</span>
            <span className="brand-subtitle">Premium Legal Services</span>
          </div>
        </div>

        {/* Current Step Display */}
        <div className="preflight-main">
          <h2>{steps[currentStep]?.title || "Preparing Payment"}</h2>
          <p>{steps[currentStep]?.description || "Setting up secure connection..."}</p>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="preflight-progress">
          <div className="preflight-progress-bar">
            <div 
              className="preflight-progress-fill"
              style={{ width: `${progress}%` }}
            />
            <div className="preflight-progress-glow" />
          </div>
          <div className="preflight-progress-text">
            <span className="progress-percentage">{Math.round(progress)}%</span>
            <span className="progress-status">
              {isDevFrozen ? 'FROZEN (Dev Mode)' : `Step ${currentStep + 1} of ${steps.length}`}
            </span>
          </div>
        </div>

        {/* Service Summary */}
        <div className="preflight-summary">
          <div className="summary-header">
            <span className="summary-title">Instruction Summary</span>
          </div>
          <div className="summary-details">
            <div className="preflight-summary-item">
              <span className="preflight-label">Reference:</span>
              <span className="preflight-value">{instructionRef}</span>
            </div>
            <div className="preflight-summary-item">
              <span className="preflight-label">Total Amount:</span>
              <span className="preflight-value amount-highlight">
                £{amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="preflight-summary-item">
              <span className="preflight-label">Payment Method:</span>
              <span className="preflight-value">Secure Card Payment</span>
            </div>
          </div>
        </div>

        {/* Enhanced Security Indicators */}
        <div className="preflight-security">
          <div className="security-header">
            <span className="security-title">Security & Compliance</span>
          </div>
          <div className="security-grid">
            <div className="security-indicator">
              <div className="security-text">
                <span className="security-title">SSL Encryption</span>
                <span className="security-subtitle">256-bit secure</span>
              </div>
            </div>
            <div className="security-indicator">
              <span className="security-icon">�</span>
              <div className="security-text">
                <span className="security-title">PCI Compliant</span>
                <span className="security-subtitle">Level 1 certified</span>
              </div>
            </div>
            <div className="security-indicator">
              <div className="security-text">
                <span className="security-title">SRA Regulated</span>
                <span className="security-subtitle">ID: 565557</span>
              </div>
            </div>
            <div className="security-indicator">
              <div className="security-text">
                <span className="security-title">Stripe Secure</span>
                <span className="security-subtitle">Trusted globally</span>
              </div>
            </div>
          </div>
        </div>

        {/* Development Controls */}
        {import.meta.env.DEV && (
          <div className="dev-controls">
            <button 
              className={`dev-button dev-freeze ${isDevFrozen ? 'frozen' : ''}`}
              onClick={() => setIsDevFrozen(!isDevFrozen)}
              title="Freeze/unfreeze preflight for development"
            >
              {isDevFrozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button 
              className="dev-button dev-skip"
              onClick={onComplete}
              title="Skip preflight animation"
            >
              Skip
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default PreflightExperience;
