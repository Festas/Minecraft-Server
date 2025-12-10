# Minecraft Server Website

Modern, responsive landing page for the festas_builds Minecraft server.

## Features

- 🎮 Server IP with click-to-copy functionality
- ⚡ Dynamic Minecraft version display (managed via environment variables)
- 🎨 Enhanced visual design with gradients, animations, and modern effects
- ✨ Feature showcase
- 📖 How-to-join instructions for Java and Bedrock Edition
- 🔌 Plugin highlights
- 📜 Server rules
- 🗺️ Links to BlueMap and Discord (configurable)
- 📱 Fully responsive design
- 🌙 Dark mode friendly
- ⚡ Fast and lightweight (nginx + alpine)

## Quick Start

### Local Development

```bash
# Simple HTTP server
python3 -m http.server 8000

# Or use a VS Code extension like Live Server
```

### Docker Build

```bash
# Build the image with default version
docker build -t minecraft-web .

# Build with custom Minecraft version
docker build --build-arg MINECRAFT_VERSION=1.21.10 --build-arg SERVER_SOFTWARE=Paper -t minecraft-web .

# Run locally
docker run -p 8080:80 minecraft-web

# Visit http://localhost:8080
```

## File Structure

```
website/
├── index.html              # Main page
├── css/
│   └── style.css          # Minecraft-themed styles with enhanced visuals
├── js/
│   ├── main.js            # Interactive features
│   └── config.template.js # Configuration template (generates config.js at build time)
├── images/
│   └── favicon.svg        # Site favicon
├── Dockerfile             # Container build with env var injection
├── nginx.conf             # Web server config
└── .dockerignore          # Build exclusions
```

## Customization

### Update Minecraft Version

The Minecraft version and server software are managed via environment variables that are injected at Docker build time.

To update the version, edit `.github/workflows/deploy-website.yml`:

```yaml
build-args: |
  MINECRAFT_VERSION=1.21.10
  SERVER_SOFTWARE=Paper
```

The version will be automatically displayed in:
- The version banner at the top of the page
- The footer "Server-Info" section

### Update Server IP

Edit `index.html`:
```html
<span class="ip-address" id="serverIp">mc.festas-builds.com</span>
```

### Add BlueMap URL

Edit `js/main.js`:
```javascript
const bluemapUrl = 'https://map.festas-builds.com';
```

### Add Discord Link

Edit `js/main.js`:
```javascript
const discordUrl = 'https://discord.gg/your-invite';
```

### Change Colors

Edit `css/style.css`:
```css
:root {
    --grass-green: #7cbd54;
    --sky-blue: #7ec0ee;
    /* ... */
}
```

## Deployment

Deployment is automated via GitHub Actions. Push changes to the `website/` directory and the workflow will:

1. Build Docker image
2. Push to GitHub Container Registry
3. Deploy to server automatically

See `docs/features/website.md` for complete deployment documentation.

## Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript** - No frameworks needed
- **nginx** - High-performance web server
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Optimized for fast loading
- Gzip compression enabled
- Static assets cached for 1 year
- Minimal container footprint (~25MB)

## License

Part of the festas_builds Minecraft Server project.
