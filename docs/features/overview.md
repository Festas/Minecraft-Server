← [Back to Features](./README.md) | [Documentation Home](../README.md)

---

# festas_builds Server Features

Complete overview of all features available on the festas_builds community Minecraft server.

**Difficulty:** ⭐ Easy (Player Reference)  
**Audience:** Players & Administrators

---

## ✨ Feature Overview

The festas_builds server is a fully-featured community server designed for building, creativity, and community engagement. Here's everything available:

---

## 🌐 1. Live Web Map (BlueMap)

**Explore the world in your browser!**

### For Players
- **3D Interactive Map** - View the server world in real-time
- **Player Markers** - See where everyone is building
- **Mobile Friendly** - Works on phones and tablets
- **High Resolution** - Beautiful tile rendering
- **Multiple Worlds** - Overworld, Nether, End

**Access**: Visit `map.your-domain.com` (after setup)

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** BlueMap plugin
- **Documentation**: [bluemap.md](./bluemap.md)

---

## 🏆 2. Build Competition System

**Weekly themed building contests!**

### For Players
- **PlotSquared Plots** - 100x100 building plots
- **Random Themes** - 100+ theme ideas included
- **Community Voting** - Players vote on builds
- **Exclusive Rewards** - Winner crowns, particles, Legend rank
- **Commands**: `/plots auto`, `/plot visit`, `/plot rate`

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** PlotSquared, FastAsyncWorldEdit
- **Automated Management** - Bash script for easy management
- **Discord Integration** - Announcements and voting
- **Documentation**: [build-competitions.md](./build-competitions.md)

---

## 🎭 3. Cosmetics & Rewards

**Unlock cosmetics through gameplay!**

### For Players

#### Particle Effects
- Flame trails, hearts, music notes
- Dragon breath, fireworks, soul fire
- Cherry blossoms, electric sparks
- Legendary auras for winners

#### Hats & Items
- Builder helmets, party hats, crowns
- Wizard hats, halos, laurel wreaths
- Backpacks, balloons
- Angel wings (cosmetic)

#### Rank Progression
```
Newcomer → Builder → Architect → Master Builder → Legend
   0h       10h       50h          200h           Win Comp
```

**EULA Compliant**: All cosmetics are visual only!

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** PlayerParticles, HMCCosmetics, HeadDatabase, LuckPerms
- **Documentation**: [cosmetics.md](./cosmetics.md)

---

## 📢 4. Welcome & Tutorial System

**New player friendly!**

### For Players
- **Branded Welcome Messages** - festas_builds themed
- **5-Step Interactive Tutorial** - Learn the basics
- **Starter Kit** - Diamond tools & building materials
- **Server Guide Book** - In-game handbook
- **Tutorial NPCs** - Interactive guides
- **Completion Rewards** - Diamonds & emeralds
- **Commands**: `/tutorial`, `/rules`, `/discord`

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** Citizens, EssentialsX
- **Documentation**: [welcome-system.md](./welcome-system.md)

---

## 🎬 5. Content Creator Tools

**Professional filming capabilities!**

### For Players (Creators)

#### Vanish Mode
- Invisible to players while filming
- Silent join/quit
- No interruptions

#### Recording System
- Server-side replay recording
- Camera paths for cinematics
- Playback controls

#### Environmental Control
- Time control (`/time set`)
- Weather control (`/weather`)
- Freeze time for consistent lighting

#### Filming Kit
- Quick access tools
- Preset configurations
- Teleport pearls

**Creator Rank**: Apply via Discord

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** SuperVanish, WorldEdit, AdvancedReplay (optional)
- **Documentation**: [creator-tools.md](./creator-tools.md)

---

## 🛡️ 6. Land Protection

**Protect your builds from grief!**

### For Players
- **GriefPrevention** - Claim land with golden shovel
- **WorldGuard** - Region protection
- **CoreProtect** - Block logging & rollback
- **Trust System** - Add friends to your claims
- **Commands**: `/claim`, `/trust`, `/unclaim`

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** GriefPrevention, WorldGuard, CoreProtect

---

## 🌍 7. Cross-Platform Play

**Java + Bedrock Edition support!**

### For Players
- **Geyser** - Bedrock protocol translation
- **Floodgate** - Bedrock authentication
- **Mobile Support** - Play on phones/tablets
- **Console Support** - Xbox, PlayStation, Switch
- **Unified Gameplay** - Same experience for all

**Bedrock Port**: 19132 (UDP)

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** Geyser, Floodgate
- **Documentation**: [../getting-started/bedrock-setup.md](../getting-started/bedrock-setup.md)

---

## 💬 8. Discord Integration

**Server-Discord chat bridge!**

### For Players
- **DiscordSRV** - Chat synchronization
- **Join/Leave Announcements** - Know who's online
- **Rich Embeds** - Beautiful formatted messages
- **Join Discord**: `/discord` command in-game

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** DiscordSRV
- **Console Logging** - Staff monitoring
- **Commands from Discord** - Limited management

---

## 🔧 9. Essential Tools

### For Players

