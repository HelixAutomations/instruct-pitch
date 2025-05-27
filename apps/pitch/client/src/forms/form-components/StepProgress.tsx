import React from 'react';
import './StepProgress.css';

interface StepProgressProps {
  currentStep: number;
  steps: string[];
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  steps
}) => {
  return (
    <ul className="apple-stepper">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isDone = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <li
            key={stepNum}
            className={[
              isDone ? 'done' : '',
              isCurrent ? 'current' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="step-marker">{stepNum}</span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ul>
  );
};
