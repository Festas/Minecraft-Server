# Plugin Guide for festas_builds Community Server

This guide outlines the recommended plugins for building a scalable, well-managed community Minecraft server. Plugins are organized into phases to make the transition from a small server to a full community server manageable.

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
7. Test everything works
8. **Vault** - Economy API
9. **DiscordSRV** - Community bridge
10. **PlaceholderAPI** - Integration layer
11. **BlueMap** - Show off your world

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
