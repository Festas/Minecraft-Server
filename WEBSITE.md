# Minecraft Server Website Documentation

This document explains the website setup for the festas_builds Minecraft server, available at `mc.festas-builds.com`.

---

## 🌐 Overview

The website is a modern, responsive landing page that provides:
- Server information and connection details
- Feature highlights
- How-to-join instructions for Java and Bedrock Edition
- Plugin showcase
- Server rules
- Links to BlueMap and Discord

The website is containerized using Docker and served via nginx, integrated with the existing Caddy reverse proxy infrastructure.

### Deployment Directory Structure

The website is deployed to a **separate directory** from the Minecraft server:

```
/home/deploy/
├── minecraft-server/     # Main Minecraft server files
│   ├── server.jar
│   ├── plugins/
│   ├── config.sh
│   └── ...
└── minecraft-website/    # Website deployment
    └── docker-compose.web.yml
```

This separation keeps the website deployment independent from the Minecraft server deployment.

---

## 🏗️ Architecture

### Components

1. **Static Website** (`website/` directory)
   - HTML, CSS, JavaScript
   - Minecraft-themed design
   - Mobile responsive

2. **Docker Container**
   - Base image: `nginx:alpine`
   - Optimized nginx configuration
   - Health checks included

3. **Reverse Proxy**
   - Managed by Caddy (Link-in-Bio repository)
   - Handles SSL/TLS termination
   - Compression and caching

4. **CI/CD Pipeline**
   - GitHub Actions workflow
   - Builds Docker image
   - Pushes to GitHub Container Registry
   - Deploys to server automatically

### Network Setup

```
Internet
   ↓
Caddy (Port 80/443)
   ↓ reverse_proxy
minecraft-web container (Port 80)
   ↓ caddy-network (Docker network)
```

---

## 📁 File Structure

```
website/
├── index.html           # Main landing page
├── css/
│   └── style.css       # Minecraft-themed styles
├── js/
│   └── main.js         # Interactive features (copy IP, etc.)
├── images/             # Images and favicons
├── Dockerfile          # Container build instructions
├── nginx.conf          # Nginx configuration
└── .dockerignore       # Files to exclude from build

docker-compose.web.yml  # Docker Compose configuration
.github/workflows/
└── deploy-website.yml  # CI/CD deployment workflow
```

---

## 🚀 Deployment

### Automatic Deployment

The website automatically deploys when changes are pushed to the `main` branch:

1. GitHub Actions builds a Docker image
2. Image is pushed to `ghcr.io/festas/minecraft-server-web:latest`
3. Server pulls the latest image
4. Container is restarted with new version

**Triggers:**
- Push to `main` branch with changes in `website/**`
- Manual workflow dispatch from GitHub Actions tab

### Manual Deployment

If you need to deploy manually:

```bash
# SSH to your server
ssh deploy@your-server-ip

# Navigate to website directory
cd /home/deploy/minecraft-website

# Copy docker-compose.web.yml if not already present
# (from minecraft-server repository)

# Build and start the container
docker-compose -f docker-compose.web.yml up -d --build
```

---

## ⚙️ Configuration

### Caddy Reverse Proxy Setup

Add the following to your Caddyfile in the `Link-in-Bio` repository:

```caddyfile
mc.festas-builds.com {
    tls eric@festas-builds.com
    encode gzip zstd
    reverse_proxy minecraft-web:80
}
```

After updating the Caddyfile:

```bash
# Reload Caddy configuration
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### DNS Configuration

Ensure your DNS records point to your server:

```
Type: A
Name: mc
Value: <your-server-ip>
TTL: 3600
```

Or use a CNAME if you prefer:

```
Type: CNAME
Name: mc
Value: festas-builds.com
TTL: 3600
```

### Docker Network

The website container must join the `caddy-network` external network. This network is automatically created during deployment if it doesn't exist.

To create it manually:

```bash
docker network create caddy-network
```

---

## 🛠️ Development

### Local Development

To work on the website locally:

```bash
# Navigate to website directory
cd website/

# Option 1: Simple HTTP server (Python)
python3 -m http.server 8000

# Option 2: Using Docker
docker build -t minecraft-web-dev .
docker run -p 8080:80 minecraft-web-dev

# Option 3: Using docker-compose
docker-compose -f docker-compose.web.yml up
```

Then visit `http://localhost:8000` (or `8080` for Docker)

### Making Changes

1. **Update Content:**
   - Edit `website/index.html` for content changes
   - Edit `website/css/style.css` for styling
   - Edit `website/js/main.js` for functionality

2. **Test Locally:**
   - Use one of the local development methods above
   - Test on different screen sizes (mobile, tablet, desktop)

3. **Commit and Push:**
   ```bash
   git add website/
   git commit -m "Update website content"
   git push origin main
   ```

4. **Automatic Deployment:**
   - GitHub Actions will automatically build and deploy
   - Check the Actions tab for deployment status