#### WorldEdit & FAWE
- In-game world editing
- Copy/paste builds
- Terrain generation
- Available to Architect+ ranks

#### EssentialsX
- Home system (`/home`, `/sethome`)
- Teleportation (`/tpa`, `/spawn`)
- Warp system (`/warp`)
- Kits & economy

#### LuckPerms
- Advanced permissions
- Rank management
- Permission groups
- Prefix/suffix support

### For Admins
- **Setup Difficulty:** ⭐ Easy to ⭐⭐ Medium
- **Dependencies:** WorldEdit, FastAsyncWorldEdit, EssentialsX, LuckPerms

---

## 🎮 10. Economy System

**Optional player-driven economy!**

### For Players
- **Vault** - Economy API
- **EssentialsX Economy** - Currency system
- **Admin Shops** - Buy/sell items
- **Player Shops** - Player-to-player trading
- **Competition Rewards** - Earn currency
- **Commands**: `/balance`, `/pay`, `/shop`

### For Admins
- **Setup Difficulty:** ⭐⭐ Medium
- **Dependencies:** Vault, EssentialsX

---

## 📊 11. Server Features

### Performance
- **Paper Server** - High-performance
- **Aikar's JVM Flags** - Optimized garbage collection
- **Automated Backups** - Daily world backups
- **Auto-Updates** - Plugin auto-installation

### Moderation
- **CoreProtect** - Block logging
- **Warn/Ban System** - Player management
- **Anti-Cheat** - Protection against hacks
- **Staff Tools** - Moderation commands

### Community
- **Multiple Ranks** - Progression system
- **Playtime Tracking** - Automatic rank-ups
- **Event System** - Competitions & celebrations
- **Player Statistics** - Track your progress

---

## 🎯 Comparison: What Makes This Special?

| Feature | festas_builds | Typical Server |
|---------|---------------|----------------|
| Live 3D Map | ✅ BlueMap | ❌ |
| Build Competitions | ✅ Automated | ❌ |
| Cosmetics System | ✅ Extensive | ⚠️ Limited |
| Creator Tools | ✅ Professional | ❌ |
| Cross-Platform | ✅ Bedrock Support | ⚠️ Java Only |
| Welcome System | ✅ Interactive | ⚠️ Basic |
| Auto Plugin Updates | ✅ Yes | ❌ |
| Documentation | ✅ Comprehensive | ⚠️ Minimal |

---

## 📚 Documentation

All features are fully documented:

- **[bluemap.md](./bluemap.md)** - Live web map setup
- **[build-competitions.md](./build-competitions.md)** - Competition system
- **[cosmetics.md](./cosmetics.md)** - Cosmetics & rewards
- **[welcome-system.md](./welcome-system.md)** - New player experience
- **[creator-tools.md](./creator-tools.md)** - Content creation tools
- **[../getting-started/bedrock-setup.md](../getting-started/bedrock-setup.md)** - Cross-platform play
- **[../admin/plugins.md](../admin/plugins.md)** - Complete plugin list
- **[../getting-started/deployment.md](../getting-started/deployment.md)** - Server deployment
- **[roadmap.md](./roadmap.md)** - Future plans
- **[../admin/admin-guide.md](../admin/admin-guide.md)** - Administration guide

---

## 🚀 Planned Features

See [roadmap.md](./roadmap.md) for upcoming features:

- Server website
- Voting integration
- Additional minigames
- Seasonal events
- Resource world
- Multiple game worlds
- Advanced economy features

---

## 🎮 Getting Started

1. **Join the Server** - Connect with Java or Bedrock Edition
2. **Complete Tutorial** - Learn the basics (`/tutorial`)
3. **Claim Land** - Protect your builds (golden shovel)
4. **Unlock Cosmetics** - Play and rank up
5. **Join Competitions** - `/plots auto` when announced
6. **Join Discord** - Be part of the community
7. **Have Fun!** - Build amazing creations

---

## 💡 Quick Access

### For Players
- `/tutorial` - Start tutorial
- `/rules` - Server rules
- `/cosmetics` - Open cosmetics
- `/plots auto` - Claim competition plot
- `/spawn` - Return to spawn
- `/discord` - Discord invite

### For Creators
- `/vanish` - Toggle invisibility
- `/filmingkit` - Get filming tools
- `/replay record` - Start recording
- `/filmpreset cinematic` - Perfect filming setup

### For Staff
- `/co inspect` - Check block changes
- `/plot clear *` - Reset competition plots
- `./scripts/competition-manager.sh` - Manage competitions

---

## 🤝 Contributing

Have ideas for new features? 
- Submit issues on GitHub
- Join Discord and suggest
- Contribute code via PRs

---

## ⚖️ EULA Compliance

All features are **fully Mojang EULA compliant**:
- ✅ Cosmetics are visual only
- ✅ No pay-to-win mechanics
- ✅ All features earnable through gameplay
- ✅ Supporter perks are cosmetic only
- ✅ Fair competition for all players

---

**Ready to explore all these features?** Join the festas_builds server today!

*This server represents months of configuration and optimization. Enjoy!*

---

← [Back to Features](./README.md) | [Documentation Home](../README.md)
