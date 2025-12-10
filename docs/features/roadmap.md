← [Back to Features](./README.md) | [Documentation Home](../README.md)

---

# festas_builds Community Server - Growth Roadmap

This roadmap outlines the transformation of the festas_builds Minecraft server from a small friends-only server to a full-scale community server. Each phase builds upon the previous one, with clear milestones and timelines.

**Document Type:** ⭐ Easy (Planning & Reference)  
**Target Audience:** Everyone (Server Staff, Players, Contributors)  
**Purpose:** Strategic planning and feature tracking

---

## 📋 About This Document

This is a **living document** that tracks:
- Completed features and implementations
- Upcoming features and improvements
- Long-term vision and goals
- Resource requirements by phase
- Success criteria and metrics

**Last Updated:** 2025-12-03  
**Current Phase:** Phase 2 (Community Features)  
**Maintained By:** festas_builds team

---


This roadmap outlines the transformation of the festas_builds Minecraft server from a small friends-only server to a full-scale community server. Each phase builds upon the previous one, with clear milestones and timelines.

---

## Overview

**Vision:** Build a thriving, well-moderated Minecraft community for the festas_builds audience, with professional features, strong anti-grief protection, and engaging community events.

**Current Status:** Foundation server with automated deployment and basic Vanilla setup

**Target:** 50-100 concurrent players with full community features, Discord integration, and content creator friendly infrastructure

---

## Phase 1: Foundation (Weeks 1-2)

**Goal:** Transition to Paper, establish core infrastructure, and implement essential moderation/protection systems.

### Infrastructure
- [x] Automated deployment via GitHub Actions
- [x] Backup system implemented
- [x] Systemd service for server management
- [ ] Switch from Vanilla to Paper server
- [ ] Implement Aikar's JVM flags for performance
- [ ] Test Paper compatibility with existing world

### Core Plugins
- [ ] Install and configure **LuckPerms**
  - [ ] Create permission groups: Member, Trusted, Moderator, Admin
  - [ ] Set up group inheritance hierarchy
  - [ ] Configure basic permissions per group
- [ ] Install and configure **EssentialsX** + **EssentialsXSpawn**
  - [ ] Configure homes (3 for members, 5 for trusted)
  - [ ] Set up teleport cooldowns
  - [ ] Configure kits for new players
- [ ] Install and configure **CoreProtect**
  - [ ] Set up logging (blocks, chests, entities)
  - [ ] Configure MySQL database (if 20+ expected players)
  - [ ] Train moderators on rollback commands
- [ ] Install **WorldEdit** and **WorldGuard**
  - [ ] Create protected spawn region
  - [ ] Set up PvP-disabled safe zones
  - [ ] Configure global region rules

### Server Setup
- [ ] Build spawn area (professional, branded for festas_builds)
  - [ ] Spawn building/hub
  - [ ] Server rules board
  - [ ] Portal/warp area to different zones
  - [ ] Welcome area for new players
- [ ] Create `server-icon.png` (64x64, festas_builds branded)
- [ ] Write and post server rules
  - [ ] No griefing/stealing
  - [ ] Be respectful
  - [ ] No hacking/exploits
  - [ ] Keep chat appropriate
  - [ ] Listen to staff

### Documentation & Community
- [ ] Update all documentation to reflect Paper usage
- [ ] Create plugin guide (PLUGINS.md)
- [ ] Set up initial staff team (2-3 moderators)
- [ ] Document staff procedures (handling grief, bans, etc.)

**Timeline:** 2 weeks  
**Player Capacity:** 20-30 concurrent players  
**Success Metrics:**
- Server running on Paper with no crashes
- Spawn area protected and complete
- All core plugins configured
- 5+ trusted community members identified

---

## Phase 2: Community Features (Weeks 3-6)

**Goal:** Open to the festas_builds community, implement player-driven features, and establish Discord integration.