### Customization Guide

#### Update Server IP
Edit `website/index.html`:
```html
<span class="ip-address" id="serverIp">mc.festas-builds.com</span>
```

#### Update Features
Edit the `.features-grid` section in `website/index.html`

#### Add BlueMap URL
Edit `website/js/main.js`:
```javascript
const bluemapUrl = 'https://map.festas-builds.com'; // Replace '#'
```

#### Add Discord Link
Edit `website/js/main.js`:
```javascript
const discordUrl = 'https://discord.gg/your-invite'; // Replace '#'
```

#### Change Colors
Edit `website/css/style.css` in the `:root` section:
```css
:root {
    --grass-green: #7cbd54;
    --sky-blue: #7ec0ee;
    /* ... other colors ... */
}
```

---

## 🔍 Monitoring

### Check Container Status

```bash
# View running containers
docker ps | grep minecraft-web

# View container logs
docker logs -f minecraft-web

# Check health status
docker inspect minecraft-web | grep -A 5 Health
```

### Access Logs

```bash
# Nginx access logs
docker exec minecraft-web cat /var/log/nginx/access.log

# Nginx error logs
docker exec minecraft-web cat /var/log/nginx/error.log

# Follow logs in real-time
docker logs -f minecraft-web
```

### Health Check

The container includes a health check that runs every 30 seconds:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' minecraft-web
```

Possible statuses:
- `healthy` - Container is working correctly
- `unhealthy` - Container is not responding
- `starting` - Health check hasn't completed yet

---

## 🐛 Troubleshooting

### Website not accessible

1. **Check container is running:**
   ```bash
   docker ps | grep minecraft-web
   ```

2. **Check Caddy is running and configured:**
   ```bash
   docker ps | grep caddy
   docker exec caddy cat /etc/caddy/Caddyfile
   ```

3. **Verify network connection:**
   ```bash
   docker network inspect caddy-network
   ```
   Both `caddy` and `minecraft-web` should be listed.

4. **Test container directly:**
   ```bash
   docker exec minecraft-web wget -O- http://localhost/
   ```

### Container fails to start

1. **Check logs:**
   ```bash
   docker logs minecraft-web
   ```

2. **Rebuild container:**
   ```bash
   cd /home/deploy/minecraft-website
   docker-compose -f docker-compose.web.yml up -d --build
   ```

3. **Verify Dockerfile:**
   Ensure all files exist in the `website/` directory

### Changes not appearing

1. **Clear browser cache:**
   - Hard refresh: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)

2. **Verify deployment:**
   ```bash
   # Check when image was built
   docker inspect ghcr.io/festas/minecraft-server-web:latest | grep Created
   ```

3. **Force rebuild:**
   ```bash
   docker-compose -f docker-compose.web.yml up -d --build --force-recreate
   ```

### SSL/TLS Issues

SSL is handled by Caddy. If you have SSL issues:

1. **Check Caddy logs:**
   ```bash
   docker logs caddy
   ```

2. **Verify domain points to server:**
   ```bash
   nslookup mc.festas-builds.com
   ```

3. **Reload Caddy:**
   ```bash
   docker exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

---

## 📊 Performance

### Optimization

The website is optimized for performance:

- **Gzip Compression:** Enabled in nginx config
- **Static Asset Caching:** 1 year cache for CSS/JS/images
- **Minimal Container:** Using `nginx:alpine` (5MB base image)
- **CDN-ready:** Static assets can be moved to CDN if needed

### Resource Usage

Typical resource usage:
- **CPU:** < 5% (idle)
- **Memory:** ~15-30 MB
- **Disk:** ~10 MB (container + image)

Resource limits are configured in `docker-compose.web.yml`:
- Max CPU: 0.5 cores
- Max Memory: 128MB

---

## 🔐 Security

### Security Headers

The nginx configuration includes security headers:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer-when-downgrade`

### SSL/TLS

- Handled by Caddy reverse proxy
- Automatic certificate from Let's Encrypt
- Configured in Caddyfile

### Container Security

- Running as non-root user (nginx user)
- No unnecessary ports exposed
- Health checks enabled
- Resource limits applied

---

## 📚 Additional Resources

- **Nginx Documentation:** https://nginx.org/en/docs/
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/
- **Caddy Documentation:** https://caddyserver.com/docs/

---

## 🤝 Contributing

To contribute to the website:

1. Fork the repository
2. Create a feature branch
3. Make your changes in the `website/` directory
4. Test locally
5. Submit a pull request

---

## 📝 Notes

- The website is static (HTML/CSS/JS only) - no backend required
- Server status check is currently a placeholder - implement real API call if needed
- BlueMap and Discord links need to be updated with real URLs
- Consider adding analytics (Google Analytics, Plausible, etc.) if desired

---

**Questions or issues?** Open an issue on GitHub or contact the server admin.

*Last updated: December 2024*
