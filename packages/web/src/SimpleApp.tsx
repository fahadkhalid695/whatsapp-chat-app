import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';

// Simple Login Component
const SimpleLogin: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Phone number entered: ${phoneNumber}`);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', color: '#25D366', marginBottom: '1rem' }}>
          WhatsApp Chat
        </h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>
          Enter your phone number to get started
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="tel"
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              marginBottom: '1rem'
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Send Verification Code
          </button>
        </form>
        
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '1rem' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

// Simple Chat Component
const SimpleChat: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Chat Interface</h1>
      <p>This is where the chat interface would be.</p>
      <Link to="/login">Back to Login</Link>
    </div>
  );
};

// Main App Component
const SimpleApp: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<SimpleLogin />} />
        <Route path="/chat" element={<SimpleChat />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default SimpleApp;