### Community Growth
- [ ] Soft launch to festas_builds followers
  - [ ] Announcement video/post on social media
  - [ ] Clear application process (if whitelist)
  - [ ] Welcome message for new players
- [ ] Set up whitelist system (optional)
  - [ ] Create application form (Google Forms/Discord)
  - [ ] Define approval criteria
  - [ ] Whitelist approved players
- [ ] Recruit additional moderators (target: 1 mod per 20 players)

### Discord Integration
- [ ] Install and configure **DiscordSRV**
  - [ ] Bridge main chat to Discord
  - [ ] Set up separate channels for console, join/leave
  - [ ] Configure @mention permissions
- [ ] Create Discord server structure
  - [ ] #rules channel
  - [ ] #announcements
  - [ ] #chat (bridged to Minecraft)
  - [ ] #apply (if whitelist)
  - [ ] #support
  - [ ] Voice channels
- [ ] Set up Discord roles matching Minecraft ranks

### Economy & Claims
- [ ] Install **Vault** (economy API)
- [ ] Enable **EssentialsX Economy**
  - [ ] Configure starting balance
  - [ ] Set up item values
  - [ ] Create admin shops (optional)
- [ ] Install **GriefPrevention** or **Lands**
  - [ ] Configure claim blocks (100 initial, 100/hour)
  - [ ] Set minimum claim size
  - [ ] Create tutorial for claiming land
- [ ] Optional: Install **Jobs Reborn** for earning money

### Community Events
- [x] Plan first community event
  - [x] Build competition system implemented
  - [ ] PvP tournament
  - [ ] Treasure hunt
  - [ ] Community project
- [x] Create event calendar
- [x] Set up rewards for events (cosmetics, ranks)

### Build Competition System
- [x] Install **PlotSquared** and **FastAsyncWorldEdit**
- [x] Configure competition world with plot settings
- [x] Create competition manager script
- [x] Set up theme library (100+ themes)
- [x] Configure voting system
- [x] Set up competition rewards (cosmetics, ranks)

### Cosmetics & Rewards System
- [x] Install **PlayerParticles** for particle effects
- [x] Configure particle effects (basic to legendary)
- [x] Set up rank progression (Newcomer → Legend)
- [x] Create cosmetics unlock system
- [x] Configure hats and backpacks (HMCCosmetics)
- [x] EULA-compliant cosmetic system

### Welcome & Tutorial System
- [x] Design welcome messages with festas_builds branding
- [x] Create 5-step interactive tutorial system
- [x] Configure starter kit for new players
- [x] Set up server rules system
- [x] Plan NPC tutorial guides (Citizens)

### Content Creation Support
- [x] Create content creator guidelines
  - [x] Recording permissions
  - [x] How to credit the server
  - [x] Server IP sharing policy
- [x] Set up vanish mode for filming (SuperVanish)
- [x] Configure replay recording system
- [x] Create creator rank with special permissions
- [x] Set up filming tools kit
- [x] Configure camera controls and presets

**Timeline:** 4 weeks  
**Player Capacity:** 40-50 concurrent players  
**Success Metrics:**
- Discord server with 100+ members
- 30+ whitelisted players (if applicable)
- First community event held successfully
- Active economy with player trades
- Players using land claims effectively

---

## Phase 3: Scale & Polish (Weeks 7-12)

**Goal:** Scale to full community server size, add polish features, and establish server sustainability.

### Performance & Scaling
- [ ] Upgrade server resources if needed
  - [ ] Monitor RAM usage (consider 6-8GB)
  - [ ] Check CPU performance under load
  - [ ] Evaluate disk I/O for world saving
- [ ] Install **Spark** for performance profiling
- [ ] Optimize Paper configuration
  - [ ] `paper-world-defaults.yml` tuning
  - [ ] Mob spawn limits
  - [ ] Entity activation ranges
- [ ] Consider dedicated database server for CoreProtect/LuckPerms

