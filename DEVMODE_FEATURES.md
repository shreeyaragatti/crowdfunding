# Development Mode - Feature Documentation

## Complete Implementation

### ✅ What Was Added

#### 1. **Global Dev Mode Context** 
- File: `lib/devModeContext.js` (NEW)
- Provides state management for development mode
- Stores preference in browser localStorage
- Available to all components via `useDevMode()` hook

#### 2. **Home Page Toggle UI**
- Location: `pages/index.js` - Below page title
- Beautiful Chakra UI switch component
- Visual indicator when dev mode is active
- Persistent across sessions

#### 3. **Campaign Creation Without Verification**
- File: `pages/campaign/new.js`
- Dev mode allows campaign creation without:
  - ❌ MetaMask wallet connection
  - ❌ Blockchain gas fees
  - ❌ Ethereum network verification
- ✅ Creates dummy campaign with metadata

#### 4. **Fallback Image Handling**
- File: `pages/api/campaign-image.js`
- Uses placeholder images if upload fails
- Graceful degradation for testing
- Works without Supabase in dev mode

---

## Usage Workflow

### Enable Dev Mode (First Time)
```
1. Navigate to http://localhost:3000
2. Look for "🔧 Development Mode" toggle
3. Click to enable (toggle turns teal)
4. See success message: "✓ Dev mode enabled..."
```

### Create Test Campaign
```
1. Click "Create Campaign" button
2. Fill form (no wallet needed)
   - Campaign Name: "My Test Campaign"
   - Minimum Contribution: 0.01 ETH
   - Description: "Testing dev mode"
   - Image: Any URL or upload
   - Target: 1 ETH
3. Click "Create"
4. See "✓ Campaign created (Dev Mode)"
5. Redirected to home page
```

### Return to Normal Mode
```
1. Toggle off the "🔧 Development Mode" switch
2. System returns to production behavior
3. MetaMask connection required again
```

---

## Technical Details

### Dev Mode State Flow

```
Browser LocalStorage
      ↓
DevModeProvider (Context)
      ↓
useDevMode() hook
      ↓
pages/index.js (toggle UI)
      ↓
pages/campaign/new.js (create logic)
```

### Campaign Creation Logic in Dev Mode

```javascript
if (devMode) {
  ✓ Get accounts from web3 (may work or use dummy)
  ✓ Upload image (or use placeholder)
  ✓ Skip blockchain transaction
  ✓ Save metadata to database
  ✓ Show success toast
  ✓ Redirect to home
} else {
  // Normal production flow with blockchain
}
```

---

## Key Features

| Feature | Benefit |
|---------|---------|
| 🎯 Zero Setup | No wallet or funds needed |
| ⚡ Instant | No blockchain confirmation time |
| 💾 Persistent | Setting saved locally |
| 🔄 Switch Anytime | Toggle on/off instantly |
| 📊 Full Testing | Create unlimited test campaigns |
| 🖼️ Fallback Images | Works even if upload fails |
| 🔒 Safe | Production mode unaffected |

---

## Component Integration

### DevModeProvider (_app.js)
```jsx
<DevModeProvider>
  <NavBar />
  <Component {...pageProps} />
  <Footer />
</DevModeProvider>
```

### useDevMode Hook Usage (index.js)
```jsx
const { devMode, toggleDevMode, isLoading } = useDevMode();

<Switch
  isChecked={devMode}
  onChange={(e) => toggleDevMode(e.target.checked)}
/>
```

### Campaign Creation (new.js)
```jsx
async function onSubmit(data) {
  if (devMode) {
    // Skip blockchain, save metadata only
  } else {
    // Send blockchain transaction
  }
}
```

---

## Data Flow in Dev Mode

```
┌─────────────────────────────────────────────┐
│        User Enables Dev Mode Toggle         │
└──────────────────┬──────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Save to localStorage│
        └──────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│   User Creates Campaign Without Wallet      │
└──────────────────┬──────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Upload Image (or    │
        │  use placeholder)    │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Skip Blockchain TX  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Save Campaign       │
        │  Metadata to DB      │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Show Success Toast  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Redirect to Home    │
        └──────────────────────┘
```

---

## Error Handling

### Image Upload Failure
- Dev mode: Falls back to placeholder image
- Production: Shows error message

### Missing Supabase Config
- Dev mode: Uses placeholder images
- Production: Requires configuration

### Wallet Not Connected
- Dev mode: Creates campaign anyway
- Production: Shows "Connect Wallet" prompt

---

## Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `lib/devModeContext.js` | ✅ NEW | Dev mode state management |
| `pages/_app.js` | ✏️ MODIFIED | Added DevModeProvider wrapper |
| `pages/index.js` | ✏️ MODIFIED | Added toggle UI |
| `pages/campaign/new.js` | ✏️ MODIFIED | Added dev mode logic |
| `pages/api/campaign-image.js` | ✏️ MODIFIED | Improved error handling |
| `DEVMODE_IMPLEMENTATION.md` | ✅ NEW | Implementation details |
| `DEVMODE_QUICK_START.md` | ✅ NEW | User guide |

---

## Build Status

✅ **Build Successful** - All changes compile without errors

```
info  - Compiled successfully
info  - Generating static pages (4/4)
info  - Finalizing page optimization
```

---

## Testing Completed

- ✅ Dev mode toggle renders on home page
- ✅ Toggle state persists across refreshes
- ✅ Campaign creation works without wallet in dev mode
- ✅ Image upload fallback works
- ✅ Normal mode still requires wallet connection
- ✅ Build compiles successfully
- ✅ No TypeScript errors

---

## Next Steps

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Dev Mode**
   - Enable toggle on home page
   - Create test campaigns without wallet

3. **Switch to Normal Mode**
   - Disable toggle
   - Connect MetaMask
   - Create real campaigns on Sepolia

---

## Support & Debugging

### View Dev Mode Status in Console
```javascript
// Check if dev mode is active
window.localStorage.getItem('betterfund:devMode')
// Returns: "true" or "false"
```

### Reset Dev Mode
```javascript
// Clear the setting
window.localStorage.removeItem('betterfund:devMode');
// Reload page
location.reload();
```

### Enable Debug Logs
Check browser console (F12) to see:
- "🔧 DEV MODE: Campaign creation skipped..."
- Campaign details logged to console
- Image upload warnings if applicable
