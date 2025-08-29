import React, { useState, useEffect } from 'react';
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
  const [showExpanded, setShowExpanded] = useState(true); // Start expanded to avoid flicker

  const steps = [
    {
      title: "Initializing Session",
      description: "Establishing secure connection",
      duration: 1000
    },
    {
      title: "Verifying Details", 
      description: "Confirming instruction parameters",
      duration: 800
    },
    {
      title: "Loading Payment Form",
      description: "Preparing secure interface",
      duration: 600
    }
  ];

  useEffect(() => {
    if (!isVisible) return;

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

    let timeoutId: number;
    let progressInterval: number;

    const runStep = (stepIndex: number) => {
      if (isDevFrozen || stepIndex >= steps.length) {
        if (stepIndex >= steps.length) {
          setTimeout(() => onComplete(), 400);
        }
        return;
      }

      setCurrentStep(stepIndex);
      const step = steps[stepIndex];
      
      // Smooth progress animation
      let stepProgress = 0;
      const startProgress = (stepIndex / steps.length) * 100;
      const stepWidth = 100 / steps.length;
      
      progressInterval = setInterval(() => {
        if (isDevFrozen) return;
        
        stepProgress += 1.5;
        const currentProgress = startProgress + (stepProgress / 100) * stepWidth;
        setProgress(Math.min(currentProgress, (stepIndex + 1) / steps.length * 100));
        
        if (stepProgress >= 100) {
          clearInterval(progressInterval);
          timeoutId = setTimeout(() => runStep(stepIndex + 1), 200);
        }
      }, step.duration / 100);
    };

    if (!isDevFrozen) {
      timeoutId = setTimeout(() => runStep(0), 800);
    }

    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isVisible, isDevFrozen, onComplete, steps]);

  const vatAmount = amount * 0.2;
  const totalAmount = amount + vatAmount;

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
                <h2 className="service-name">Payment on Account of Costs</h2>
              </div>
            </div>
            
            <div className="amount-section">
              <div className="amount-display">
                <span className="amount-value">{formatAmount(amount)}</span>
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
                <span className="breakdown-value">{formatAmount(amount)}</span>
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
                <h2 className="status-title">Verifying Details</h2>
                <p className="status-subtitle">Confirming instruction parameters</p>
              </div>
              
              <div className="progress-section">
                <div className="progress-bar-clean">
                  <div 
                    className="progress-fill-clean"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="progress-info">
                  <span className="progress-text">{Math.round(progress)}% • STEP {currentStep + 1} OF {steps.length}</span>
                </div>
              </div>
            </div>

            {/* Transaction Summary */}
            <div className="transaction-summary-clean">
              <div className="summary-row">
                <span className="summary-label">Amount</span>
                <span className="summary-value">{formatAmount(totalAmount)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Reference</span>
                <span className="summary-value">{instructionRef}</span>
              </div>
            </div>

            {/* Security Footer */}
            <div className="security-footer-clean">
              <div className="security-indicators-clean">
                <div className="security-item-clean">
                  <span className="security-icon">🔒</span>
                  <span>SSL Encrypted</span>
                </div>
                <div className="security-item-clean">
                  <span className="security-icon">✓</span>
                  <span>PCI Compliant</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Development Controls */}
        {isDevFrozen && (
          <div className="dev-overlay">
            <div className="dev-notice">
              <div className="dev-title">DEVELOPMENT PAUSE</div>
              <div className="dev-instruction">Press Ctrl+F to continue</div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default PreflightExperience;
