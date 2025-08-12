# 🚂 Railway Simple Deployment (No Configuration Files)

## The Nixpacks Error Fix

The error `undefined variable 'npm-9_x'` happens because Railway's nixpacks doesn't recognize that package name.

## Solution: Let Railway Auto-Detect Everything

**Delete these files to let Railway auto-detect:**
- `nixpacks.toml` 
- `railway.toml`

## Step-by-Step Deployment

### 1. Deploy Backend Service

1. **Railway Dashboard** → **New Project** → **Deploy from GitHub**
2. **Select your repository**
3. **Service Settings:**
   - **Name:** `wordrush-backend`
   - **Root Directory:** `server`
   - **Auto-detected:** Node.js project
4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   ```

### 2. Add Database Services

**Add MongoDB:**
1. **Add Service** → **Database** → **MongoDB**
2. **Copy the DATABASE_URL** from variables

**Add Redis:**
1. **Add Service** → **Database** → **Redis**
2. **Copy the REDIS_URL** from variables

### 3. Update Backend Environment

**Add to backend service:**
```
MONGODB_URI=${{MongoDB.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

### 4. Deploy Frontend Service

1. **Add Service** → **GitHub Repo** (same repo)
2. **Service Settings:**
   - **Name:** `wordrush-frontend`
   - **Root Directory:** `client`
   - **Auto-detected:** Next.js project
3. **Environment Variables:**
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://wordrush-backend-[id].railway.app
   ```

## Quick Fix for Current Error

If you're getting the nixpacks error right now:

1. **Delete** `nixpacks.toml` file
2. **Go to Railway Dashboard**
3. **Service Settings** → **Redeploy**
4. **Railway will auto-detect** your Node.js project

## What Railway Will Auto-Detect

**For Backend (server/ directory):**
- Node.js 18
- `npm install` 
- `npm start`
- Port 5000

**For Frontend (client/ directory):**
- Next.js project
- `npm install`
- `npm run build`
- `npm start`
- Port 3000

## Expected Result

- **Backend:** `https://wordrush-backend-[id].railway.app`
- **Frontend:** `https://wordrush-frontend-[id].railway.app`
- **Game works** with real-time multiplayer!

Railway's auto-detection is often more reliable than custom configurations.
