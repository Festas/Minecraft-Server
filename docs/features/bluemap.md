← [Back to Features](./README.md) | [Documentation Home](../README.md)

---

# BlueMap Setup Guide for festas_builds Server

BlueMap is a powerful 3D web-based live map for your Minecraft server. Players can explore your world in real-time through their web browser!

**Setup Difficulty:** ⭐⭐ Medium  
**Target Audience:** Server Administrators  
**Estimated Setup Time:** 30-60 minutes

---

## 📋 Dependencies

**Required Plugins:**
- BlueMap (auto-installable via plugins.json)

**Required Software:**
- Nginx (for reverse proxy)
- Certbot (for SSL/HTTPS)

**Server Requirements:**
- At least 4GB RAM (rendering is memory-intensive)
- Port 8100 accessible (or use reverse proxy)
- Domain or subdomain (e.g., `map.festasbuilds.com`)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)
6. [Domain & Subdomain Setup](#domain--subdomain-setup)
7. [SSL Certificate (HTTPS)](#ssl-certificate-https)
8. [First Render](#first-render)
9. [Embedding the Map](#embedding-the-map)
10. [Optimization](#optimization)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### For Admins

**BlueMap** creates a beautiful 3D map of your Minecraft worlds that can be viewed in a web browser. Features include:

- 🗺️ Real-time 3D world rendering
- 👤 Live player markers showing online players
- 🎨 Customizable map styles and colors
- 📱 Mobile-friendly interface
- 🔍 Search and navigation tools
- 🖼️ High-resolution tile rendering

**Demo:** https://bluecolored.de/bluemap

### For Players

Once set up, players can:
- View the server world in 3D from their browser
- See real-time player locations
- Navigate to find interesting builds
- Share coordinates with friends
- Explore on mobile devices

---

## Prerequisites

Before starting, ensure you have:

- ✅ BlueMap plugin installed (see `plugins.json` - already configured!)
- ✅ Server with at least 4GB RAM (rendering is memory-intensive)
- ✅ Nginx installed (for reverse proxy)
- ✅ Domain or subdomain (e.g., `map.festasbuilds.com`)
- ✅ Port 8100 accessible (or use reverse proxy)

---

## Installation

### Step 1: Enable BlueMap Plugin

Edit `plugins.json` and enable BlueMap:

```json
{
  "name": "BlueMap",
  "enabled": true,  // Set to true
  "category": "optional",
  "source": "github",
  "repo": "BlueMap-Minecraft/BlueMap",
  "asset_pattern": "BlueMap.*paper",
  "description": "Web-based 3D live map"
}
```

### Step 2: Install the Plugin

Run the plugin installer:

```bash
cd /home/deploy/minecraft-server
./install-plugins.sh
```

This will automatically download the latest BlueMap plugin.

### Step 3: Restart Server

```bash
sudo systemctl restart minecraft.service
```

BlueMap will generate default configuration files on first start.

---

## Configuration

### Configuration Quick Start

BlueMap creates several config files. We've provided templates in `config/bluemap/` that you should copy to your server.

**Configuration Files Location:**
```
/home/deploy/minecraft-server/plugins/BlueMap/
```

**Copy Template Configurations:**

```bash
# Copy our templates to the BlueMap plugin folder
cp config/bluemap/core.conf plugins/BlueMap/core.conf
cp config/bluemap/webserver.conf plugins/BlueMap/webserver.conf
cp config/bluemap/maps/world.conf plugins/BlueMap/maps/world.conf
```

### Key Configuration Options

#### `core.conf`
- **accept-download**: Must be `true` for BlueMap to work
- **metrics**: Helps BlueMap development (optional)
- **data**: Where BlueMap stores rendered tiles

#### `webserver.conf`
- **enabled**: Set to `true` to use built-in web server
- **port**: Default `8100` (change if needed)
- **ip**: Use `"0.0.0.0"` to allow external access

#### `maps/world.conf`
- **world**: Your world folder name (usually `"world"`)
- **name**: Display name on the map
- **player-markers**: Enable to show online players

### Restart After Configuration

```bash
sudo systemctl restart minecraft.service
```

---

## Nginx Reverse Proxy Setup

Using Nginx as a reverse proxy provides a clean URL and SSL support.

### 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### 2. Create Nginx Configuration

Copy our template:

```bash
sudo cp nginx/bluemap.conf /etc/nginx/sites-available/bluemap
```

### 3. Edit the Configuration

```bash
sudo nano /etc/nginx/sites-available/bluemap
```

**Replace** `map.your-domain.com` with your actual subdomain!

### 4. Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/bluemap /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 5. Open Firewall

```bash
sudo ufw allow 'Nginx Full'
# Or specifically:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Domain & Subdomain Setup

### Option 1: Using a Subdomain (Recommended)

1. Go to your domain registrar's DNS management
2. Add an **A record**:
   - **Host**: `map` (or `bluemap`)
   - **Points to**: Your server IP address
   - **TTL**: 3600 (or auto)

Example: `map.festasbuilds.com` → `your.server.ip`

### Option 2: Using Main Domain

1. Add an **A record**:
   - **Host**: `@` or blank
   - **Points to**: Your server IP address

### DNS Propagation

Wait 5-60 minutes for DNS changes to propagate. Check with:

```bash
dig map.your-domain.com
# or
nslookup map.your-domain.com
```

---

## SSL Certificate (HTTPS)

Secure your map with a free Let's Encrypt SSL certificate.

### 1. Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obtain Certificate

```bash
sudo certbot --nginx -d map.your-domain.com
```

Certbot will:
- Verify domain ownership
- Install SSL certificate
- Auto-configure Nginx for HTTPS
- Set up auto-renewal

### 3. Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

Certbot automatically renews certificates before they expire!

### 4. Access Your Map

Visit: `https://map.your-domain.com`

---

## First Render

BlueMap needs to render your world before it's visible on the map.

### Start a Full Render

In-game (as admin) or via console:

```
/bluemap reload
/bluemap render world
```

Or render all worlds:

```
/bluemap render
```

### Monitor Progress

```
/bluemap
```

This shows render progress for each world.

### Render Commands

| Command | Description |
|---------|-------------|
| `/bluemap` | Show status and help |
| `/bluemap reload` | Reload configuration |
| `/bluemap render <world>` | Render specific world |
| `/bluemap render` | Render all worlds |
| `/bluemap pause` | Pause rendering |
| `/bluemap resume` | Resume rendering |
| `/bluemap cancel` | Cancel render tasks |

### Background Rendering

BlueMap can render in the background while the server runs. The initial render may take **30 minutes to several hours** depending on:
- World size
- Render quality settings
- Server CPU/RAM
- Server load

**Tip:** Start renders during low-traffic times!

---

## Embedding the Map

### On a Website

Use an iframe:

```html
<iframe 
  src="https://map.your-domain.com" 
  width="100%" 
  height="600" 
  frameborder="0">
</iframe>
```

### On Twitch/YouTube

1. Copy the map URL: `https://map.your-domain.com`
2. Add to stream description or pinned comment
3. Use OBS Browser Source for live streams:
   - Add Browser Source
   - URL: `https://map.your-domain.com`
   - Width: 1920, Height: 1080

### Discord Server

Share in your Discord announcements:

```
🗺️ **Live Server Map**
Explore our world in 3D: https://map.your-domain.com

See where everyone is building!
```

---

## Optimization

### Reduce Render Time

Edit `config/bluemap/maps/world.conf`:

```hocon
# Lower quality = faster renders
hires-tile-size: 64  # Default: 32, Higher = faster but lower quality

# Disable cave rendering (saves significant time)
cave-detection-enabled: false
```

### Limit Render Distance

```hocon
# Render only within certain bounds
render-edges: false

# Or use min/max coordinates
min-y: 0
max-y: 256
```

### Schedule Renders

Use cron to render automatically:

```bash
crontab -e
```

Add (render every night at 3 AM):

```cron
0 3 * * * screen -dmS bluemap-render /usr/bin/rcon-cli "bluemap render"
```

### Update Maps Periodically

BlueMap auto-updates regions as they change, but force a re-render periodically:

```bash
# Weekly full re-render
0 3 * * 0 screen -dmS bluemap-render /usr/bin/rcon-cli "bluemap render world"
```

---

## 📸 Screenshots

### Adding Screenshots

To add screenshots to this documentation:

1. Take screenshots of the BlueMap interface
2. Save them in `docs/features/images/bluemap/`
3. Add references in this section:

```markdown
![BlueMap Overview](./images/bluemap/overview.png)
![Player Markers](./images/bluemap/player-markers.png)
![Mobile View](./images/bluemap/mobile-view.png)
```

**Recommended Screenshots:**
- Main map view with player markers
- Mobile interface
- Different map styles
- Configuration examples

---

## Troubleshooting

### Map Not Loading

**Check if BlueMap web server is running:**

```bash
curl http://localhost:8100
```

If it fails:
- Verify `webserver.conf` has `enabled: true`
- Check port 8100 isn't used by another service: `sudo lsof -i :8100`
- Check server logs: `sudo journalctl -u minecraft.service -f`

### 404 Error or Blank Map

**Cause:** World not rendered yet.

**Solution:** Run initial render:

```
/bluemap render world
```

Wait for render to complete (check with `/bluemap`).

### Map Shows Old Terrain

**Cause:** BlueMap hasn't detected changes.

**Solution:** Force re-render:

```
/bluemap render world
```

Or purge and re-render:

```
/bluemap purge world
/bluemap render world
```

### Nginx 502 Bad Gateway

**Check BlueMap is running:**

```bash
curl http://localhost:8100
```

**Check Nginx config:**

```bash
sudo nginx -t
```

**Check Nginx error logs:**

```bash
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues

**Re-run Certbot:**

```bash
sudo certbot --nginx -d map.your-domain.com --force-renewal
```

**Check certificate expiry:**

```bash
sudo certbot certificates
```

### High RAM Usage

BlueMap rendering is memory-intensive.

**Solutions:**
- Render during off-peak hours
- Reduce `hires-tile-size` in map configs
- Disable cave rendering
- Limit render area with min/max coordinates
- Increase server RAM if possible

### Players Not Showing on Map

**Check configuration:**

Edit `config/bluemap/maps/world.conf`:

```hocon
player-markers: true
```

**Reload BlueMap:**

```
/bluemap reload
```

---

## Advanced Features

### Multiple Worlds

To render Nether and End:

1. Create configs:
   ```bash
   cp config/bluemap/maps/world.conf plugins/BlueMap/maps/nether.conf
   cp config/bluemap/maps/world.conf plugins/BlueMap/maps/end.conf
   ```

2. Edit each file:
   
   **nether.conf:**
   ```hocon
   world: "world_nether"
   name: "festas_builds Nether"
   dimension: "minecraft:the_nether"
   ```
   
   **end.conf:**
   ```hocon
   world: "world_the_end"
   name: "festas_builds The End"
   dimension: "minecraft:the_end"
   ```

3. Reload and render:
   ```
   /bluemap reload
   /bluemap render world_nether
   /bluemap render world_the_end
   ```

### Custom Map Styles

BlueMap supports custom color schemes and textures. See:
https://bluemap.bluecolored.de/wiki/customization/Styles.html

### Hide Secret Areas

Protect coordinates of hidden bases:

```hocon
# In maps/world.conf
hidden-regions: [
  { 
    type: "rect", 
    from: { x: -1000, z: -1000 }, 
    to: { x: 1000, z: 1000 } 
  }
]
```

---

## Useful Links

- **BlueMap Wiki:** https://bluemap.bluecolored.de/wiki/
- **GitHub:** https://github.com/BlueMap-Minecraft/BlueMap
- **Discord Support:** https://discord.gg/zmkyJa3

---

## Quick Reference

### Essential Commands

```bash
# In-game or console
/bluemap                    # Show status
/bluemap reload            # Reload config
/bluemap render            # Render all worlds
/bluemap render world      # Render specific world
/bluemap pause             # Pause rendering
/bluemap resume            # Resume rendering

# Server commands
sudo systemctl restart minecraft.service  # Restart server
sudo systemctl reload nginx               # Reload Nginx
sudo certbot renew                        # Renew SSL (automatic)
```

### File Locations

```
Server configs:          /home/deploy/minecraft-server/plugins/BlueMap/
Template configs:        /home/deploy/minecraft-server/config/bluemap/
Nginx config:           /etc/nginx/sites-available/bluemap
Map tiles (web files):  /home/deploy/minecraft-server/bluemap/web/
```

---

**Ready to share your world?** Follow the steps above, and your festas_builds community will be able to explore the server in beautiful 3D!

*For issues or improvements, submit a PR or open an issue on GitHub.*

---

← [Back to Features](./README.md) | [Documentation Home](../README.md)
