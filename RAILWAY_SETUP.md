# 🚂 Railway Deployment - Correct Setup

## The Issue
Railway tried to find `Dockerfile` in root directory, but your project has separate services in `server/` and `client/` directories.

## Solution: Deploy Services Separately

### Step 1: Deploy Backend Service

1. **Create New Project** on Railway
2. **Deploy from GitHub repo**
3. **Configure Backend Service:**
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Port:** `5000`

**Environment Variables for Backend:**
```
NODE_ENV=production
PORT=5000
MONGODB_URI=${{MongoDB.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

### Step 2: Deploy Frontend Service

1. **Add Service** to same Railway project
2. **Deploy from GitHub repo** 
3. **Configure Frontend Service:**
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Port:** `3000`

**Environment Variables for Frontend:**
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://[backend-service-url].railway.app
```

### Step 3: Add Database Services

1. **Add MongoDB Service:**
   - Click "Add Service" → "Database" → "MongoDB"
   - Note the `DATABASE_URL` variable

2. **Add Redis Service:**
   - Click "Add Service" → "Database" → "Redis"
   - Note the `REDIS_URL` variable

### Step 4: Update Environment Variables

**Backend Service:**
- Use the MongoDB and Redis URLs from Railway services
- Set `NODE_ENV=production`

**Frontend Service:**
- Set `NEXT_PUBLIC_API_URL` to your backend service URL
- Set `NODE_ENV=production`

## Alternative: Use Nixpacks (Recommended)

Railway can auto-detect your services without Dockerfiles:

1. **Delete** `railway.toml` (let Railway auto-detect)
2. **Deploy backend** from `server/` directory
3. **Deploy frontend** from `client/` directory
4. **Railway will automatically:**
   - Detect Node.js projects
   - Install dependencies
   - Build and start services

## Quick Fix for Current Deployment

If you're currently getting the Dockerfile error:

1. **Go to Railway Dashboard**
2. **Service Settings** → **Source**
3. **Change Root Directory** to either:
   - `server` (for backend)
   - `client` (for frontend)
4. **Redeploy**

## Expected URLs After Deployment

- **Backend API:** `https://wordrush-backend-[id].railway.app`
- **Frontend Game:** `https://wordrush-frontend-[id].railway.app`
- **MongoDB:** Internal Railway URL
- **Redis:** Internal Railway URL

Your WordRush game will be fully functional with real-time multiplayer features!
