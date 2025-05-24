import React from 'react';
import '../styles/Header.css';
import helixLogo from '../assets/helixwhite.svg';

const Header: React.FC = () => (
  <header className="minimal-header">
    <div className="header-inner">
      <a href="https://helix-law.co.uk/" className="logo">
        <img src={helixLogo} alt="Helix Law" />
      </a>
    </div>
  </header>
);

export default Header;
