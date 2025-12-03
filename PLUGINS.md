# Plugin Guide for festas_builds Community Server

This guide outlines the recommended plugins for building a scalable, well-managed community Minecraft server. Plugins are organized into phases to make the transition from a small server to a full community server manageable.

---

## 🚀 Quick Start: Auto-Install Plugins

We provide an automated plugin installation system that downloads and installs all recommended plugins with a single command:

```bash
# Install all enabled plugins
./install-plugins.sh

# Force re-download all plugins
./install-plugins.sh --force

# Update plugins to latest versions
./update-plugins.sh
```

### How It Works

1. **Configuration**: Edit `plugins.json` to enable/disable plugins
2. **Installation**: Run `./install-plugins.sh` to download enabled plugins
3. **Updates**: Run `./update-plugins.sh` to check for and install updates

See [Auto-Install System Documentation](#auto-install-system) below for complete details.

---

## Installation Instructions

### General Plugin Installation
1. Stop your server: `sudo systemctl stop minecraft.service`
2. Download the plugin JAR file from the source (links below)
3. Place the JAR file in the `plugins/` directory on your server
4. Start your server: `sudo systemctl start minecraft.service`
5. Configure the plugin by editing its config file in `plugins/PluginName/config.yml`
6. Reload the plugin with `/reload confirm` or restart the server

### Finding the Plugins Directory
After Paper runs for the first time, a `plugins/` folder will be created in your server directory:
```
/home/deploy/minecraft-server/plugins/
```

---

## Phase 1: Essential Plugins (Foundation)

These are the core plugins every community server needs for moderation, protection, and basic functionality.

### LuckPerms
**Purpose:** Advanced permission management system

**Why You Need It:** Allows you to create ranks (Member, Trusted, Moderator, Admin) and control what commands and features each rank can use.

**Download:** 
- Modrinth: https://modrinth.com/plugin/luckperms
- SpigotMC: https://www.spigotmc.org/resources/luckperms.28140/

**Quick Setup:**
```bash
# After installing, create basic groups
/lp creategroup member
/lp creategroup trusted
/lp creategroup moderator
/lp creategroup admin

# Set default group
/lp group default parent set member

# Give admin all permissions
/lp group admin permission set * true

# Give yourself admin
/lp user YourUsername parent set admin
```

**Web Editor:** Use `/lp editor` in-game to open a web-based permission editor - much easier than config files!

**Configuration Tips:**
- Use inheritance: Member → Trusted → Moderator → Admin
- Store data in MySQL for better performance (optional, for larger servers)
- Enable verbose mode when debugging permissions: `/lp verbose on`

---

### EssentialsX
**Purpose:** Core quality-of-life commands

**Why You Need It:** Provides essential commands like `/home`, `/spawn`, `/tpa`, `/warp`, kits, and more that players expect.

**Download:**
- Download from: https://essentialsx.net/downloads.html
- Get **EssentialsX** (core) and **EssentialsXSpawn** (for spawn management)

**Quick Setup:**
1. Install both EssentialsX and EssentialsXSpawn
2. Edit `plugins/Essentials/config.yml`:
   ```yaml
   # Set spawn on join
   spawn-on-join: true
   
   # Enable /home and /sethome
   sethome-multiple:
     default: 3
     trusted: 5
     vip: 10
   
   # Teleport cooldowns
   teleport-cooldown: 5
   teleport-delay: 3
   ```
3. Set spawn: `/setspawn`
4. Create warps: `/setwarp [name]`

**Configuration Tips:**
- Configure teleport cooldowns to prevent abuse
- Limit home count based on rank using LuckPerms
- Disable features you don't need in `config.yml`

---

### CoreProtect
**Purpose:** Block and chest logging - the rollback/restore tool

**Why You Need It:** Allows you to see who placed/broke blocks, opened chests, or killed entities. Essential for handling grief reports.

**Download:**
- SpigotMC: https://www.spigotmc.org/resources/coreprotect.8631/
- Modrinth: https://modrinth.com/plugin/coreprotect

**Quick Setup:**
1. Install the plugin (it works out-of-the-box)
2. Database is created automatically (SQLite by default)
3. Use MySQL for better performance (recommended for 20+ players)

**Common Commands:**
```bash
# Check who broke/placed blocks at your location
/co inspect
# Then left-click or right-click blocks

# Lookup specific player
/co lookup user:PlayerName time:24h

# Rollback griefing
/co rollback user:Griefer time:24h radius:50

# Restore if you made a mistake
/co restore user:Griefer time:24h radius:50
```

**Configuration Tips:**
- In `plugins/CoreProtect/config.yml`, adjust max-radius and max-time based on your trust level
- For larger servers, use MySQL instead of SQLite
- Enable chest-access logging for theft reports

---

### WorldGuard
**Purpose:** Region protection and zone management

**Why You Need It:** Protect spawn from being destroyed, create safe zones, PvP arenas, and control what players can do in specific areas.

**Download:**
- EngineHub: https://enginehub.org/worldguard
- Dev Builds: https://dev.bukkit.org/projects/worldguard

**Dependencies:** Requires **WorldEdit** (install WorldEdit first!)

**Quick Setup:**
1. Install WorldEdit: https://enginehub.org/worldedit
2. Install WorldGuard
3. Protect spawn area:
   ```bash
   # Select the spawn area with WorldEdit
   //wand
   # Click two corners to select a region
   
   # Create spawn region
   /region define spawn
   
   # Prevent building
   /region flag spawn build deny
   
   # Allow entry
   /region flag spawn entry allow
   ```

**Common Flags:**
- `pvp deny` - Disable PvP in region
- `mob-spawning deny` - Prevent mobs from spawning
- `use deny` - Prevent using doors, buttons, levers
- `chest-access deny` - Prevent opening chests

**Configuration Tips:**
- Create a global region with `/region define __global__` to set server-wide rules
- Use region priorities - higher numbers override lower numbers
- Add members to regions: `/region addmember [region] [player]`

---

### GriefPrevention
**Purpose:** Player land claims and automatic grief prevention

**Why You Need It:** Lets players claim and protect their own builds without admin intervention. Great for open community servers.

**Download:**
- SpigotMC: https://www.spigotmc.org/resources/griefprevention.1884/
- GitHub: https://github.com/TechFortress/GriefPrevention

**Alternative:** **Lands** (https://www.spigotmc.org/resources/lands.53313/) - More modern UI, nations system, wars (good for competitive servers)

**Quick Setup:**
1. Install GriefPrevention
2. Edit `plugins/GriefPrevention/config.yml`:
   ```yaml
   Claims:
     InitialBlocks: 100        # Blocks each new player gets
     BlocksAccruedPerHour: 100 # Blocks gained per hour of playtime
     MaxAccruedBlocks: 80000   # Maximum claim blocks
   ```
3. Give yourself a claim tool: `/kit claimtool` (golden shovel by default)

**Player Commands:**
```bash
/abandonclaim - Delete the claim you're standing in
/trust [player] - Allow player to build in your claim
/untrust [player] - Revoke trust
/claimslist - List your claims
```

**Configuration Tips:**
- Adjust initial blocks based on your player count (100-200 is reasonable)
- Set MinimumArea to prevent tiny grief claims
- Enable PvP protection in claims or disable if you want PvP server

---

## Cross-Platform Play (Bedrock Edition Support)

Enable Bedrock Edition players (mobile, console, Windows 10/11) to play alongside Java Edition players.

### Geyser-Spigot
**Purpose:** Translates Bedrock protocol to Java protocol for cross-platform play

**Why You Need It:** Allows players on mobile devices, consoles (Xbox, PlayStation, Switch), and Windows 10/11 Bedrock Edition to connect to your Java server.

**Download:**
- Official: https://geysermc.org/download#geyser
- GitHub: https://github.com/GeyserMC/Geyser

**How It Works:**
- Bedrock players connect on port **19132** (UDP)
- Geyser translates their connection to Java protocol
- Players appear on the Java server and can interact normally
- Works seamlessly with Java Edition players

**Quick Setup:**
1. Install Geyser-Spigot and Floodgate (see below)
2. Open port 19132 UDP in your firewall
3. Configure Geyser (auto-generated on first run)
4. Bedrock players connect to `your-server-ip:19132`

**Configuration Template:**

We provide a template at `config/geyser-config.yml`. Key settings:

```yaml
bedrock:
  address: 0.0.0.0       # Listen on all interfaces
  port: 19132            # Bedrock port (UDP)
  motd1: festas_builds
  motd2: Community Server

remote:
  address: 127.0.0.1     # Java server (localhost)
  port: 25565
  auth-type: floodgate   # Use Floodgate authentication
```

**Configuration Tips:**
- Set `auth-type: floodgate` to allow Bedrock players without Java accounts
- Use `passthrough-motd: true` to show the same MOTD as Java players
- Customize `motd1` and `motd2` for Bedrock-specific messages
- Adjust `max-players` to limit Bedrock player count separately

**Common Issues:**

**Bedrock players can't connect:**
- Check firewall allows port 19132 UDP
- Verify Geyser is running: `sudo journalctl -u minecraft.service | grep Geyser`
- Test port: `nc -zvu your-server-ip 19132`

**Performance issues:**
- Bedrock protocol translation is CPU-intensive
- Limit Bedrock players or increase server RAM
- Monitor with `spark` plugin

**Links:**
- Official Wiki: https://wiki.geysermc.org/geyser/
- Discord Support: https://discord.gg/geysermc
- Bedrock Setup Guide: [BEDROCK-SETUP.md](BEDROCK-SETUP.md)

---

### Floodgate
**Purpose:** Allows Bedrock players to join without a Java Edition account

**Why You Need It:** Required for Geyser to work properly. Without Floodgate, Bedrock players would need to own both Bedrock AND Java Edition.

**Download:**
- Official: https://geysermc.org/download#floodgate
- GitHub: https://github.com/GeyserMC/Floodgate

**How It Works:**
- Authenticates Bedrock players using their Xbox Live account
- Adds a prefix to Bedrock usernames (e.g., ".PlayerName")
- Prevents username conflicts between Java and Bedrock players

**Quick Setup:**
1. Install Floodgate plugin
2. Install Geyser-Spigot
3. Set `auth-type: floodgate` in Geyser config
4. Restart server

**Configuration Template:**

We provide a template at `config/floodgate-config.yml`:

```yaml
# Prefix for Bedrock players (prevents conflicts)
username-prefix: "."

# Replace spaces (Bedrock allows spaces, Java doesn't)
replace-spaces: true
```

**Example:** Bedrock player "Steve123" appears as ".Steve123" on the server.

**Configuration Tips:**
- Keep the prefix (`.` is common and unobtrusive)
- Alternative prefixes: `*`, `~`, `-`, or `_`
- Don't remove the prefix - causes username conflicts
- Use LuckPerms to give Bedrock players different permissions if needed

**Common Issues:**

**Bedrock players have no prefix:**
- Verify Floodgate config has `username-prefix: "."`
- Restart server after config changes
- Check Floodgate loaded: `/plugins`

**Username conflicts:**
- This happens if you remove the prefix
- Re-enable the prefix in Floodgate config
- Bedrock and Java players with same name will conflict without it

**Links:**
- Official Wiki: https://wiki.geysermc.org/floodgate/
- Setup Guide: [BEDROCK-SETUP.md](BEDROCK-SETUP.md)

---

## Phase 2: Community Features

Add these once you have 10+ active players and want to enhance the community experience.

### DiscordSRV
**Purpose:** Bridge chat between Minecraft and Discord

**Why You Need It:** Keep your community connected. Players can chat from Discord, and server events are posted to Discord.

**Download:**
- SpigotMC: https://www.spigotmc.org/resources/discordsrv.18494/
- GitHub: https://github.com/DiscordSRV/DiscordSRV

**Quick Setup:**
1. Create a Discord bot at https://discord.com/developers/applications
2. Install DiscordSRV plugin
3. Add bot token to `plugins/DiscordSRV/config.yml`
4. Link channels:
   ```yaml
   Channels:
     global: "000000000000000000"  # Your Discord channel ID
   ```
5. Restart server and check Discord for messages

**Configuration Tips:**
- Use separate channels for chat, console logs, and join/leave messages
- Configure @mention permissions carefully
- Enable death messages and advancement announcements for fun

---

### Vault
**Purpose:** Economy API that other plugins use

**Why You Need It:** Required dependency for economy plugins and many others. It's just an API (doesn't do anything on its own).

**Download:**
- SpigotMC: https://www.spigotmc.org/resources/vault.34315/
- GitHub: https://github.com/milkbowl/Vault

**Setup:** Just install it - no configuration needed. Install economy plugin separately.

---

### EssentialsX Economy
**Purpose:** Basic economy system for your server

**Why You Need It:** Gives players a reason to grind - earn money from mining, farming, and trading.

**Download:** Part of EssentialsX suite - download **EssentialsX** main plugin

**Quick Setup:**
1. Install Vault (required dependency)
2. Enable economy in `plugins/Essentials/config.yml`:
   ```yaml
   economy:
     enabled: true
     starting-balance: 100
   ```
3. Create shops with `/createshop` or use ChestShop plugin for player shops

**Commands:**
```bash
/balance - Check your money
/pay [player] [amount] - Send money
/eco give [player] [amount] - Admin: give money
/worth - Check item value
```

**Integration Tips:**
- Combine with Jobs Reborn plugin to let players earn money by mining, farming, etc.
- Add ChestShop for player-run economy
- Configure prices in `plugins/Essentials/worth.yml`

---

## Phase 3: Polish & Scale

Add these when you have 30+ players or want to take your server to the next level.

### BlueMap
**Purpose:** Beautiful 3D web-based live map of your world

**Why You Need It:** Players can explore the world from their browser, find friends, plan builds, and show off the server to others.

**Download:**
- Modrinth: https://modrinth.com/plugin/bluemap
- SpigotMC: https://www.spigotmc.org/resources/bluemap.83557/

**Alternative:** **Dynmap** (https://www.spigotmc.org/resources/dynmap.274/) - Classic 2D map, lower resource usage

**Quick Setup:**
1. Install BlueMap
2. Accept EULA in `plugins/BlueMap/core.conf`
3. Configure `webserver-config.conf`:
   ```
   enabled: true
   port: 8100
   ```
4. Access map at `http://your-server-ip:8100`

**Configuration Tips:**
- Enable player markers to show online players
- Adjust render distance based on world size
- Use nginx reverse proxy to serve on port 80/443 with SSL
- Consider disabling map in protected/secret areas

**Performance Note:** Map rendering is CPU-intensive. Render during low-traffic hours or limit render threads.

---

### PlaceholderAPI
**Purpose:** Variable placeholders for other plugins (like player name, balance, rank)

**Why You Need It:** Makes other plugins work together - show player balance in chat, rank in tab list, etc.

**Download:**
- SpigotMC: https://www.spigotmc.org/resources/placeholderapi.6245/
- GitHub: https://github.com/PlaceholderAPI/PlaceholderAPI

**Quick Setup:**
1. Install PlaceholderAPI
2. Download expansions for other plugins:
   ```bash
   /papi ecloud download Player
   /papi ecloud download Vault
   /papi reload
   ```

**Common Placeholders:**
- `%player_name%` - Player name
- `%vault_eco_balance%` - Player balance
- `%luckperms_prefix%` - Player rank prefix
- `%player_health%` - Current health

**Configuration Tips:**
- Use with chat plugins (like ChatControl) to customize chat format
- Combine with Tab plugin for custom tab list
- Check `/papi list` to see all available placeholders

---

## Recommended Installation Order

1. **LuckPerms** - Set up permissions first
2. **EssentialsX + EssentialsXSpawn** - Core commands
3. **WorldEdit** - Required for WorldGuard
4. **WorldGuard** - Protect spawn
5. **CoreProtect** - Start logging everything
6. **GriefPrevention** - Let players claim land
7. **Geyser-Spigot + Floodgate** - Cross-platform play (optional but recommended)
8. Test everything works
9. **Vault** - Economy API
10. **DiscordSRV** - Community bridge
11. **PlaceholderAPI** - Integration layer
12. **BlueMap** - Show off your world

---

## Additional Recommended Plugins (Optional)

### Performance & Maintenance
- **Spark** - Performance profiler: https://spark.lucko.me/
- **ClearLag** - Remove lag-causing entities: https://www.spigotmc.org/resources/clearlagg.68271/

### Economy & Shops
- **ChestShop** - Player-owned chest shops: https://www.spigotmc.org/resources/chestshop.50951/
- **Jobs Reborn** - Earn money by mining, farming, etc.: https://www.spigotmc.org/resources/jobs-reborn.4216/
- **QuickShop** - Alternative shop plugin: https://www.spigotmc.org/resources/quickshop-reremake.62575/

### Chat & Social
- **ChatControl** - Advanced chat formatting: https://www.spigotmc.org/resources/chatcontrol.271/
- **TAB** - Custom tab list and nametags: https://www.mc-market.org/resources/14009/

### Fun & Events
- **WorldBorder** - Limit world size: https://www.spigotmc.org/resources/worldborder.60905/
- **Marriage** - Player marriages: https://www.spigotmc.org/resources/marriage-master.19273/
- **Seasons** - Seasonal changes: https://www.spigotmc.org/resources/seasons.39298/

---

## Support & Resources

- **PaperMC Docs:** https://docs.papermc.io/
- **SpigotMC Forums:** https://www.spigotmc.org/
- **Plugin Development:** https://www.spigotmc.org/wiki/spigot-plugin-development/
- **festas_builds Discord:** (Add your Discord invite here)

---

## Notes

- Always download plugins from official sources (SpigotMC, Modrinth, GitHub)
- Check plugin compatibility with your Minecraft/Paper version before installing
- Back up your server before installing new plugins
- Read plugin documentation - every plugin is different
- Join plugin Discord servers for support
- Test plugins on a local server before deploying to production

**Remember:** Start small! Don't install 20 plugins at once. Add them gradually and configure each one properly.

---

## 🤖 Auto-Install System

The festas_builds server includes an automated plugin installation system that simplifies plugin management.

### Features

- ✅ **Automatic Downloads** - Fetches plugins from GitHub Releases and Modrinth
- ✅ **Version Tracking** - Keeps track of installed versions
- ✅ **Smart Updates** - Only downloads when updates are available
- ✅ **Asset Matching** - Automatically selects the correct JAR file (Bukkit/Paper versions)
- ✅ **Backup on Update** - Backs up old plugins before updating
- ✅ **Progress Logging** - Detailed logs of all operations
- ✅ **Flexible Configuration** - Enable/disable plugins via JSON config

### Prerequisites

The scripts require the following tools (usually pre-installed on most Linux systems):

- `curl` or `wget` - For downloading files
- `jq` - For JSON parsing

**Installation on Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install -y curl jq
```

**Installation on CentOS/RHEL:**
```bash
sudo yum install -y curl jq
```

### Using the Auto-Installer

#### 1. Install All Enabled Plugins

```bash
cd /home/deploy/minecraft-server
./install-plugins.sh
```

This will:
- Read the `plugins.json` configuration
- Download all plugins where `"enabled": true`
- Save them to the `plugins/` directory
- Track versions in `plugins/.plugin_versions`
- Log all actions to `plugin-install.log`

#### 2. Update Plugins

```bash
./update-plugins.sh
```

This will:
- Check each plugin for newer versions
- Backup current plugins to `plugins/backups/`
- Download and install updates
- Keep the last 5 backups

#### 3. Force Re-download

```bash
./install-plugins.sh --force
```

Useful when:
- A download was corrupted
- You want to ensure you have fresh copies
- Troubleshooting plugin issues

### Configuration: plugins.json

The `plugins.json` file controls which plugins are installed:

```json
{
  "plugins": [
    {
      "name": "LuckPerms",
      "enabled": true,
      "category": "essential",
      "source": "github",
      "repo": "LuckPerms/LuckPerms",
      "asset_pattern": "Bukkit",
      "description": "Advanced permissions management system"
    }
  ]
}
```

**Fields:**
- `name` - Plugin display name
- `enabled` - `true` to install, `false` to skip
- `category` - `essential`, `community`, or `optional` (for organization)
- `source` - `github` or `modrinth`
- `repo` - GitHub repository (format: `owner/repo`)
- `project_id` - Modrinth project ID (for Modrinth plugins)
- `asset_pattern` - Regex pattern to match the correct JAR file
- `description` - What the plugin does

### Adding New Plugins

#### From GitHub Releases

1. Find the GitHub repository (e.g., `AuthorName/PluginName`)
2. Note the asset naming pattern (e.g., "bukkit", "paper", or specific filename pattern)
3. Add to `plugins.json`:

```json
{
  "name": "MyNewPlugin",
  "enabled": true,
  "category": "community",
  "source": "github",
  "repo": "AuthorName/PluginName",
  "asset_pattern": "bukkit",
  "description": "What the plugin does"
}
```

#### From Modrinth

1. Go to the plugin's Modrinth page (e.g., `https://modrinth.com/plugin/example`)
2. Copy the project ID from the URL or page
3. Add to `plugins.json`:

```json
{
  "name": "MyModrinthPlugin",
  "enabled": true,
  "category": "community",
  "source": "modrinth",
  "project_id": "abc123xyz",
  "description": "What the plugin does"
}
```

### Enabling/Disabling Plugins

To disable a plugin without removing it:

1. Edit `plugins.json`
2. Change `"enabled": true` to `"enabled": false`
3. Remove the plugin JAR manually from `plugins/` directory (or let it stay for later re-enable)

To re-enable:
1. Change back to `"enabled": true`
2. Run `./install-plugins.sh`

### Automated Updates via Cron

To automatically check for plugin updates daily:

```bash
# Edit crontab
crontab -e

# Add this line to check for updates at 3 AM daily
0 3 * * * cd /home/deploy/minecraft-server && ./update-plugins.sh >> /home/deploy/minecraft-server/cron-plugin-update.log 2>&1
```

**Note:** Automatic updates will restart plugins when the server restarts. Consider the timing carefully.

### GitHub Actions Integration

The deployment workflow (`.github/workflows/deploy.yml`) can optionally install/update plugins:

**Manual Workflow Trigger:**
1. Go to GitHub Actions tab
2. Select "Deploy Minecraft Server" workflow
3. Click "Run workflow"
4. Set "Install/update plugins during deployment" to `true`
5. Run workflow

This is useful for:
- Initial server setup
- Deploying plugin configuration changes
- Updating plugins as part of server updates

### Troubleshooting

#### "jq: command not found"

Install jq:
```bash
sudo apt update && sudo apt install -y jq
```

#### "No matching asset found for pattern"

The `asset_pattern` in `plugins.json` doesn't match any release assets. To fix:

1. Go to the GitHub releases page for the plugin
2. Look at the JAR filenames
3. Update the `asset_pattern` to match (case-insensitive regex)

Example patterns:
- `"Bukkit"` - matches "LuckPerms-Bukkit-5.4.102.jar"
- `"EssentialsX-[0-9]"` - matches "EssentialsX-2.20.1.jar" but not "EssentialsXSpawn-2.20.1.jar"
- `"worldedit-bukkit"` - matches "worldedit-bukkit-7.2.15.jar"

#### "Failed to fetch release information"

Possible causes:
- GitHub rate limiting (try setting GITHUB_TOKEN environment variable)
- Invalid repository name in `plugins.json`
- Repository doesn't have releases

Check the GitHub repo manually and verify it has releases published.

#### Plugin JAR Downloaded but Not Loading

1. Check Minecraft/Paper version compatibility
2. Verify the plugin is in the correct `plugins/` directory
3. Check server logs: `sudo journalctl -u minecraft.service -n 100`
4. Ensure dependencies are installed (e.g., WorldGuard requires WorldEdit)

#### Rate Limiting (GitHub API)

If you hit GitHub rate limits (60 requests/hour for unauthenticated):

1. Create a GitHub Personal Access Token (no special permissions needed)
2. Set it as an environment variable:
```bash
export GITHUB_TOKEN="your_token_here"
./install-plugins.sh
```

Authenticated requests get 5,000 requests/hour.

### Advanced Usage

#### Custom Plugin Directory

By default, plugins are installed to `./plugins/`. To use a different directory, edit the scripts:

```bash
# In install-plugins.sh and update-plugins.sh
PLUGINS_DIR="/path/to/custom/plugins"
```

#### Dry Run Mode

To see what would be downloaded without actually downloading:

```bash
# Review the plugins.json
cat plugins.json | jq '.plugins[] | select(.enabled == true) | {name, source, repo}'
```

#### Backup Management

Backups are stored in `plugins/backups/backup_YYYYMMDD_HHMMSS/`. The system keeps the last 5 backups automatically.

To restore from a backup:
```bash
cp plugins/backups/backup_20250101_030000/*.jar plugins/
```

### Log Files

- `plugin-install.log` - Installation and download logs
- `plugin-update.log` - Update operation logs

Review these files if something goes wrong:
```bash
tail -f plugin-install.log
```

