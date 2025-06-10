// src/structure/Footer.tsx
import React from 'react';
import '../styles/Footer.css';

const Footer: React.FC = () => (
  <footer className="footer">
    <div className="footer__bottom">
      <div className="footer__copyright">
        All copyright is reserved entirely on behalf of Helix Law Limited. Helix Law
        and applicable logo are exclusively owned trademarks registered with the
        Intellectual Property Office under numbers UK00003984532 and
        UK00003984535. The trademarks should not be used, copied or replicated
        without consent. Helix Law Limited is regulated by the SRA, our SRA ID is
        565557.
      </div>

      <div className="footer__conditions">
        <ul id="menu-conditions-menu" className="menu">
          <li className="menu-item">
            <a href="https://helix-law.co.uk/transparency/">
              Transparency, Complaints, Timescales and VAT
            </a>
          </li>
          <li className="menu-item">
            <a href="https://helix-law.co.uk/cookies-policy/">Cookies Policy</a>
          </li>
          <li className="menu-item">
            <a href="https://helix-law.co.uk/privacy-policy/">Privacy Policy</a>
          </li>
          <li className="menu-item">
            <a href="https://helix-law.co.uk/terms-and-conditions/">
              Terms and Conditions
            </a>
          </li>
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;

