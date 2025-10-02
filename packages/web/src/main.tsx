import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('🚀 Starting WhatsApp Chat Web App...');

// Create a simple test component first
const TestComponent = () => {
  console.log('TestComponent rendering...');
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#25D366' }}>WhatsApp Chat App</h1>
      <p>✅ React is working!</p>
      <p>✅ Component is rendering!</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <button 
        onClick={() => alert('Button works!')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#25D366',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<h1>Error: Root element not found!</h1>';
} else {
  console.log('✅ Root element found, creating React root...');
  
  try {
    const root = ReactDOM.createRoot(rootElement as HTMLElement);
    console.log('✅ React root created, rendering test component...');
    
    root.render(<TestComponent />);
    console.log('✅ Test component rendered successfully!');
  } catch (error) {
    console.error('❌ Error rendering component:', error);
    document.body.innerHTML = `<h1>Error rendering React: ${error.message}</h1>`;
  }
}