# 🚂 WordRush Railway Deployment Guide

## Prerequisites
- GitHub account with your WordRush repository
- Railway account (free tier available)

## Step 1: Prepare Your Repository

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push origin main
   ```

## Step 2: Railway Project Setup

1. **Visit Railway:** https://railway.app
2. **Sign up/Login** with GitHub
3. **Create New Project** → **Deploy from GitHub repo**
4. **Select** your WordRush repository

## Step 3: Add Database Services

### Add MongoDB Service:
1. **Click "Add Service"** → **Database** → **MongoDB**
2. **Service will be created** with automatic `DATABASE_URL`

### Add Redis Service:
1. **Click "Add Service"** → **Database** → **Redis**  
2. **Service will be created** with automatic `REDIS_URL`

## Step 4: Configure Environment Variables

### Backend Service Variables:
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=${{MongoDB.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

### Frontend Service Variables:
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://${{wordrush-backend.RAILWAY_PUBLIC_DOMAIN}}
```

## Step 5: Deploy Services

1. **Backend Service:**
   - Source: `server/` directory
   - Dockerfile: `server/Dockerfile`
   - Port: 5000

2. **Frontend Service:**
   - Source: `client/` directory  
   - Dockerfile: `client/Dockerfile`
   - Port: 3000

## Step 6: Custom Domain (Optional)

1. **Go to Frontend Service** → **Settings** → **Domains**
2. **Add custom domain** or use Railway subdomain
3. **Update NEXT_PUBLIC_API_URL** if needed

## Step 7: Verify Deployment

1. **Check Service Logs** for any errors
2. **Visit your frontend URL**
3. **Test game functionality:**
   - Create room
   - Join game
   - Play rounds
   - Check real-time features

## Troubleshooting

### Common Issues:

**Database Connection:**
- Ensure MongoDB and Redis services are running
- Check environment variable names match exactly

**CORS Issues:**
- Update NEXT_PUBLIC_API_URL to match backend domain
- Verify Socket.IO connection

**Build Failures:**
- Check Dockerfile paths are correct
- Ensure all dependencies are in package.json

## Cost Estimation

**Railway Free Tier:**
- $5/month credit
- Estimated usage: $2-4/month for small-medium traffic
- Scales automatically with usage

## Support

If you encounter issues:
1. Check Railway service logs
2. Verify environment variables
3. Test locally with production build first

Your WordRush game will be live at:
`https://wordrush-[random].railway.app`

🎮 **Happy Gaming!**