### Live Map
- [x] Install **BlueMap** (configured in plugins.json)
  - [x] Configure web server (port 8100)
  - [x] Enable player markers
  - [x] Hide protected/secret regions
- [x] Set up reverse proxy (nginx) for clean URL
- [x] Add SSL certificate instructions for HTTPS
- [x] Create complete setup documentation (BLUEMAP-SETUP.md)

### Website & Branding
- [ ] Create server website
  - [ ] Home page with server info
  - [ ] Embedded live map
  - [ ] Rules page
  - [ ] Application form (if whitelist)
  - [ ] Staff page
- [ ] Custom domain setup
  - [ ] `play.festasbuilds.com` for server IP
  - [ ] `map.festasbuilds.com` for live map
  - [ ] `festasbuilds.com` for website

### Resource Pack & Customization
- [ ] Design custom resource pack (optional)
  - [ ] Custom textures for server items
  - [ ] UI improvements
  - [ ] Server-specific blocks/items
- [ ] Create custom server textures
- [ ] Add resource pack to server.properties

### Server List & Voting
- [ ] List server on voting sites
  - [ ] Planet Minecraft
  - [ ] Minecraft-Server-List.com
  - [ ] TopG.org
- [ ] Install voting plugin (e.g., **Votifier**)
  - [ ] Configure vote rewards
  - [ ] Track top voters
  - [ ] Monthly voting competitions

### Monetization (EULA Compliant)
- [ ] Set up donation/supporter system
  - [ ] Patreon integration
  - [ ] Ko-fi or similar
- [ ] Create supporter perks (EULA compliant!)
  - [ ] Cosmetic items only (no gameplay advantage)
  - [ ] Colored chat
  - [ ] Particle effects
  - [ ] Custom titles/prefixes
  - [ ] Extra homes (up to limit)
  - [ ] Priority queue (if server is full)
- [ ] Install **PlayerParticles** or similar for cosmetics
- [ ] Clearly document that supporters don't get gameplay advantages

### Advanced Features
- [ ] Install **PlaceholderAPI** for plugin integration
- [ ] Set up custom chat format (with ranks, colors)
- [ ] Create custom Tab list with player info
- [ ] Add **Marriage** plugin for fun
- [ ] Set up **WorldBorder** to limit world size
- [ ] Consider minigames (optional)
  - [ ] PvP arena with kits
  - [ ] Parkour courses
  - [ ] Spleef arena

### Community Maturity
- [ ] Establish community guidelines beyond basic rules
  - [ ] Build quality standards for public areas
  - [ ] Collaboration encouragement
  - [ ] Respect for others' builds
- [ ] Create player ranks based on playtime/contribution
  - [ ] Newcomer (0-5 hours)
  - [ ] Member (5+ hours)
  - [ ] Trusted (20+ hours, good standing)
  - [ ] Veteran (100+ hours)
- [ ] Set up player-run initiatives
  - [ ] Shopping district
  - [ ] Community farms
  - [ ] Public works projects

**Timeline:** 6 weeks  
**Player Capacity:** 80-100 concurrent players  
**Success Metrics:**
- Server listed on 3+ voting sites
- Website live with custom domain
- Live map accessible and used by players
- 200+ Discord members
- Sustainable donation support (if applicable)
- Active player-run economy

---

## Beyond Phase 3: Long-term Growth

### Continuous Improvement
- Regular community feedback surveys
- Monthly plugin updates and security patches
- Seasonal events and competitions
- Expanding staff team as needed
- Cross-promotion with festas_builds content

### Potential Expansions
- **Multiple Worlds**
  - Creative world for builders
  - Resource world (resets monthly)
  - Minigame world
- **Seasonal Resets**
  - Fresh start events
  - Special limited-time worlds
- **Partnerships**
  - Collaborate with other content creators
  - Cross-server events
  - Joint tournaments

