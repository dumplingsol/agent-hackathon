# Vercel Deployment Guide

## ❌ Error You're Seeing

```
npm error enoent Could not read package.json
```

This happens because Vercel is looking in the wrong directory.

---

## ✅ Fix: Configure Root Directory

### Method 1: Vercel Dashboard (Easiest)

1. Go to your project settings in Vercel
2. Click **"Settings"** tab
3. Scroll to **"Root Directory"**
4. Click **"Edit"**
5. Enter: **`web`**
6. Click **"Save"**
7. Go to **"Deployments"** tab
8. Click **"Redeploy"** on the latest deployment

### Method 2: Deploy Again with Correct Settings

1. Delete the failed deployment (optional)
2. Go to Vercel dashboard → **"Add New" → "Project"**
3. Import `dumplingsol/agent-hackathon` again
4. **IMPORTANT:** Before clicking "Deploy":
   - Framework Preset: **Next.js**
   - Root Directory: Click **"Edit"** and set to **`web`**
   - Build Command: (leave default) `npm run build`
   - Output Directory: (leave default) `.next`
   - Install Command: (leave default) `npm install`
5. Click **"Deploy"**

---

## 📂 Why This Happens

Our repo structure:
```
agent-hackathon/          ← Repo root (NO package.json here for web)
├── agent/               ← Agent service
│   └── package.json     ← Agent dependencies
├── web/                 ← Frontend (THIS IS WHERE VERCEL NEEDS TO LOOK!)
│   ├── package.json     ← Frontend dependencies
│   ├── app/
│   └── components/
└── program/             ← Smart contract
```

Vercel needs to:
1. Change directory to `web/`
2. Run `npm install` (finds `web/package.json`)
3. Run `npm run build` (builds Next.js app)

---

## ✅ Expected Result

Once configured correctly, Vercel will:
- ✅ Find `web/package.json`
- ✅ Install dependencies
- ✅ Build Next.js app
- ✅ Deploy to `https://your-project.vercel.app`

Build time: ~2 minutes

---

## 🔍 Verify Settings

After setting Root Directory to `web`, check:
- Build Command: `next build` ✓
- Output Directory: `.next` ✓
- Install Command: `npm install` ✓
- Node.js Version: 18.x or higher ✓

---

## 🚨 Still Having Issues?

Try this alternative:

1. Go to **"Settings" → "General"**
2. Find **"Framework Preset"**
3. Change from "Next.js" to "Other"
4. Manually set:
   - Root Directory: `web`
   - Build Command: `cd web && npm install && npm run build`
   - Output Directory: `web/.next`
   - Install Command: `cd web && npm install`

---

## ✅ Success Checklist

- [ ] Root Directory set to `web`
- [ ] Framework Preset is Next.js
- [ ] Deployment starts successfully
- [ ] Build completes without errors
- [ ] Site is live at vercel.app URL

---

Need help? Paste the full error log and I'll debug it!
