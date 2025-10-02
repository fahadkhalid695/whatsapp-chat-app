# Web App Troubleshooting Guide

## Issue: Blank Page / No Display

If the web app shows a blank page or nothing displays, follow these steps:

### Step 1: Run Diagnostics

```bash
cd packages/web
node debug-startup.js
```

### Step 2: Check Browser Console

1. Open browser (Chrome/Firefox)
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for error messages (red text)
5. Take note of any errors

### Step 3: Verify Basic Setup

```bash
# Check if you're in the right directory
pwd
# Should show: .../whatsapp-chat-app/packages/web

# Check if dependencies are installed
ls node_modules
# Should show many folders

# If node_modules is missing:
npm install
```

### Step 4: Try Minimal Setup

If the main app doesn't work, try with minimal dependencies:

```bash
# Backup current package.json
cp package.json package.json.backup

# Use minimal package.json
cp package-minimal.json package.json

# Clean install
rm -rf node_modules package-lock.json
npm install

# Start dev server
npm run dev
```

### Step 5: Check Network/Port Issues

```bash
# Check if port 3000 is available
lsof -i :3000

# If something is using port 3000, kill it:
lsof -ti:3000 | xargs kill -9

# Or use a different port:
npm run dev -- --port 3001
```

### Step 6: Manual Verification

1. **Check if Vite starts:**
   ```bash
   npm run dev
   ```
   Should show: "Local: http://localhost:3000"

2. **Open browser manually:**
   - Go to http://localhost:3000
   - Should see "Loading WhatsApp Chat App..." initially
   - Then should see the green "WhatsApp Chat App" heading

3. **Check browser console:**
   - Should see logs starting with 🚀
   - Should NOT see any red error messages

### Step 7: Common Issues & Solutions

#### Issue: "Cannot resolve dependency"
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "Port 3000 already in use"
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- --port 3001
```

#### Issue: "Module not found"
```bash
# Check if file exists
ls src/main.tsx
# If missing, the file was deleted or moved
```

#### Issue: Browser shows "This site can't be reached"
- Check if `npm run dev` is still running
- Check if you're using the correct URL (http://localhost:3000)
- Try refreshing the page (Ctrl+F5)

#### Issue: Page loads but shows error
- Check browser console for JavaScript errors
- Look for network errors in Network tab
- Try incognito/private browsing mode

### Step 8: Reset to Working State

If nothing works, reset to a known working state:

```bash
# Go to web package directory
cd packages/web

# Reset main.tsx to minimal version
cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => (
  <div style={{ padding: '20px' }}>
    <h1 style={{ color: '#25D366' }}>WhatsApp Chat</h1>
    <p>✅ React is working!</p>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
EOF

# Start dev server
npm run dev
```

### Step 9: Get Help

If you're still having issues, provide this information:

1. **Operating System:** (Windows/Mac/Linux)
2. **Node.js version:** `node --version`
3. **npm version:** `npm --version`
4. **Browser:** (Chrome/Firefox/Safari/Edge)
5. **Console errors:** (copy/paste any red error messages)
6. **Network tab errors:** (any failed requests)

### Expected Working State

When everything is working correctly:

1. **Terminal shows:**
   ```
   VITE v4.4.5  ready in 500ms
   ➜  Local:   http://localhost:3000/
   ➜  Network: use --host to expose
   ```

2. **Browser shows:**
   - Green "WhatsApp Chat App" heading
   - "✅ React is working!" message
   - "Test Button" that shows alert when clicked

3. **Console shows:**
   ```
   🚀 Starting WhatsApp Chat Web App...
   ✅ Root element found, creating React root...
   ✅ React root created, rendering test component...
   ✅ Test component rendered successfully!
   ```