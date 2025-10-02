#!/usr/bin/env node

// Debug script to help identify web app startup issues
const fs = require('fs');
const path = require('path');

console.log('🔍 WhatsApp Chat Web App - Startup Diagnostics');
console.log('================================================');

// Check if we're in the right directory
const currentDir = process.cwd();
console.log(`📁 Current directory: ${currentDir}`);

// Check if package.json exists
const packageJsonPath = path.join(currentDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('✅ package.json found');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`📦 Package name: ${packageJson.name}`);
    console.log(`📦 Package version: ${packageJson.version}`);
  } catch (error) {
    console.log('❌ Error reading package.json:', error.message);
  }
} else {
  console.log('❌ package.json not found');
}

// Check if node_modules exists
const nodeModulesPath = path.join(currentDir, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules found');
} else {
  console.log('❌ node_modules not found - run npm install');
}

// Check if src directory exists
const srcPath = path.join(currentDir, 'src');
if (fs.existsSync(srcPath)) {
  console.log('✅ src directory found');
  
  // Check main files
  const mainFiles = ['main.tsx', 'App.tsx', 'index.html'];
  mainFiles.forEach(file => {
    const filePath = file === 'index.html' ? path.join(currentDir, file) : path.join(srcPath, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} found`);
    } else {
      console.log(`❌ ${file} not found`);
    }
  });
} else {
  console.log('❌ src directory not found');
}

// Check if vite.config.ts exists
const viteConfigPath = path.join(currentDir, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  console.log('✅ vite.config.ts found');
} else {
  console.log('❌ vite.config.ts not found');
}

// Check key dependencies
console.log('\n📦 Checking key dependencies...');
const keyDeps = ['react', 'react-dom', 'vite', '@vitejs/plugin-react'];
keyDeps.forEach(dep => {
  const depPath = path.join(nodeModulesPath, dep);
  if (fs.existsSync(depPath)) {
    console.log(`✅ ${dep} installed`);
  } else {
    console.log(`❌ ${dep} missing`);
  }
});

console.log('\n🚀 Startup Commands:');
console.log('1. Install dependencies: npm install');
console.log('2. Start dev server: npm run dev');
console.log('3. Check browser console for errors');
console.log('4. Verify server is running on http://localhost:3000');

console.log('\n🔧 Troubleshooting:');
console.log('- If npm install fails, try: rm -rf node_modules package-lock.json && npm install');
console.log('- If port 3000 is busy, kill the process: lsof -ti:3000 | xargs kill -9');
console.log('- Check browser developer tools for JavaScript errors');
console.log('- Try opening http://localhost:3000 in incognito mode');