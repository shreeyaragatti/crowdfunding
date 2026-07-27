# Development Mode - Quick Start Guide

## What is Development Mode?

Development Mode (Dev Mode) is a testing feature that allows you to:
- ✅ Create campaigns **without MetaMask wallet connection**
- ✅ Skip blockchain verification and gas fees
- ✅ Test the platform quickly during development
- ✅ Create unlimited test campaigns

## Activating Dev Mode

### Step 1: Start the Application
```bash
npm run dev
```
Open browser to `http://localhost:3000`

### Step 2: Enable Toggle on Home Page
Look for the **🔧 Development Mode** toggle switch (below the main heading)
- Toggle it **ON** (green)
- You'll see: "✓ Dev mode enabled: You can create campaigns and interact without MetaMask balance verification."

### Step 3: Create a Test Campaign
1. Click **"Create Campaign"** button
2. Fill in the form:
   - **Minimum Contribution:** `0.01` ETH (any amount)
   - **Campaign Name:** Your test campaign name
   - **Description:** Test description
   - **Image:** Upload or paste any image URL
   - **Target Amount:** `1` ETH (or any amount)
3. Click **"Create"**
4. You'll see success message: **"✓ Campaign created (Dev Mode)"**
5. Campaign redirects to home page

## What Happens in Dev Mode?

| Aspect | Normal Mode | Dev Mode |
|--------|------------|----------|
| Wallet Required? | ✅ Yes (MetaMask) | ❌ No |
| Blockchain TX | ✅ Sent to Sepolia | ❌ Skipped |
| Gas Fees | ✅ Charged | ❌ Free |
| Speed | Slow (block time) | ⚡ Instant |
| Data Saved | ✅ On-chain | ✅ Metadata only |
| Testing | Limited | Unlimited |

## Turning Off Dev Mode

Toggle the switch **OFF** (back to gray/white) to return to normal production mode where:
- MetaMask connection is required
- Blockchain transactions are sent
- Real gas fees apply

## Debugging

### Console Logs in Dev Mode
When creating a campaign in dev mode, check the browser console (F12) to see:
```
🔧 DEV MODE: Campaign creation skipped (no blockchain transaction)
{
  minimumContribution: "...",
  campaignName: "...",
  description: "...",
  imageUrl: "...",
  target: "...",
  creator: "0x..."
}
```

### Image Upload Issues?
If image upload fails:
- Dev mode automatically uses placeholder image
- Campaign still creates successfully
- Check the console for details

## Tips

💡 **Persistent Setting** - Dev mode setting is saved in your browser. It remembers your choice even after closing the browser.

💡 **No Account Needed** - In dev mode, you don't need any wallet or account setup.

💡 **Switch Anytime** - Toggle between dev mode and normal mode instantly without page reload.

💡 **Database Required** - If using local uploads, ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env` for image uploads.

## Troubleshooting

### Toggle Not Appearing?
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh page (Ctrl+Shift+R)
- Check browser console for errors

### Campaign Not Creating?
- Check browser console (F12) for error messages
- Ensure image URL or file is valid
- Try using a public image URL instead of file upload

### Want to Reset Dev Mode?
Run this in browser console:
```javascript
window.localStorage.removeItem('betterfund:devMode');
location.reload();
```

## Next Steps

After testing with Dev Mode:
1. Toggle Dev Mode OFF
2. Connect MetaMask wallet
3. Fund wallet with test ETH from Sepolia faucet
4. Create real campaigns on the blockchain
