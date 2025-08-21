/**
 * PreflightPane V2 Component
 * 
 * "Setting up secure session" preflight UX (800-1500ms)
 * Builds trust before showing card form
 */

import React, { useState, useEffect } from 'react';
import { FiShield, FiLock, FiCheck, FiCreditCard } from 'react-icons/fi';

interface PreflightPaneProps {
  onComplete: () => void;
  duration?: number;
  showProgress?: boolean;
}

export const PreflightPane: React.FC<PreflightPaneProps> = ({
  onComplete,
  duration = 1200, // 1.2 seconds - optimal trust-building duration
  showProgress = true
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { icon: FiShield, text: 'Verifying secure connection', delay: 300 },
    { icon: FiLock, text: 'Initializing encryption', delay: 400 },
    { icon: FiCreditCard, text: 'Preparing payment form', delay: 500 }
  ];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    // Start progress animation
    if (showProgress) {
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = 100 / (duration / 50);
          return prev >= 100 ? 100 : prev + increment;
        });
      }, 50);
    }

    // Step progression
    const stepDuration = duration / steps.length;
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index);
      }, index * stepDuration);
    });

    // Complete preflight
    timeoutId = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearTimeout(timeoutId);
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [duration, onComplete, showProgress]);

  return (
    <div className="preflight-pane">
      <div className="preflight-content">
        <div className="security-header">
          <div className="security-badge">
            <FiShield className="shield-icon" />
            <span>Secure Payment Session</span>
          </div>
        </div>

        <div className="steps-container">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div 
                key={index} 
                className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="step-icon">
                  {isCompleted ? (
                    <FiCheck className="check-icon" />
                  ) : (
                    <StepIcon className={isActive ? 'pulse' : ''} />
                  )}
                </div>
                <span className="step-text">{step.text}</span>
              </div>
            );
          })}
        </div>

        {showProgress && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-text">
              {Math.round(progress)}% complete
            </div>
          </div>
        )}

        <div className="trust-indicators">
          <div className="trust-item">
            <FiShield size={16} />
            <span>256-bit SSL encryption</span>
          </div>
          <div className="trust-item">
            <FiLock size={16} />
            <span>PCI DSS compliant</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .preflight-pane {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          padding: 2rem;
          text-align: center;
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preflight-content {
          max-width: 400px;
          width: 100%;
        }

        .security-header {
          margin-bottom: 2rem;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-weight: 600;
          color: #065f46;
        }

        .shield-icon {
          color: #059669;
          font-size: 1.2rem;
        }

        .steps-container {
          margin-bottom: 2rem;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          transition: all 0.3s ease;
          opacity: 0.4;
        }

        .step-item.active {
          opacity: 1;
          transform: translateX(4px);
        }

        .step-item.completed {
          opacity: 0.7;
        }

        .step-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f1f5f9;
          color: #64748b;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .step-item.active .step-icon {
          background: #dbeafe;
          color: #2563eb;
        }

        .step-item.completed .step-icon {
          background: #dcfce7;
          color: #16a34a;
        }

        .pulse {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .check-icon {
          color: #16a34a;
        }

        .step-text {
          font-size: 0.9rem;
          color: #64748b;
          text-align: left;
        }

        .step-item.active .step-text {
          color: #1e293b;
          font-weight: 500;
        }

        .progress-container {
          margin-bottom: 2rem;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }

        .trust-indicators {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #059669;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .preflight-pane {
            padding: 1.5rem;
            min-height: 250px;
          }

          .trust-indicators {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};