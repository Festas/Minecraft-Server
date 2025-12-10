← [Back to Getting Started](./README.md) | [Documentation Home](../README.md)

---

# Server Icon Setup Guide 🎨

<!-- Last Updated: 2025-12-10 -->

A custom server icon makes your server instantly recognizable in players' Minecraft server lists. This guide explains how to create and add a server icon for the festas_builds community server.

---

## Requirements

### Technical Specifications
- **Format:** PNG (Portable Network Graphics)
- **Dimensions:** Exactly **64x64 pixels**
- **File Name:** Must be named `server-icon.png` (lowercase, with hyphen)
- **Location:** Server root directory (`/home/deploy/minecraft-server/`)
- **File Size:** Keep under 100KB (smaller is better)

### Design Recommendations
- **High Contrast:** Make it visible at small size
- **Clear Branding:** Use festas_builds logo or recognizable symbol
- **Readable Text:** Avoid small text - it won't be legible at 64x64
- **Brand Colors:** Use festas_builds brand colors for consistency
- **Simple Design:** Complex images become muddy at small resolution

---

## Creating Your Server Icon

### Option 1: Using Online Tools (Easiest)

**Recommended Tools:**
- **Photopea** (https://www.photopea.com/) - Free, browser-based Photoshop alternative
- **Pixlr** (https://pixlr.com/) - Free online image editor
- **Canva** (https://www.canva.com/) - Easy template-based design

**Steps:**
1. Create a new image with dimensions **64x64 pixels**
2. Design your icon or import your logo
3. Ensure the logo fits well in the square format
4. Export as PNG
5. Verify the file is exactly 64x64 pixels

### Option 2: Using Desktop Software

**For Photoshop/GIMP:**
1. Create new image: `File → New`
2. Set width and height to **64 pixels**
3. Set resolution to 72 PPI
4. Design your icon
5. Export as PNG: `File → Export As → PNG`

**For Minecraft Skin Editors:**
Some Minecraft skin editors can also create server icons (same format):
- Nova Skin Editor (https://minecraft.novaskin.me/)
- Miners Need Cool Shoes (https://www.minecraftskins.com/)

### Option 3: Convert Existing Logo

If you already have a festas_builds logo:

1. **Resize to 64x64:**
   ```bash
   # Using ImageMagick (Linux/Mac)
   convert your-logo.png -resize 64x64 server-icon.png
   
   # Using Python with Pillow
   python3 -c "from PIL import Image; img=Image.open('your-logo.png'); img.resize((64,64)).save('server-icon.png')"
   ```

2. **Online Resizing:**
   - Upload to https://imageresizer.com/
   - Set dimensions to 64x64
   - Download as PNG

---

## Design Tips

### Good Server Icon Examples
✅ **Simple logo** on solid background  
✅ **Single letter** (F for festas_builds) with distinctive styling  
✅ **Minecraft-style blocks** spelling "FB"  
✅ **Simplified version** of your YouTube/Twitch logo  

### What to Avoid
❌ Detailed photos (become blurry at 64x64)  
❌ Small text (unreadable)  
❌ Too many colors (looks messy)  
❌ Low contrast (hard to see)  

### Branding Consistency
If festas_builds has established brand colors, use them:
- Match your YouTube channel art
- Match Discord server icon
- Match social media profile pictures
- Keep visual identity consistent across platforms

---

## Installing the Server Icon

### Method 1: Via Deployment (Recommended)

1. **Add to Repository:**
   ```bash
   # On your local machine or in GitHub web interface
   # Add server-icon.png to the root of the repository
   git add server-icon.png
   git commit -m "Add festas_builds server icon"
   git push origin main
   ```

2. **Update GitHub Actions Workflow:**
   
   Edit `.github/workflows/deploy.yml` and add the icon to the file copy section:
   ```yaml
   # Add this line with the other scp commands
   scp server-icon.png ${SERVER_USER}@${SERVER_HOST}:/home/deploy/minecraft-server/
   ```

3. **Deploy:**
   The icon will be automatically deployed with the next push to main branch.

### Method 2: Manual Upload

1. **Upload via SCP:**
   ```bash
   # From your local machine
   scp server-icon.png deploy@your-server-ip:/home/deploy/minecraft-server/
   ```

2. **Upload via SFTP:**
   Use FileZilla, WinSCP, or similar:
   - Connect to your server
   - Navigate to `/home/deploy/minecraft-server/`
   - Upload `server-icon.png`

3. **Direct Creation on Server:**
   ```bash
   # SSH into your server
   ssh deploy@your-server-ip
   
   # Navigate to server directory
   cd /home/deploy/minecraft-server
   
   # Download icon from URL
   wget https://your-website.com/server-icon.png -O server-icon.png
   
   # Or use curl
   curl -o server-icon.png https://your-website.com/server-icon.png
   ```

---

## Verifying Installation

### Check File Location
```bash
# SSH into server
ssh deploy@your-server-ip

# Check if file exists
ls -lh /home/deploy/minecraft-server/server-icon.png

# Should show exactly:
# -rw-r--r-- 1 deploy deploy 1.2K Dec  3 12:00 server-icon.png
```

### Verify Dimensions
```bash
# Using ImageMagick identify
identify /home/deploy/minecraft-server/server-icon.png
# Should output: server-icon.png PNG 64x64 ...

# Using file command
file /home/deploy/minecraft-server/server-icon.png
# Should output: PNG image data, 64 x 64, ...
```

### Test in Minecraft Client

1. **Restart Server** (icon is loaded on server start):
   ```bash
   sudo systemctl restart minecraft.service
   ```

2. **Add Server in Minecraft:**
   - Open Minecraft client
   - Click "Multiplayer"
   - Click "Add Server"
   - Enter server name and IP
   - Save

3. **Check Server List:**
   - Your custom icon should appear next to the server name
   - If you see the default server icon (Minecraft dirt block), check installation

---

## Troubleshooting

### Icon Not Showing

**Problem:** Default Minecraft dirt block icon still shows

**Solutions:**
1. **Verify File Name:** Must be exactly `server-icon.png` (not Server-Icon.png or server_icon.png)
2. **Verify Location:** Must be in server root (`/home/deploy/minecraft-server/`), not in a subdirectory
3. **Verify Dimensions:** Must be exactly 64x64 pixels
4. **Restart Server:** Icon loads on server start
   ```bash
   sudo systemctl restart minecraft.service
   ```
5. **Check Permissions:**
   ```bash
   chmod 644 /home/deploy/minecraft-server/server-icon.png
   ```
6. **Refresh Client:** Remove and re-add the server in Minecraft client

### Icon Looks Blurry/Pixelated

**Problem:** Icon quality is poor

**Solutions:**
- Use vector graphics tools and export at exact size
- Don't upscale a smaller image - design at 64x64 from start
- Use PNG format, not JPEG (JPEG adds compression artifacts)
- Keep design simple and high contrast

### Icon File Too Large

**Problem:** Icon file is unnecessarily large

**Solutions:**
- Use PNG optimization tools:
  ```bash
  # Using pngcrush
  pngcrush -brute server-icon.png server-icon-optimized.png
  
  # Using optipng
  optipng -o7 server-icon.png
  ```
- Reduce color depth if possible (8-bit PNG vs 24-bit)
- Remove metadata from the PNG file

---

## Example Workflow

Here's a complete example workflow for festas_builds:

1. **Design Icon:**
   - Open Photopea (https://www.photopea.com/)
   - Create 64x64 pixel canvas
   - Add festas_builds logo or "FB" text with brand colors
   - Add subtle background or border
   - Export as PNG

2. **Add to Repository:**
   ```bash
   git add server-icon.png
   git commit -m "Add festas_builds branded server icon"
   git push origin main
   ```

3. **Update Deployment Script:**
   - Edit `.github/workflows/deploy.yml`
   - Add icon to SCP file list
   - Commit and push changes

4. **Verify Deployment:**
   - GitHub Actions deploys the icon
   - Server restarts automatically
   - Check in Minecraft client

---

## Additional Resources

- **Minecraft Wiki - Server Icon:** https://minecraft.wiki/w/Server.properties#server-icon.png
- **Image Editors:**
  - Photopea: https://www.photopea.com/
  - GIMP: https://www.gimp.org/
  - Krita: https://krita.org/
- **PNG Optimization:**
  - TinyPNG: https://tinypng.com/
  - Squoosh: https://squoosh.app/
- **Inspiration:**
  - Browse server lists for icon ideas
  - Check top Minecraft servers' icons
  - Look at brand guidelines for festas_builds

---

## Updating the Icon

To change your server icon later:

1. Create new `server-icon.png` with same specifications
2. Replace the old file (via deployment or manual upload)
3. Restart server: `sudo systemctl restart minecraft.service`
4. Players will see new icon next time they refresh their server list

**Note:** Players may need to refresh their server list or restart their Minecraft client to see the updated icon immediately.

---

*Remember: Your server icon is part of your brand. Make it count!*

---

## Next Steps

- 📖 [Deployment Guide](./deployment.md) - Full server deployment
- 🌐 [Bedrock Edition Setup](./bedrock-setup.md) - Enable cross-platform play
- ✅ [Launch Checklist](./launch-checklist.md) - Pre-launch validation
- 🔧 [Administration](../admin/) - Server management

---

← [Back to Getting Started](./README.md) | [Documentation Home](../README.md)
