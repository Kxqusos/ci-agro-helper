# CI Agro Helper - Production Deployment Runbook

This runbook describes the complete process for deploying the CI Agro Helper MVP stack (auth, recommendations, frontend) to an App server with external Nginx Proxy Manager (NPM).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ NPM Server (separate server)                               │
│ - Domain: https://app.example.com (port 443)              │
│ - SSL/TLS: Let's Encrypt                                  │
│ - Proxy: All traffic → http://APP_SERVER_IP:3000         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ App Server (Docker Compose stack)                          │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │ Frontend (Next.js) - Port 3000              │           │
│  │ - Serves UI (/, /auth, /history, etc.)     │           │
│  │ - BFF API routes (/api/auth/*, /api/recommendations/*) │
│  └─────────────────────────────────────────────┘           │
│           ↓                           ↓                     │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │ Auth Service     │      │ Recommendations  │           │
│  │ (FastAPI)        │      │ (FastAPI)        │           │
│  │ Port: 8000       │      │ Port: 8000       │           │
│  │ (internal only)  │      │ (internal only)  │           │
│  └──────────────────┘      └──────────────────┘           │
│           ↓                           ↓                     │
│  ┌─────────────────────────────────────────────┐           │
│  │ PostgreSQL + PostGIS                        │           │
│  │ Port: 5432                                  │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │ Kafka (event bus - optional for MVP)       │           │
│  │ Port: 9092                                  │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Key principles:**
- **Single external port**: Only port 3000 (frontend) is accessible from outside
- **Internal communication**: Backend services (auth, recommendations) communicate via Docker network
- **BFF pattern**: Frontend acts as Backend-for-Frontend, proxying all API requests
- **No direct backend access**: Browsers never directly contact auth:8000 or recommendations:8000

## Prerequisites

### On App Server

- [ ] Docker Engine 24.0+ installed
- [ ] Docker Compose V2 installed
- [ ] Git installed
- [ ] Ports available: 3000 (frontend), 5432 (postgres), 9092 (kafka)
- [ ] Sufficient disk space: ~10GB for images + data
- [ ] Sufficient RAM: ~4GB minimum

### On NPM Server

- [ ] Nginx Proxy Manager installed and running
- [ ] Access to DNS management for domain (app.example.com)
- [ ] SSL certificate ready (Let's Encrypt recommended)

### Credentials & Secrets

- [ ] Strong PostgreSQL password
- [ ] JWT secret (32+ random bytes)
- [ ] Optional: Planet Labs API key, Weather API key

## Step 1: Prepare App Server

### 1.1 Clone Repository

```bash
# SSH to App server
ssh user@app-server-ip

# Clone repository
git clone https://github.com/your-org/ci-agro-helper.git
cd ci-agro-helper

# Checkout desired version/tag (optional)
git checkout main  # or specific tag: v1.0.0
```

### 1.2 Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with production values
nano .env  # or vim, vi, etc.
```

**CRITICAL: Update these values in `.env`:**

```bash
# Database - Use strong password!
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>

# JWT Authentication - Generate with: openssl rand -hex 32
JWT_SECRET=<RANDOM_64_CHAR_HEX_STRING>
SECRET_KEY=<SAME_AS_JWT_SECRET>

# Token expiration (in seconds)
ACCESS_TOKEN_EXPIRES=3600        # 1 hour
REFRESH_TOKEN_EXPIRES=2592000    # 30 days

# Frontend BFF URLs (use Docker service names)
AUTH_SERVICE_URL=http://auth:8000
RECOMMENDATIONS_SERVICE_URL=http://recommendations:8000

# Kafka (optional for MVP - keep false)
KAFKA_ENABLED=false

# Optional: External API keys (if using satellite/weather features)
# PLANET_API_KEY=your-key-here
# WEATHER_API_KEY=your-key-here
```

**Generate secure secrets:**

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate strong database password
openssl rand -base64 24
```

### 1.3 Verify Configuration

```bash
# Check .env has all required variables
grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|AUTH_SERVICE_URL|RECOMMENDATIONS_SERVICE_URL)=" .env
```

## Step 2: Initialize Database and Seed Data

### 2.1 Start Database

```bash
# Start only PostgreSQL
docker compose up -d postgres

# Wait for healthy status
docker compose ps postgres

# Check logs if needed
docker compose logs -f postgres
```

### 2.2 Seed Recommendation Rules

**Note:** This step is from Ticket 0020 - ensure rule seeding is completed first.

```bash
# Enter recommendations container (after it's built in next step)
# See recommendations/README.md for seeding instructions
```

### 2.3 Create Demo User

```bash
# Run demo user seed script
cd auth
python seed_demo_user.py

# Expected output:
# ✓ Demo user created successfully!
#   Email: demo-agronom@local
#   Password: Demo123!
```

**Demo user credentials:**
- Email: `demo-agronom@local`
- Password: `Demo123!`

Store these credentials securely for demonstrations and testing.

## Step 3: Build and Start All Services

### 3.1 Build Docker Images

```bash
# Return to project root
cd /path/to/ci-agro-helper

# Build all services (this may take 5-10 minutes)
docker compose build postgres kafka auth recommendations frontend
```

### 3.2 Start Complete Stack

```bash
# Start all services in background
docker compose up -d postgres kafka auth recommendations frontend

# Alternative: Start with build in one command
docker compose up -d --build postgres kafka auth recommendations frontend
```

### 3.3 Verify All Services Are Running

```bash
# Check service status
docker compose ps

# Expected output: All services show "Up" status
# NAME              STATUS
# postgres          Up (healthy)
# kafka             Up (healthy)
# auth              Up (healthy)
# recommendations   Up (healthy)
# frontend          Up (healthy)
```

## Step 4: Verify Service Health

### 4.1 Check Backend Services

```bash
# Auth service health
curl http://localhost:8001/healthz
# Expected: {"status": "healthy"}

# Recommendations service health
curl http://localhost:8002/healthz
# Expected: {"status": "healthy"}
```

### 4.2 Check Frontend Service

```bash
# Frontend health endpoint
curl http://localhost:3000/api/health
# Expected: {"status":"healthy","service":"frontend","timestamp":"...","uptime":...}

# Frontend homepage (should return HTML)
curl -I http://localhost:3000/
# Expected: HTTP/1.1 200 OK
```

### 4.3 Check Logs for Errors

```bash
# View logs for all services
docker compose logs --tail=50

# View logs for specific service
docker compose logs -f auth
docker compose logs -f recommendations
docker compose logs -f frontend

# Check for any ERROR or CRITICAL messages
docker compose logs | grep -i error
```

## Step 5: Configure Nginx Proxy Manager

### 5.1 Create Proxy Host

1. **Access NPM Admin Panel**
   - Navigate to `http://npm-server-ip:81`
   - Login with admin credentials

2. **Add New Proxy Host**
   - Click "Proxy Hosts" → "Add Proxy Host"

3. **Configure Details Tab:**
   - **Domain Names:** `app.example.com`
   - **Scheme:** `http`
   - **Forward Hostname/IP:** `APP_SERVER_IP` (your App server's IP)
   - **Forward Port:** `3000`
   - **Cache Assets:** ✓ (enabled)
   - **Block Common Exploits:** ✓ (enabled)
   - **Websockets Support:** ✓ (enabled, for future SSE/WebSocket features)

4. **Configure SSL Tab:**
   - **SSL Certificate:** "Request a new SSL Certificate"
   - **Force SSL:** ✓ (enabled)
   - **HTTP/2 Support:** ✓ (enabled)
   - **HSTS Enabled:** ✓ (enabled)
   - **Email Address for Let's Encrypt:** your-email@example.com
   - **Agree to Let's Encrypt Terms:** ✓

5. **Save Configuration**

### 5.2 Configure DNS

Update DNS records for your domain:

```
Type: A
Name: app (or @)
Value: NPM_SERVER_IP
TTL: 300 (or default)
```

Wait for DNS propagation (check with: `nslookup app.example.com`)

### 5.3 Test SSL Certificate

```bash
# Test HTTPS connection
curl -I https://app.example.com

# Expected: HTTP/2 200
# Expected: SSL certificate valid

# Check SSL certificate details
openssl s_client -connect app.example.com:443 -servername app.example.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

## Step 6: End-to-End Smoke Test

### 6.1 Access Application

1. **Open Browser**
   - Navigate to: `https://app.example.com`
   - Verify: Page loads without SSL errors

2. **Test Authentication**
   - Navigate to: `https://app.example.com` (or auth page if exists)
   - Login with demo user:
     - Email: `demo-agronom@local`
     - Password: `Demo123!`
   - Verify: Login succeeds, receives tokens

3. **Test Recommendations API**
   - Using browser dev tools or Postman:
     ```bash
     # Get auth token first (from login response)
     TOKEN="<access_token_from_login>"

     # Request recommendations
     curl -X POST https://app.example.com/api/recommendations/query \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer $TOKEN" \
       -d '{
         "field_id": "test-field-001",
         "current_crop": "wheat",
         "soil_type": "loam",
         "region": "central",
         "year": 2025
       }'
     ```
   - Verify: Response contains `request_id`, recommendations array, reasons, warnings

4. **Test Metrics Endpoint**
   ```bash
   curl http://APP_SERVER_IP:8002/metrics
   # Expected: Prometheus metrics output
   ```

### 6.2 Verify Single-Port Architecture

```bash
# From external network (NOT from App server)
# Test that backend ports are NOT accessible
curl http://APP_SERVER_IP:8001/healthz
# Expected: Connection refused or timeout

curl http://APP_SERVER_IP:8002/healthz
# Expected: Connection refused or timeout

# Only frontend should be accessible
curl http://APP_SERVER_IP:3000/api/health
# Expected: {"status":"healthy",...}
```

### 6.3 Check Audit Logs

```bash
# On App server, check recommendations audit logs
docker compose exec recommendations ls -l /app/recommendations.audit

# View recent audit entries
docker compose exec recommendations tail -n 20 /app/recommendations.audit
```

## Step 7: Security Hardening (Production)

### 7.1 Disable Development Ports

**IMPORTANT:** For production deployment, comment out backend port mappings:

Edit `docker-compose.yml`:

```yaml
services:
  auth:
    # ports:  # COMMENTED OUT for production
    #   - "8001:8000"

  recommendations:
    # ports:  # COMMENTED OUT for production
    #   - "8002:8000"

  frontend:
    ports:
      - "3000:3000"  # KEEP THIS - only external port
```

Then restart services:

```bash
docker compose down
docker compose up -d
```

### 7.2 Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Frontend (from NPM server only - see note below)
sudo ufw enable

# BETTER: Restrict port 3000 to NPM server IP only
sudo ufw allow from NPM_SERVER_IP to any port 3000 proto tcp
```

### 7.3 Enable Automated Updates (Optional)

```bash
# Auto-pull and restart on updates (example with watchtower)
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --cleanup \
  --interval 3600
```

## Step 8: Monitoring & Maintenance

### 8.1 View Container Status

```bash
# Check running containers
docker compose ps

# Check resource usage
docker stats
```

### 8.2 View Logs

```bash
# Tail logs for all services
docker compose logs -f

# View last 100 lines for specific service
docker compose logs --tail=100 auth
docker compose logs --tail=100 recommendations
docker compose logs --tail=100 frontend
```

### 8.3 Backup Database

```bash
# Create database backup
docker compose exec postgres pg_dump -U app app > backup_$(date +%Y%m%d_%H%M%S).sql

# Schedule daily backups (crontab)
0 2 * * * cd /path/to/ci-agro-helper && docker compose exec -T postgres pg_dump -U app app | gzip > /backups/agro_$(date +\%Y\%m\%d).sql.gz
```

### 8.4 Restore Database

```bash
# Stop services
docker compose down

# Start only database
docker compose up -d postgres

# Restore from backup
cat backup_20250115_020000.sql | docker compose exec -T postgres psql -U app app

# Restart all services
docker compose up -d
```

## Step 9: Updating Application

### 9.1 Pull Latest Changes

```bash
# Navigate to project directory
cd /path/to/ci-agro-helper

# Backup current state
docker compose down
tar -czf backup_$(date +%Y%m%d).tar.gz .

# Pull latest code
git fetch origin
git checkout main  # or specific tag
git pull origin main
```

### 9.2 Rebuild and Restart

```bash
# Rebuild images with latest code
docker compose build

# Restart services
docker compose up -d

# Verify health
docker compose ps
curl http://localhost:3000/api/health
```

### 9.3 Rollback (if needed)

```bash
# Stop current version
docker compose down

# Restore from backup
tar -xzf backup_YYYYMMDD.tar.gz

# Start previous version
docker compose up -d
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs <service-name>

# Check disk space
df -h

# Check memory
free -h

# Rebuild specific service
docker compose build <service-name>
docker compose up -d <service-name>
```

### Database Connection Errors

```bash
# Verify database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U app -d app -c "SELECT 1;"

# Verify DATABASE_URL in .env matches postgres config
grep DATABASE_URL .env
```

### Frontend Can't Reach Backend

```bash
# Verify all services are on same network
docker compose exec frontend ping auth
docker compose exec frontend ping recommendations

# Check environment variables
docker compose exec frontend env | grep SERVICE_URL

# Verify BFF routes
curl http://localhost:3000/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"demo-agronom@local","password":"Demo123!"}'
```

### SSL/HTTPS Issues

```bash
# Check NPM logs
docker logs nginx-proxy-manager

# Verify DNS resolution
nslookup app.example.com

# Test certificate renewal
# In NPM: SSL Certificates → Force Renew

# Check certificate expiration
echo | openssl s_client -connect app.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Restart specific service
docker compose restart <service-name>

# Add memory limits to docker-compose.yml
services:
  frontend:
    deploy:
      resources:
        limits:
          memory: 1G
```

## Appendix A: Quick Reference Commands

```bash
# Start stack
docker compose up -d

# Stop stack
docker compose down

# Restart service
docker compose restart <service-name>

# View logs
docker compose logs -f <service-name>

# Check status
docker compose ps

# Update and restart
git pull && docker compose build && docker compose up -d

# Clean up old images/volumes
docker system prune -a
```

## Appendix B: Port Reference

| Service        | Internal Port | External Port | Access         |
|----------------|---------------|---------------|----------------|
| Frontend       | 3000          | 3000          | Public via NPM |
| Auth           | 8000          | -             | Internal only  |
| Recommendations| 8000          | -             | Internal only  |
| PostgreSQL     | 5432          | -             | Internal only  |
| Kafka          | 9092          | -             | Internal only  |

## Appendix C: Environment Variables Reference

See `.env.example` for complete list and documentation of all environment variables.

## Appendix D: Support & Contact

- **Documentation:** `README.md`, `.memory-base/tech-docs/`
- **Issues:** GitHub Issues
- **Architecture:** `.memory-base/tech-docs/modular_architecture.md`
