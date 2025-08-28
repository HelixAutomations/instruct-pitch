import React from 'react';
import { FiMail } from 'react-icons/fi';
import '../styles/Header.css';
import helixLogo from '../assets/helixwhite.svg';
import helixMark from '../assets/markwhite.svg';

const Header: React.FC = () => (
  <header className="minimal-header">
    <div className="header-inner">
      <a href="https://helix-law.co.uk/" className="logo">
        <img src={helixLogo} alt="Helix Law" className="logo-desktop" />
        <img src={helixMark} alt="Helix Law" className="logo-mobile" />
      </a>
      <div className="header-support">
        <span className="support-text">Need help?</span>
        <a
          href="mailto:support@helix-law.com"
          className="btn primary contact-btn contact-btn-desktop"
          style={{ opacity: 1 }}
        >
          Contact
        </a>
        <a
          href="mailto:support@helix-law.com"
          className="btn primary contact-btn contact-btn-mobile"
          style={{ opacity: 1 }}
          title="Need help? Email us"
        >
          <FiMail size={18} />
        </a>
      </div>
    </div>
  </header>
);

export default Header;
