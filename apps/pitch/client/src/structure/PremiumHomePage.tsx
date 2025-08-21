/**
 * Premium Home Page
 * 
 * Wraps the existing HomePage component with premium layout
 * while maintaining all existing functionality
 */

import React from 'react';
import { PaymentLayout } from '../components/premium/PaymentLayout';
import HomePage from './HomePage';
import '../styles/premium/premiumComponents.css';

interface PremiumHomePageProps {
  step1Reveal: boolean;
  clientId: string;
  passcode: string;
  instructionRef: string;
  returning: boolean;
  onInstructionConfirmed: () => void;
  onGreetingChange: (greeting: string | null) => void;
  onContactInfoChange: (info: { feeEarner?: string }) => void;
  feeEarner?: string;
}

const PremiumHomePage: React.FC<PremiumHomePageProps> = (props) => {
  return (
    <PaymentLayout>
      <div className="premium-home-wrapper">
        {/* Add premium styling to existing HomePage */}
        <style>{`
          /* Override existing styles with premium theme */
          .form-container {
            background: transparent;
            box-shadow: none;
            border: none;
            padding: 0;
          }
          
          .apple-form {
            background: #FFFFFF;
            border-radius: clamp(12px, 3vw, 20px);
            padding: clamp(20px, 5vw, 40px);
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            border: 1px solid #F3F4F6;
            margin-bottom: clamp(16px, 4vw, 32px);
          }
          
          .apple-form:hover {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transform: translateY(-1px);
            transition: all 300ms ease;
          }
          
          .service-summary-box {
            background: #FFFFFF;
            border-radius: clamp(12px, 3vw, 20px);
            padding: clamp(20px, 5vw, 40px);
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            border: 1px solid #F3F4F6;
            margin-bottom: clamp(16px, 4vw, 24px);
          }
          
          .btn.primary {
            background: #0D2F60 !important;
            color: #FFFFFF !important;
            border: none !important;
            border-radius: clamp(8px, 2.5vw, 14px) !important;
            padding: clamp(14px, 4vw, 18px) clamp(20px, 6vw, 40px) !important;
            font-size: clamp(0.875rem, 3.5vw, 1rem) !important;
            font-weight: 600 !important;
            min-height: clamp(48px, 12vw, 56px) !important;
            transition: all 150ms ease !important;
            width: 100% !important;
          }
          
          .btn.primary:hover:not(:disabled) {
            background: #061733 !important;
            transform: translateY(-1px) !important;
          }
          
          .btn.secondary {
            background: #F4F4F6 !important;
            color: #061733 !important;
            border: 1px solid #E5E7EB !important;
            border-radius: clamp(8px, 2.5vw, 14px) !important;
            padding: clamp(14px, 4vw, 18px) clamp(20px, 6vw, 40px) !important;
            font-size: clamp(0.875rem, 3.5vw, 1rem) !important;
            font-weight: 600 !important;
            min-height: clamp(48px, 12vw, 56px) !important;
            transition: all 150ms ease !important;
            width: 100% !important;
          }
          
          .btn.secondary:hover:not(:disabled) {
            background: #E5E7EB !important;
          }
          
          @media (min-width: 768px) {
            .btn.primary, .btn.secondary {
              width: auto !important;
              min-width: 140px !important;
            }
            
            .button-group {
              display: flex !important;
              gap: 16px !important;
              justify-content: flex-end !important;
              align-items: center !important;
            }
          }
          
          /* Typography improvements */
          .question-banner {
            font-size: clamp(1.25rem, 5vw, 1.75rem) !important;
            font-weight: 600 !important;
            color: #061733 !important;
            margin-bottom: clamp(12px, 3vw, 20px) !important;
          }
          
          /* Form improvements */
          .form-group input,
          .form-group select,
          .form-group textarea {
            border-radius: clamp(6px, 2vw, 8px) !important;
            border: 1px solid #E5E7EB !important;
            padding: clamp(12px, 3vw, 16px) !important;
            font-size: clamp(0.875rem, 3.5vw, 1rem) !important;
            transition: all 150ms ease !important;
          }
          
          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            border-color: #3690CE !important;
            box-shadow: 0 0 0 2px rgba(54, 144, 206, 0.1) !important;
            outline: none !important;
          }
          
          /* Trust indicators */
          .security-notice {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            color: #10B981 !important;
            font-size: clamp(0.75rem, 2.5vw, 0.875rem) !important;
            font-weight: 500 !important;
            margin-top: 16px !important;
          }
          
          /* Grid layout for larger screens */
          @media (min-width: 768px) {
            .premium-home-wrapper {
              display: grid;
              grid-template-columns: 1fr;
              gap: clamp(16px, 4vw, 32px);
              max-width: 1200px;
              margin: 0 auto;
            }
          }
          
          /* Responsive spacing */
          .app-container {
            padding: clamp(16px, 4vw, 32px) !important;
          }
        `}</style>
        
        {/* Render existing HomePage with premium styling */}
        <HomePage {...props} />
      </div>
    </PaymentLayout>
  );
};

export default PremiumHomePage;
