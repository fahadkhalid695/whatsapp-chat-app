import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>WhatsApp Chat App - Test</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ 
        backgroundColor: '#25D366', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '5px',
        marginTop: '10px'
      }}>
        This is a test component to verify the web app is displaying correctly.
      </div>
    </div>
  );
};

export default TestApp;