import React, { useState, useEffect } from 'react';
import './PreflightExperience.css';

interface PreflightExperienceProps {
  amount: number;
  instructionRef: string;
  onComplete: () => void;
  isVisible: boolean;
  serviceDescription?: string;
  solicitorName?: string;
}

const PreflightExperience: React.FC<PreflightExperienceProps> = ({
  amount,
  instructionRef,
  onComplete,
  isVisible,
  serviceDescription,
  solicitorName
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isDevFrozen, setIsDevFrozen] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false); // Start collapsed for proper morph

  // Define steps outside of render to avoid dependency issues
  const steps = React.useMemo(() => [
    {
      title: "Securing Your Session",
      description: "Establishing encrypted connection with Helix Law",
      duration: 1200
    },
    {
      title: "Verifying Instruction Details", 
      description: "Confirming your payment parameters",
      duration: 1000
    },
    {
      title: "Preparing Payment Interface",
      description: "Loading secure Stripe payment form",
      duration: 800
    }
  ], []);

  useEffect(() => {
    if (!isVisible) return;

    // Begin expansion sooner for immediate feedback
    const morphTimeout = setTimeout(() => setShowExpanded(true), 50);

    // Development keyboard controls
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f' && e.ctrlKey) {
        e.preventDefault();
        setIsDevFrozen(prev => !prev);
      }
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        setShowExpanded(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    let stepTimeout: number;
    let progressInterval: number;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        // Smoothly finish to 100 then call onComplete
        setProgress(100);
        setTimeout(() => onComplete(), 400);
        return;
      }

      setCurrentStep(stepIndex);
      const step = steps[stepIndex];
      let stepProgress = 0;
      const startProgress = (stepIndex / steps.length) * 100;
      const stepWidth = 100 / steps.length;
      const incrementSize = 1; // Finer increments for smoother real-time feel
      const intervalTime = step.duration / (100 / incrementSize);

      progressInterval = setInterval(() => {
        if (isDevFrozen) return; // freeze just pauses increments
        stepProgress += incrementSize;
        const currentProgress = startProgress + (stepProgress / 100) * stepWidth;
        setProgress(Math.min(currentProgress, (stepIndex + 1) / steps.length * 100));
        if (stepProgress >= 100) {
          clearInterval(progressInterval);
          stepTimeout = setTimeout(() => runStep(stepIndex + 1), 150); // faster chaining
        }
      }, Math.max(intervalTime, 16)); // clamp to ~60fps
    };

    // Start immediately (no long wait) for real-time perceived responsiveness
    runStep(0);

    return () => {
      clearTimeout(morphTimeout);
      clearTimeout(stepTimeout);
      clearInterval(progressInterval);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isVisible, isDevFrozen, onComplete, steps]);

  // The amount prop is already the total including VAT
  const totalAmount = amount;
  const subtotal = totalAmount / 1.2; // Reverse calculate the pre-VAT amount
  const vatAmount = totalAmount - subtotal;

  const formatAmount = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`preflight-backdrop ${showExpanded ? 'backdrop-expanded' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: showExpanded ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
          zIndex: 999,
          transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: showExpanded ? 'auto' : 'none'
        }}
      />
      
      {/* Main Container */}
      <div className={`preflight-experience ${showExpanded ? 'expanded' : ''}`}>
        
        {/* Service Card that morphs into preflight */}
        <div className="service-card preflight-card">
          
          {/* Original service card content that fades out */}
          <div className={`original-content ${showExpanded ? 'fade-out' : ''}`}>
            <div className="service-header">
              <div className="service-details">
                <h2 className="service-name">{serviceDescription || 'Payment on Account of Costs'}</h2>
              </div>
            </div>
            
            <div className="amount-section">
              <div className="amount-display">
                <span className="amount-value">{formatAmount(totalAmount)}</span>
                <button className="edit-amount-btn" type="button">
                  <span className="edit-icon">✏️</span>
                  Edit amount
                </button>
              </div>
              <div className="amount-note">
                <span className="info-icon">ℹ️</span>
                This amount represents our estimate based on the information provided. You may adjust this payment on account to reflect your preferred contribution at this time.
              </div>
            </div>

            <div className="breakdown-section">
              <div className="breakdown-row">
                <span className="breakdown-label">Subtotal</span>
                <span className="breakdown-value">{formatAmount(subtotal)}</span>
              </div>
              <div className="breakdown-row">
                <span className="breakdown-label">VAT (20%)</span>
                <span className="breakdown-value">{formatAmount(vatAmount)}</span>
              </div>
              <div className="breakdown-row total-row">
                <span className="breakdown-label">Total</span>
                <span className="breakdown-value">{formatAmount(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Preflight loading content that fades in */}
          <div className={`preflight-content ${showExpanded ? 'fade-in' : ''}`}>
            
            {/* Status Section */}
            <div className="status-section">
              <div className="status-header">
                <h2 className="status-title">{steps[currentStep]?.title || "Loading..."}</h2>
                <p className="status-subtitle">{steps[currentStep]?.description || "Please wait..."}</p>
              </div>
              
              <div className="progress-section">
                <div className="progress-bar-clean">
                  <div 
                    className="progress-fill-clean"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="progress-info">
                  <span className="progress-left">{Math.round(progress)}% Complete</span>
                  <span className="progress-right">Step {Math.min(currentStep + 1, steps.length)} of {steps.length}</span>
                </div>
              </div>
            </div>

            {/* Transaction Summary */}
            <div className="transaction-summary-clean">
              <div className="summary-header-row">
                <div className="summary-service-heading">{serviceDescription || 'Payment on Account of Costs'}</div>
                <div className="summary-amount-inline">
                  <span className="amount-major">{formatAmount(totalAmount)}</span>
                  <span className="amount-subtext">Total inc. VAT</span>
                </div>
              </div>
              <div className="summary-logo-float" aria-hidden="true">
                <img src="/assets/dark blue mark.svg" alt="" />
              </div>
              {instructionRef && (
                <div className="summary-reference-inline">Reference <span className="ref-separator">•</span> <span className="ref-value">{instructionRef}</span></div>
              )}
              {solicitorName && (
                <div className="summary-row">
                  <span className="summary-label">Solicitor</span>
                  <span className="summary-value">{solicitorName}</span>
                </div>
              )}
            </div>

            {/* Security Footer */}
            <div className="security-footer-clean">
              <div className="security-indicators-clean">
                <div className="security-item-clean">
                  <span className="security-icon">🔒</span>
                  <span>256-bit SSL</span>
                </div>
                <div className="security-item-clean">
                  <span className="security-icon">✓</span>
                  <span>SRA Regulated</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Development Controls */}
        {isDevFrozen && (
          <div className="dev-overlay">
            <div className="dev-notice">
              <div className="dev-title">DEVELOPMENT PAUSED</div>
              <div className="dev-instruction">Press Ctrl+F to resume preflight</div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default PreflightExperience;
