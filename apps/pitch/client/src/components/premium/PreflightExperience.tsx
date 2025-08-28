import React, { useState, useEffect } from 'react';
import './PreflightExperience.css';

interface PreflightExperienceProps {
  amount: number;
  instructionRef: string;
  serviceDescription: string;
  onComplete: () => void;
  isVisible: boolean;
}

const PreflightExperience: React.FC<PreflightExperienceProps> = ({
  amount,
  instructionRef,
  serviceDescription,
  onComplete,
  isVisible
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isDevFrozen, setIsDevFrozen] = useState(false);

  const steps = [
    {
      title: "Initializing Secure Session",
      description: "Establishing encrypted connection with secure payment gateway",
      duration: 800
    },
    {
      title: "Verifying Service Details", 
      description: "Confirming instruction details and service parameters",
      duration: 600
    },
    {
      title: "Preparing Payment Interface",
      description: "Loading secure payment form with compliance checks",
      duration: 700
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
    };

    document.addEventListener('keydown', handleKeyPress);

    let timeoutId: number;
    let progressInterval: number;

    const runStep = (stepIndex: number) => {
      if (isDevFrozen || stepIndex >= steps.length) {
        if (stepIndex >= steps.length) {
          setTimeout(() => onComplete(), 300);
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
        
        stepProgress += 2;
        const newProgress = startProgress + (stepProgress / 100) * stepWidth;
        setProgress(Math.min(newProgress, 100));
        
        if (stepProgress >= 100) {
          clearInterval(progressInterval);
        }
      }, step.duration / 50) as unknown as number;

      timeoutId = setTimeout(() => {
        if (!isDevFrozen) {
          clearInterval(progressInterval);
          runStep(stepIndex + 1);
        }
      }, step.duration) as unknown as number;
    };

    // Start the sequence
    runStep(0);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isVisible, onComplete, isDevFrozen]);

  return (
    <div className={`preflight-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="preflight-content">
        
        {/* Helix Branding */}
        <div className="preflight-brand">
        </div>

        {/* Current Step Display */}
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
            <span>{Math.round(progress)}%</span>
            <span>Step {currentStep + 1} of {steps.length}</span>
          </div>
        </div>

        {/* Service Summary */}
        <div className="preflight-summary">
          <div className="summary-header">
            <span className="summary-title">Instruction Summary</span>
          </div>
          <div className="summary-details">
            <div className="preflight-summary-item">
              <span className="preflight-label">Service:</span>
              <span className="preflight-value">{serviceDescription}</span>
            </div>
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

        {/* Security Indicators */}
        <div className="preflight-security">
          <div className="security-header">
            <span className="summary-title">Security & Compliance</span>
          </div>
          <div className="security-grid">
            <div className="security-indicator">
              <div className="security-text">
                <span className="security-title">SSL Encryption</span>
                <span className="security-subtitle">256-bit secure</span>
              </div>
            </div>
            <div className="security-indicator">
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
        {isDevFrozen && (
          <div className="dev-controls">
            <div className="dev-indicator">FROZEN FOR INSPECTION</div>
            <div className="dev-hint">Press Ctrl+F to resume</div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PreflightExperience;
