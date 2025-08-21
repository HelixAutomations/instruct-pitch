/**
 * Premium Payment Layout Component
 * 
 * Provides the overall layout structure for premium payment flow
 * - Helix branded header with logo and support link
 * - Clean, minimal container with proper spacing
 * - Responsive design with mobile-first approach
 */

import React from 'react';
import logoMark from '../../assets/dark blue mark.svg';
import '../../styles/premium/premiumComponents.css';

interface PaymentLayoutProps {
  children: React.ReactNode;
  /** Optional support contact details */
  supportPhone?: string;
  supportEmail?: string;
  /** Custom logo override */
  logoSrc?: string;
  logoAlt?: string;
}

export const PaymentLayout: React.FC<PaymentLayoutProps> = ({
  children,
  supportPhone = '+44 20 7183 6832',
  supportEmail = 'support@helixlaw.co.uk',
  logoSrc = logoMark, // Default to existing logo
  logoAlt = 'Helix Law',
}) => {
  // Create support link - prefer phone on mobile, email on desktop
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const supportHref = isMobile && supportPhone 
    ? `tel:${supportPhone}` 
    : `mailto:${supportEmail}`;
  const supportText = isMobile && supportPhone 
    ? 'Call Support' 
    : 'Email Support';

  return (
    <div className="premium-payment-layout">
      {/* Header with logo and support */}
      <header className="premium-payment-header">
        <div className="premium-logo-container">
          <img 
            src={logoSrc} 
            alt={logoAlt}
            className="premium-payment-logo"
          />
        </div>
        
        <nav className="premium-header-nav">
          <a 
            href={supportHref}
            className="premium-support-link"
            aria-label={`Contact support: ${supportPhone || supportEmail}`}
          >
            {supportText}
          </a>
        </nav>
      </header>

      {/* Main content container */}
      <main className="premium-payment-container">
        {children}
      </main>

      {/* Optional footer with trust indicators */}
      <footer className="premium-payment-footer">
        <div className="premium-payment-container">
          <div className="premium-trust-footer">
            <div className="premium-trust-indicator">
              <svg className="premium-trust-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secure Payment Processing</span>
            </div>
            
            <div className="premium-company-info">
              <span className="premium-caption">
                Helix Law Ltd. Regulated by the Solicitors Regulation Authority
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PaymentLayout;
