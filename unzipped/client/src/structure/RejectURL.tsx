import React from 'react';
import '../styles/HomePage.css';

const RejectURL: React.FC = () => (
  <div
    style={{
      display: 'grid',
      placeItems: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: '#f5f5f5',
      color: '#333',
    }}
  >
    <div>
      <h1>❌ Payment Failed</h1>
      <p>Your payment was not successful.</p>
    </div>
  </div>
);

export default RejectURL;