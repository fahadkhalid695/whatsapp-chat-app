#!/usr/bin/env node

// Simple startup script for minimal backend
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting WhatsApp Chat Backend (Minimal Mode)...');

// Set environment variables for minimal mode
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '3001';
process.env.HOST = process.env.HOST || 'localhost';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
process.env.SMS_PROVIDER = process.env.SMS_PROVIDER || 'mock';

// Start the minimal server
const serverPath = path.join(__dirname, 'src', 'minimal-index.ts');
const child = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  child.kill('SIGTERM');
});