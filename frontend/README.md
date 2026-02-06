# SynergySwift Frontend

## Production Build

### Build Docker Image

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.synergyswift.com/api/v1 \
  --build-arg VITE_TENANT_SUBDOMAIN=your-tenant \
  -t synergyswift-frontend:latest .
```

### Run Locally

```bash
docker run -p 80:80 synergyswift-frontend:latest
```

## Render.com Static Site Deployment

### Method 1: Render Blueprint (Recommended)

1. Create `render.yaml` in project root
2. Connect GitHub repository to Render
3. Auto-deploy on push to main

### Method 2: Manual Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: synergyswift-frontend
   - **Branch**: main
   - **Root Directory**: frontend
   - **Build Command**: npm install && npm run build
   - **Publish Directory**: dist
5. Add Environment Variables:
   - `VITE_API_BASE_URL`: Your backend API URL
   - `VITE_TENANT_SUBDOMAIN`: Your tenant subdomain
6. Click "Create Static Site"

## Environment Variables

### Development (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_TENANT_SUBDOMAIN=demo
```

### Production (.env.production)
```env
VITE_API_BASE_URL=https://your-backend-url.com/api/v1
VITE_TENANT_SUBDOMAIN=your-subdomain
```

## Features

- ✅ JWT Authentication
- ✅ Protected Routes
- ✅ Dashboard with Stats
- ✅ API Client with Interceptors
- ✅ Responsive Design (Tailwind CSS)
- ✅ TypeScript Support
- ✅ Production Optimized Build

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deployment Checklist

- [ ] Update `VITE_API_BASE_URL` in production env
- [ ] Update `VITE_TENANT_SUBDOMAIN` in production env
- [ ] Configure CORS on backend to allow frontend domain
- [ ] Test authentication flow
- [ ] Verify API connectivity
- [ ] Enable HTTPS
- [ ] Configure CDN (optional)
