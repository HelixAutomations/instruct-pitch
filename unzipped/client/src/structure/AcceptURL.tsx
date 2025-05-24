import React from 'react';
import '../styles/HomePage.css';

const AcceptURL: React.FC = () => (
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
      <h1>✅ Payment Successful</h1>
      <p>Thank you for your payment.</p>
    </div>
  </div>
);

export default AcceptURL;