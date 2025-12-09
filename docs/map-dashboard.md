# Map & Player Dashboard Documentation

## Overview

The Map & Player Dashboard provides a live, interactive view of your Minecraft server's world map with real-time player position tracking and management capabilities. This feature integrates with popular map plugins (Dynmap or BlueMap) to bring visual server management to the web console.

## Features

- **Live World Map**: Embedded Dynmap or BlueMap showing your server's worlds
- **Real-time Player Tracking**: See player positions, health, and armor status updated every 5 seconds
- **Interactive Player Cards**: Click on players to view detailed stats including:
  - Current coordinates and world
  - Health and armor values
  - Total playtime and session count
  - Player avatar
- **Admin Actions**: Perform management tasks directly from the map (subject to RBAC):
  - Teleport to player locations
  - Kick players
  - Copy coordinates to clipboard
- **Responsive Design**: Fully functional on desktop, tablet, and mobile devices
- **Multi-World Support**: Switch between different worlds (Overworld, Nether, End, custom dimensions)

## Setup Instructions

### Prerequisites

You need to have either Dynmap or BlueMap plugin installed and configured on your Minecraft server.

### Option 1: Dynmap Setup

1. **Install Dynmap Plugin**
   - Download Dynmap from [SpigotMC](https://www.spigotmc.org/resources/dynmap.274/) or [BukkitDev](https://dev.bukkit.org/projects/dynmap)
   - Place the JAR file in your server's `plugins/` directory
   - Restart your server

2. **Configure Dynmap**
   - Edit `plugins/Dynmap/configuration.txt`
   - Ensure web server is enabled:
     ```yaml
     webserver-bindaddress: 0.0.0.0
     webserver-port: 8123
     ```
   - Configure security settings as needed
   - Restart server to apply changes

3. **Configure Console Integration**
   - Edit your console's `.env` file:
     ```bash
     DYNMAP_ENABLED=true
     DYNMAP_BASE_URL=http://your-server-ip:8123
     # DYNMAP_API_TOKEN=  # Optional: if you've configured API authentication
     ```
   - If running in Docker, use `http://host.docker.internal:8123` for the base URL
   - Restart the console backend: `docker-compose restart console`

4. **Verify Connection**
   - Access the map dashboard at `http://your-console-url/console/map.html`
   - You should see a "Map connected" status indicator
   - The embedded map should load and show your world

### Option 2: BlueMap Setup

1. **Install BlueMap Plugin**
   - Download BlueMap from [SpigotMC](https://www.spigotmc.org/resources/bluemap.83557/)
   - Place the JAR file in your server's `plugins/` directory
   - Restart your server

2. **Configure BlueMap**
   - Edit `plugins/BlueMap/core.conf`
   - Configure the integrated web server:
     ```hocon
     webserver {
       enabled: true
       port: 8100
       ip: "0.0.0.0"
     }
     ```
   - Restart server to apply changes

3. **Configure Console Integration**
   - Edit your console's `.env` file:
     ```bash
     BLUEMAP_ENABLED=true
     BLUEMAP_BASE_URL=http://your-server-ip:8100
     ```
   - Restart the console backend

4. **Verify Connection**
   - Access the map dashboard
   - Select "BlueMap" from the Map Source dropdown
   - The map should load and display your world

## Usage Guide

### Accessing the Map Dashboard

1. Log in to the web console
2. Click the "🗺️ Map" button in the navigation sidebar
3. The map dashboard will open in a new view

### Viewing Player Information

1. **Via Sidebar List**:
   - The left sidebar shows all online players
   - Click on any player to view their detailed information
   - Coordinates, world, health, and stats are displayed

2. **Player Info Modal**:
   - Avatar and display name
   - Current health and armor
   - Total playtime and session count
   - Precise coordinates in current world
   - Available admin actions (based on your role)

### Admin Actions

#### Teleport to Player (Admin/Moderator/Owner)

1. Click on a player in the sidebar
2. In the player info modal, click "📍 Teleport to Player"
3. You will be teleported to the player's location in-game

**Note**: You must be logged into the server for teleportation to work.

#### Kick Player (Admin/Moderator/Owner)

1. Open a player's info modal
2. Click "⚠️ Kick Player"
3. Confirm the action
4. The player will be kicked from the server

#### Copy Coordinates (All Roles)

1. Open any player's info modal
2. Click "📋 Copy Coords"
3. Coordinates are copied to your clipboard in format: `X Y Z`
4. You can paste these directly in-game chat with `/tp @s X Y Z`

### Auto-Refresh Settings

- **Auto-Refresh Toggle**: Enable/disable automatic player position updates
- **Refresh Interval**: Updates occur every 5 seconds when enabled
- **Manual Refresh**: Click "🔄 Refresh Now" to update immediately

### World Selection

- Use the "World" dropdown to switch between different worlds
- The map will update to show the selected world
- Player list shows players in all worlds with their current world indicated

## Role-Based Access Control (RBAC)

The Map & Player Dashboard respects the console's RBAC system:

### Viewer Role
- ✅ View the map
- ✅ See player information
- ✅ Copy coordinates
- ❌ Cannot teleport
- ❌ Cannot kick players

### Moderator Role
- ✅ All Viewer permissions
- ✅ Teleport to players
- ✅ Kick players
- ❌ Cannot perform owner-level actions

### Admin Role
- ✅ All Moderator permissions
- ✅ Full access to all map features

### Owner Role
- ✅ Full unrestricted access
- ✅ All features available

## Privacy & Security Considerations

### Data Privacy

1. **Player Location Data**:
   - Player coordinates are only visible to authenticated console users
   - Location tracking respects server whitelist and permissions
   - No location data is stored long-term in the console

2. **Player Statistics**:
   - Playtime and session data comes from the console's player tracker
   - This data is stored locally in SQLite database
   - No external services access this information

3. **Map Access**:
   - The embedded map uses the same security settings as your Dynmap/BlueMap configuration
   - If your map plugin has authentication enabled, it will apply to the embedded view
   - Consider restricting public map access if sensitive builds are visible

### Security Best Practices

1. **Enable HTTPS**: Always use HTTPS for the console in production
2. **Strong Authentication**: Use strong passwords for console accounts
3. **Map Plugin Security**: Configure Dynmap/BlueMap authentication if your server is public
4. **Network Isolation**: Consider running map plugins on a private network if possible
5. **Regular Updates**: Keep all plugins and the console up to date

### GDPR Compliance

If you operate in a jurisdiction with data protection regulations:

- **Inform Players**: Let players know their position is tracked while online
- **Data Minimization**: The map only shows online players, not historical data
- **Access Rights**: Players can request their tracked data through server admins
- **Data Deletion**: Player data can be removed from the console's player tracker database

## Troubleshooting

### Map Not Loading

**Problem**: The map shows a placeholder instead of loading

**Solutions**:
1. Check that Dynmap/BlueMap is installed and running
2. Verify the plugin's web server is accessible: `curl http://localhost:8123` (Dynmap) or `http://localhost:8100` (BlueMap)
3. Check the console backend logs: `docker-compose logs console`
4. Verify environment variables in `.env` are correct
5. Ensure firewall allows access to the map plugin's port
6. If using Docker, ensure `host.docker.internal` resolves correctly

### Players Not Showing

**Problem**: Map loads but no players are visible

**Solutions**:
1. Verify players are actually online: check in-game with `/list`
2. Check the map plugin's player visibility settings
3. Ensure player tracking is enabled in the console
4. Check browser console for JavaScript errors
5. Verify the `/api/plugins/dynmap/players-enriched` endpoint returns data

### Teleport Not Working

**Problem**: Teleport action fails or does nothing

**Solutions**:
1. Ensure you are logged into the Minecraft server
2. Verify you have the correct role (Admin/Moderator/Owner)
3. Check that RCON is properly configured and connected
4. Check console backend logs for RCON errors
5. Ensure the target player is still online

### CORS or Mixed Content Errors

**Problem**: Browser blocks map loading due to security policies

**Solutions**:
1. Ensure map plugin URL uses the same protocol (HTTP/HTTPS) as the console
2. Configure CORS headers in Dynmap/BlueMap if needed
3. Use a reverse proxy (like Caddy) to serve both console and map on the same domain
4. Check browser console for specific error messages

### Mobile Display Issues

**Problem**: Map or interface doesn't work well on mobile

**Solutions**:
1. Use the sidebar toggle button to collapse/expand the player list
2. Ensure you're using a modern mobile browser (Chrome, Safari, Firefox)
3. Try landscape orientation for larger map view
4. Clear browser cache and reload

## Configuration Reference

### Environment Variables

```bash
# Dynmap Configuration
DYNMAP_ENABLED=true|false              # Enable Dynmap integration
DYNMAP_BASE_URL=http://host:8123      # Dynmap web server URL
DYNMAP_API_TOKEN=                      # Optional API token

# BlueMap Configuration
BLUEMAP_ENABLED=true|false             # Enable BlueMap integration
BLUEMAP_BASE_URL=http://host:8100     # BlueMap web server URL
BLUEMAP_API_TOKEN=                     # Optional API token
```

### Default Ports

- **Dynmap**: 8123 (HTTP)
- **BlueMap**: 8100 (HTTP)
- **Console**: 3001 (HTTP) or 443 (HTTPS via Caddy)

## Advanced Features

### Embedding External Maps

If you host Dynmap/BlueMap on a separate server:

1. Configure the full external URL in `DYNMAP_BASE_URL`
2. Ensure CORS headers allow embedding from your console domain
3. Consider using a reverse proxy to avoid mixed content warnings

### Custom Styling

The map dashboard uses the console's theme system (dark/light mode). To customize:

1. Edit `/console/frontend/css/map.css`
2. Use CSS variables from the theme system: `var(--bg-primary)`, `var(--text-primary)`, etc.
3. Changes will apply to both themes automatically

### API Integration

You can access map data programmatically:

```bash
# Get enriched player data
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://console-url/api/plugins/dynmap/players-enriched

# Get world list
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://console-url/api/plugins/dynmap/worlds

# Get map configuration
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://console-url/api/plugins/dynmap/configuration
```

## Support

For issues or questions:

1. Check the [main console documentation](../README.md)
2. Review plugin-specific documentation:
   - [Dynmap Wiki](https://github.com/webbukkit/dynmap/wiki)
   - [BlueMap Documentation](https://bluemap.bluecolored.de/wiki/)
3. Check server logs for errors
4. Raise an issue on the project repository

## Future Enhancements

Planned features for future releases:

- [ ] Clickable player markers overlaid on map (coordinate mapping)
- [ ] Waypoint and marker management
- [ ] Custom region highlighting
- [ ] Player path tracking
- [ ] World download links
- [ ] Mobile app integration
- [ ] Multi-server support

## Credits

- **Dynmap**: Created by mikeprimm and contributors
- **BlueMap**: Created by Blue (TBlueF)
- **Console Integration**: Part of the Festas Builds Minecraft Server project

---

*Last Updated: 2024*
