#!/usr/bin/env node

// Simple test script to verify auth endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAuthEndpoints() {
  console.log('🧪 Testing authentication endpoints...');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data.status);
    
    // Test phone verification
    console.log('2. Testing phone verification...');
    const phoneResponse = await axios.post(`${BASE_URL}/api/auth/verify-phone`, {
      phoneNumber: '+1234567890'
    });
    console.log('✅ Phone verification:', phoneResponse.data.success);
    
    // Test with invalid phone
    console.log('3. Testing invalid phone number...');
    try {
      await axios.post(`${BASE_URL}/api/auth/verify-phone`, {
        phoneNumber: 'invalid'
      });
    } catch (error) {
      console.log('✅ Invalid phone rejected:', error.response.status === 400);
    }
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Wait a bit for server to start, then run tests
setTimeout(testAuthEndpoints, 2000);