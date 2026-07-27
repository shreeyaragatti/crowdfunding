# Development Mode Toggle - Implementation Summary

## Overview
Added a **Development/Testing Mode toggle** to the BetterFund platform that allows users and admins to bypass MetaMask balance verification and create campaigns without blockchain verification.

## Changes Made

### 1. **New Context Provider** (`lib/devModeContext.js`)
- Created a React Context to manage development mode state globally
- Stores dev mode preference in `localStorage` (`betterfund:devMode`)
- Provides `useDevMode()` hook for components
- Persistent across browser sessions

### 2. **Updated App Wrapper** (`pages/_app.js`)
- Wrapped the app with `DevModeProvider`
- Dev mode state now available to all pages and components

### 3. **Home Page Toggle** (`pages/index.js`)
- Added a prominent toggle switch to enable/disable development mode
- Displays visual feedback when dev mode is active
- Toggle persists across page refreshes
- Positioned prominently below the project title

### 4. **Campaign Creation Flow** (`pages/campaign/new.js`)
- Updated to import and use the `useDevMode` hook
- When dev mode is **enabled**:
  - Users can create campaigns WITHOUT connecting MetaMask
  - No blockchain transaction is sent
  - Campaign metadata is saved with a dummy contract address
  - Success toast notification confirms the action
- When dev mode is **disabled**:
  - Normal production flow applies
  - MetaMask connection is required
  - Blockchain transaction is sent

### 5. **Improved Image Upload** (`pages/api/campaign-image.js`)
- Enhanced error handling for Supabase configuration
- Falls back to placeholder image URL if Supabase is not configured
- Allows image upload testing in dev mode without production dependencies

### 6. **Campaign Image Upload Logic** (in `pages/campaign/new.js`)
- Made image upload resilient to failures
- Returns placeholder image in dev mode if upload fails
- Logs helpful debug messages for troubleshooting

## Feature Highlights

✅ **One-click Toggle** - Simple on/off switch on the home page  
✅ **Visual Feedback** - Clear indication when dev mode is active  
✅ **Persistent** - Setting saved in browser localStorage  
✅ **No Wallet Required** - Create campaigns without MetaMask in dev mode  
✅ **No Blockchain Cost** - Skip transaction fees during development  
✅ **Fallback Images** - Use placeholder images if Supabase fails  
✅ **Production Safe** - Toggle off to return to normal operation  

## How to Use

1. **Enable Dev Mode:**
   - Go to the home page
   - Toggle the "🔧 Development Mode" switch to ON
   - You'll see confirmation: "✓ Dev mode enabled: You can create campaigns and interact without MetaMask balance verification."

2. **Create Campaign:**
   - Click "Create Campaign" button
   - Fill in campaign details (no wallet connection needed in dev mode)
   - Upload or paste an image URL
   - Click "Create"
   - Campaign is saved without blockchain transaction

3. **Disable Dev Mode:**
   - Toggle the switch back to OFF
   - Normal production flow resumes (MetaMask required)

## Testing Checklist

- [x] Build completes successfully
- [x] Dev mode toggle appears on home page
- [x] Wallet connection can be skipped with dev mode ON
- [x] Campaign creation works without blockchain verification
- [x] Placeholder images work when upload fails
- [x] Setting persists across browser refresh
- [x] Normal flow works when dev mode is OFF

## Files Modified

1. `lib/devModeContext.js` - **NEW** - Dev mode context provider
2. `pages/_app.js` - Added DevModeProvider wrapper
3. `pages/index.js` - Added dev mode toggle UI
4. `pages/campaign/new.js` - Added dev mode logic for campaign creation
5. `pages/api/campaign-image.js` - Improved error handling for fallback

## Environment Note

- Dev mode is a **client-side setting** stored in localStorage
- Does NOT require any environment variables
- Works with or without Supabase configured
- Metadata can optionally be saved (if backend is configured)
