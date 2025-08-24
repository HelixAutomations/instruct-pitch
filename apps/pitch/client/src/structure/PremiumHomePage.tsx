/**
 * Premium Home Page
 * 
 * Wraps the existing HomePage component with premium layout
 * while maintaining all existing functionality
 */

import React, { useState } from 'react';
import { PaymentLayout } from '../components/premium/PaymentLayout';
import HomePage from './HomePage';
import '../styles/premium/premiumComponents.css';

interface PremiumHomePageProps {
  step1Reveal: boolean;
  clientId: string;
  passcode: string;
  instructionRef: string;
  returning: boolean;
  onInstructionConfirmed?: () => void;
  onGreetingChange?: (greeting: string | null) => void;
  onContactInfoChange: (info: { feeEarner?: string }) => void;
  feeEarner?: string;
}

const PremiumHomePage: React.FC<PremiumHomePageProps> = (props) => {
  // Track the current step from HomePage
  const [currentStep, setCurrentStep] = useState<'identity' | 'documents' | 'payment'>('identity');

  // For now, use basic values for the header
  // These should be synchronized with HomePage's internal state in a future update
  const checkoutSteps = [
    { key: 'identity', label: 'Identity' },
    { key: 'documents', label: 'Documents' },
    { key: 'payment', label: 'Payment' }
  ];
  
  // Prepare checkout header props
  const checkoutHeaderProps = {
    currentIndex: checkoutSteps.findIndex(step => step.key === currentStep),
    steps: checkoutSteps,
    instructionRef: props.instructionRef,
    amount: 10, // Default amount, should be passed from props in future
    contact: props.feeEarner,
    currentStep, // Pass the current step for step content
  };

  return (
    <PaymentLayout checkoutHeader={checkoutHeaderProps}>
      {/* Render existing HomePage with premium styling */}
      <HomePage 
        {...props} 
        onCurrentStepChange={setCurrentStep}
      />
    </PaymentLayout>
  );
};

export default PremiumHomePage;
