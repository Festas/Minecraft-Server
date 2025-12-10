← [Back to Features](./README.md) | [Documentation Home](../README.md)

---

# Welcome & Tutorial System for festas_builds

Complete guide to setting up and managing the new player welcome experience.

**Setup Difficulty:** ⭐⭐ Medium  
**Target Audience:** Server Administrators  
**Estimated Setup Time:** 30-45 minutes

---

## 📋 Dependencies

**Required:**
- EssentialsX (for kits and commands)
- LuckPerms (for permissions)

**Optional:**
- Citizens (for tutorial NPCs)
- DeluxeHub (for hub management)
- Custom welcome plugin

**Configuration Files:**
- `config/plugins/welcome/join-messages.yml`
- `config/plugins/welcome/starter-kit.yml`
- `config/plugins/welcome/tutorial-config.yml`
- `config/plugins/welcome/rules.yml`

---

## For Players

### What to Expect

When you join for the first time:
- Custom welcome message
- Starter kit with tools and materials
- Interactive 5-step tutorial
- Server guide book
- Rules and guidelines

### For Admins

This guide covers configuring the welcome experience for new players.

---

Complete guide to setting up and managing the new player welcome experience.

---

## Overview

The welcome system provides new players with:
- **Branded welcome messages**
- **Interactive 5-step tutorial**
- **Starter kit with tools and materials**
- **Server rules and guidelines**
- **NPCs for guidance**

---

## Components

### 1. Join Messages

**First Join** (`config/plugins/welcome/join-messages.yml`):
- Custom welcome message with festas_builds branding
- Server-wide announcement for new players
- Title animation
- Sound effects
- Automatic starter kit

**Returning Players**:
- Personalized welcome back message
- Join/leave messages with rank display

### 2. Starter Kit

**Contents** (`config/plugins/welcome/starter-kit.yml`):
- Diamond tools (Efficiency 3, Unbreaking 2)
- Building materials (planks, stone, glass)
- Food supply
- Golden shovel for claiming land
- Server guide book
- Spawn compass

**Auto-given on first join**: Yes

### 3. Interactive Tutorial

**5 Steps** (`config/plugins/welcome/tutorial-config.yml`):

1. **Welcome** - Introduction to festas_builds
2. **Land Claims** - How to protect builds
3. **Build Competitions** - Weekly competitions info
4. **Community Features** - Discord, cosmetics, ranks
5. **Start Building** - Final instructions + rewards

**Completion Reward**:
- 5 diamonds
- 3 emeralds
- XP bottles
- Tutorial completed permission

### 4. Server Rules

**Rules System** (`config/plugins/welcome/rules.yml`):
- 6 core server rules
- Detailed guidelines
- Punishment system integration
- Rules book given to new players

**Core Rules**:
1. Be respectful
2. No griefing/stealing
3. No cheating/exploits
4. Family-friendly chat
5. Follow staff instructions
6. Have fun!

---

## Setup Instructions

### Step 1: Install Required Plugins

```bash
# Enable in plugins.json
{
  "name": "Citizens",
  "enabled": true  # For tutorial NPCs
}
```

Optional:
- DeluxeHub (hub management)
- EssentialsX (for kits - already installed)

### Step 2: Configure Welcome Messages

Edit `config/plugins/welcome/join-messages.yml`:
- Customize welcome text
- Set your Discord link
- Adjust delays and sounds

### Step 3: Set Up Starter Kit

The starter kit is defined in `config/plugins/welcome/starter-kit.yml`.

**EssentialsX Integration**:
Add to `plugins/Essentials/kits.yml`:

```yaml
kits:
  starter:
    delay: first_join_only
    items:
      - diamond_pickaxe 1
      - diamond_axe 1
      # ... (see starter-kit.yml for full list)
```

**Auto-give on join**:
```bash
# Use EssentialsX auto-kit or custom plugin
```

### Step 4: Create Tutorial Area

**Option A: Dedicated Tutorial World**
- Create separate world: `/mv create tutorial normal`
- Build tutorial areas
- Add NPCs at each step

**Option B: Tutorial at Spawn**
- Designate area at spawn
- Place NPCs
- Add signs and holograms

### Step 5: Set Up Tutorial NPCs

**Requirements**: Citizens plugin

```bash
# Create NPCs
/npc create Tutorial Guide
/npc skin festas_builds

# Set NPC messages
/npc text add "Welcome to festas_builds!"
/npc text add "Click me to start the tutorial!"

# Set command on right-click
/npc command add /tutorial start
```

Place NPCs at:
- Spawn (main guide)
- Tutorial step locations
- Rules board
- Competition info area

### Step 6: Configure Rules Display

**Commands Setup**:

Create `/rules` command:
```yaml
# In command plugin or EssentialsX
rules:
  command: /rules
  message:
    - "&6&l⎯⎯⎯ FESTAS_BUILDS RULES ⎯⎯⎯"
    - "1. Be respectful to all players"
    - "2. No griefing or stealing"
    # ... (see rules.yml for full list)
```

**Rules Book**: Auto-given to new players (see starter-kit.yml)

---

## Customization

### Branding Your Welcome Messages

Edit `config/plugins/welcome/join-messages.yml`:

```yaml
first_join:
  messages:
    - "&6&l✦ &b&lWELCOME TO YOUR_SERVER! &6&l✦"
    - "&7Welcome, &e%player%&7!"
    # Customize these messages
```

### Adjusting Starter Kit

Edit `config/plugins/welcome/starter-kit.yml`:

```yaml
items:
  - type: diamond_pickaxe
    amount: 1
    name: "&bBuilder's Pickaxe"
    # Modify tools, quantities, enchantments
```

### Tutorial Steps

Customize tutorial locations in `config/plugins/welcome/tutorial-config.yml`:

```yaml
step_1:
  location:
    world: "world"
    x: 0
    y: 65
    z: 0
    # Set to your spawn coordinates
```

### Adding Discord Link

In `config/plugins/welcome/join-messages.yml` and `rules.yml`:

```yaml
# TODO: Replace with your Discord invite
discord_link: "discord.gg/your-invite"
```

---

## Tutorial Commands

### For Players

```bash
/tutorial - Start or continue tutorial
/tutorial next - Next step
/tutorial skip - Skip tutorial (permission required)
/rules - View server rules
/discord - Get Discord invite link
```

### For Staff

```bash
/tutorial reset <player> - Reset player's tutorial progress
/tutorial complete <player> - Mark tutorial as complete
/npc create <name> - Create tutorial NPC (Citizens)
```

---

## Integration

### With EssentialsX

The system integrates with EssentialsX for:
- Kits (starter kit, rank-up kits)
- Join/quit messages
- Commands (/rules, /discord, etc.)

### With LuckPerms

Tutorial completion grants permission:
```bash
lp user <player> permission set tutorial.completed true
```

### With DiscordSRV

Welcome messages can be broadcast to Discord:
```yaml
# In DiscordSRV config
discord_to_minecraft:
  first_join: "#welcome"
```

---

## Best Practices

### Welcome Messages
- Keep messages concise
- Use color codes sparingly
- Include essential commands only
- Point to /help for more

### Tutorial Design
- Keep it short (5-10 minutes)
- Make it optional (allow skipping)
- Reward completion
- Use visuals (NPCs, signs, holograms)

### Starter Kit
- Give useful but not overpowered items
- Include land claiming tool
- Add server guide book
- Balance with server economy

### Rules
- Keep rules clear and simple
- Explain punishments
- Make rules accessible (/rules)
- Give rules book to new players

---

## Troubleshooting

### Starter Kit Not Given

Check:
- EssentialsX config for auto-kit
- Permissions (essentials.kits.starter)
- Kit cooldown settings

### Tutorial Not Starting

Check:
- NPC created correctly
- Command assigned to NPC
- Player permissions
- Tutorial world exists (if using separate world)

### NPCs Not Working

Requirements:
- Citizens plugin installed
- NPCs created and named
- Commands/text assigned
- NPCs are not in protected regions

### Messages Not Showing

Check:
- Plugin enabled (DeluxeHub or custom welcome plugin)
- EssentialsX join messages configured
- Delays not too long
- Color codes formatted correctly (&, not §)

---

## Configuration Files Reference

- `config/plugins/welcome/join-messages.yml` - Welcome and join/quit messages
- `config/plugins/welcome/starter-kit.yml` - Items for new players
- `config/plugins/welcome/tutorial-config.yml` - 5-step tutorial system
- `config/plugins/welcome/rules.yml` - Server rules and guidelines

---

## Quick Setup Checklist

- [ ] Install Citizens plugin
- [ ] Configure welcome messages
- [ ] Set up starter kit in EssentialsX
- [ ] Create tutorial area
- [ ] Place tutorial NPCs
- [ ] Add Discord invite link
- [ ] Test with new player account
- [ ] Configure rules command
- [ ] Set up first-join announcements
- [ ] Test tutorial completion rewards

---

**Ready to welcome new players?** Follow this guide to create an amazing first impression!

*For improvements or issues, submit a PR or contact server staff.*

---

## 📸 Screenshots

### Adding Screenshots

To add screenshots to this documentation:

1. Take screenshots of the welcome system
2. Save them in `docs/features/images/welcome-system/`
3. Add references in this section

**Recommended Screenshots:**
- Welcome message display
- Starter kit contents
- Tutorial NPC interactions
- Tutorial step locations
- Rules book/display
- Discord integration


---

← [Back to Features](./README.md) | [Documentation Home](../README.md)