### Sustainability Checklist
- [ ] Automated backups running daily
- [ ] Staff team of 5+ trained moderators
- [ ] Documented procedures for all server tasks
- [ ] Financial sustainability (donations cover hosting)
- [ ] Active Discord community maintaining engagement
- [ ] Regular content updates and events
- [ ] Performance monitoring and optimization
- [ ] Regular security updates

---

## Key Metrics to Track

**Technical Metrics:**
- Server TPS (ticks per second) - target: 20
- RAM usage - keep below 80%
- Player connection times
- Crash frequency (target: zero)

**Community Metrics:**
- Daily active players
- Weekly new player signups
- Discord engagement (messages/day)
- Event participation rates
- Player retention (% returning after 1 week)

**Content Metrics:**
- YouTube/Twitch mentions
- Social media reach
- Player-created content
- Build showcases

---

## Risk Management

**Potential Issues & Solutions:**

| Risk | Mitigation |
|------|-----------|
| Server griefing | CoreProtect logging, active moderation, claims |
| Player toxicity | Clear rules, quick moderation, mute/ban system |
| Performance issues | Spark profiling, Paper optimization, server upgrades |
| Staff burnout | Rotate responsibilities, recruit more staff |
| Low player retention | Events, community building, content creator promotion |
| Financial unsustainability | Conservative expansion, donation drives, cost optimization |

---

## Resource Requirements by Phase

### Phase 1
- **Server:** 2-4GB RAM, 2 CPU cores
- **Storage:** 20GB
- **Staff:** 1 admin, 2 moderators
- **Cost:** ~€5-10/month (Hetzner VPS)

### Phase 2
- **Server:** 4-6GB RAM, 4 CPU cores
- **Storage:** 40GB
- **Staff:** 1 admin, 3-4 moderators
- **Cost:** ~€10-20/month

### Phase 3
- **Server:** 6-8GB RAM, 6+ CPU cores
- **Storage:** 60-100GB
- **Staff:** 1-2 admins, 5-7 moderators
- **Cost:** ~€20-40/month
- **Additional:** Domain name (~€10/year), website hosting (optional)

---

## Success Criteria

**Phase 1 Complete When:**
- ✅ Paper server running stable for 1 week
- ✅ All core plugins installed and configured
- ✅ Spawn area built and protected
- ✅ 10+ players tested the server

**Phase 2 Complete When:**
- ✅ Discord integration working smoothly
- ✅ 30+ active players in the community
- ✅ First community event completed
- ✅ Economy system in use

**Phase 3 Complete When:**
- ✅ 50+ concurrent peak players
- ✅ Live map accessible
- ✅ Server listed and receiving votes
- ✅ Website live
- ✅ Sustainable donation support (optional)

---

## 📦 Plugin Wishlist

Plugins being considered for future implementation:

### Essential Plugins
- **EssentialsX** - Core server commands and utilities
- **LuckPerms** - Advanced permissions management
- **Vault** - Economy and permissions API

### Building & World Management
- **WorldEdit** - Advanced building tools
- **WorldGuard** - World protection and region management

### Protection & Moderation
- **GriefPrevention** - Claim-based land protection
- **CoreProtect** - Block logging and rollback

### Utilities
- **PlugManX** - Plugin management

> **Note:** This wishlist is subject to change based on server needs, performance considerations, and community feedback. Plugins will be evaluated for compatibility, security, and performance impact before installation.

---

## Notes

- **Be Patient:** Building a community takes time. Don't rush through phases.
- **Listen to Players:** Regular feedback helps shape the server direction.
- **Document Everything:** Future staff and players will thank you.
- **Stay EULA Compliant:** Mojang's EULA prohibits pay-to-win. Keep it fair.
- **Have Fun:** This is a game! Enjoy building the community.

**Last Updated:** 2025-12-03  
**Maintained By:** festas_builds team

---

*This roadmap is a living document. Update it as the server grows and adapts to community needs.*

---

*This roadmap is regularly updated. Check back for the latest status and upcoming features.*

← [Back to Features](./README.md) | [Documentation Home](../README.md)
