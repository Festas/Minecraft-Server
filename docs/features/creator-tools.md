← [Back to Features](./README.md) | [Documentation Home](../README.md)

---

# Content Creator Tools for festas_builds

Complete guide for content creators to film, record, and create amazing content on the server.

**Setup Difficulty:** ⭐⭐ Medium  
**Target Audience:** Content Creators & Server Administrators  
**Estimated Setup Time:** 30-45 minutes

---

## 📋 Dependencies

**Required:**
- SuperVanish (auto-installable via plugins.json)
- WorldEdit (already installed)
- LuckPerms (for creator rank permissions)

**Optional:**
- AdvancedReplay (for server-side recording)
- Citizens (for NPC guides)
- Camera plugins

**Configuration Files:**
- `config/plugins/creator-tools/vanish-config.yml`
- `config/plugins/creator-tools/replay-config.yml`
- `config/plugins/creator-tools/creator-permissions.yml`
- `config/plugins/creator-tools/filming-kit.yml`

---

## For Players (Content Creators)

This section is for approved content creators who have been granted the Creator rank.

## For Admins

This section covers setup and management of creator tools.

---

Complete guide for content creators to film, record, and create amazing content on the server.

---

## Overview

festas_builds provides comprehensive tools for content creators:
- **Vanish mode** for filming without interruption
- **Replay system** for recording gameplay
- **Camera tools** for cinematics
- **Time/weather control** for perfect shots
- **WorldEdit access** for set building
- **Creator rank** with special permissions

---

## Getting Creator Access

### Application Process

1. **Be a content creator** - Have active YouTube/Twitch channel
2. **Apply via Discord** - #creator-applications channel
3. **Staff review** - Evaluated by admin team
4. **Get approved** - Receive creator rank

### Requirements

- Active content creation (YouTube, Twitch, etc.)
- Family-friendly content
- Willingness to credit festas_builds
- Agreement to creator guidelines

---

## Creator Rank Permissions

### Full Permission List

**Vanish & Invisibility**:
- `/vanish` - Toggle invisibility
- Silent join/quit (no announcements)
- See other vanished players
- Stay vanished across sessions

**Gamemode Control**:
- `/gamemode creative` - Creative mode
- `/gamemode spectator` - Spectator mode (best for cameras)
- `/gamemode survival` - Return to survival

**Time & Weather**:
- `/time set <time>` - Control time of day
- `/weather <clear|rain|thunder>` - Control weather
- Freeze time: `/gamerule doDaylightCycle false`

**Teleportation**:
- `/tp <player|coordinates>` - Teleport anywhere
- `/tphere <player>` - Bring player to you
- `/tppos <x y z>` - Teleport to coordinates

**WorldEdit**:
- Full WorldEdit access for set building
- Copy/paste builds
- Save schematics
- Generate terrain

**Flight**:
- `/fly` - Toggle flight mode

**Replay System** (if AdvancedReplay installed):
- `/replay record` - Start recording
- `/replay stop` - Stop recording
- `/replay play <name>` - Play replay
- Camera paths and controls

---

## Vanish Mode (SuperVanish)

### Basic Usage

```bash
/vanish - Toggle vanish on/off
/v - Shortcut
```

When vanished:
- ✓ Invisible to players
- ✓ No join/quit messages
- ✓ Hidden from tab list
- ✓ Can still interact with world
- ✓ Night vision automatically enabled

### Advanced Features

**Silent Join**:
```bash
/silentjoin - Join without announcement
```

**Silent Quit**:
```bash
/silentquit - Leave without announcement
```

**See Other Vanished Players**:
- Other creators/staff who are vanished will show as `[VANISHED]`

### Best Practices

✅ **Use vanish for**:
- Filming without player interference
- Recording cinematic shots
- Preparing camera angles
- Testing shots

❌ **Don't use vanish for**:
- Spying on players
- Gaining unfair advantages
- Avoiding staff
- Trolling

---

## Filming Tools Kit

### Quick Access Items

See `config/plugins/creator-tools/filming-kit.yml` for full kit.

**Filming Kit** (`/filmingkit`):
- Vanish toggle item
- Gamemode selector
- Flight toggle
- Time control
- Weather control
- Replay controls
- Teleport pearls

### Preset Configurations

**Cinematic Mode**:
```bash
/filmpreset cinematic
```
- Spectator mode
- Noon lighting (time 6000)
- Clear weather
- Time frozen
- Vanish enabled

**Night Filming**:
```bash
/filmpreset night
```
- Midnight lighting
- Dramatic atmosphere
- Time frozen

**Dramatic Weather**:
```bash
/filmpreset dramatic
```
- Thunder and rain
- Moody atmosphere

**Reset**:
```bash
/filmpreset reset
```
- Return to normal gameplay
- Unvanish
- Re-enable time cycle

---

## Recording with Replay System

### Server-Side Recording (AdvancedReplay)

**Start Recording**:
```bash
/replay record
```

**Stop Recording**:
```bash
/replay stop
```

**View Replays**:
```bash
/replay list
```

**Play Replay**:
```bash
/replay play <name>
```

**Delete Replay**:
```bash
/replay delete <name>
```

### Camera Controls

**Free Camera Mode**:
- Use during replay playback
- Fly freely through the scene
- Spectator-like controls

**Camera Paths**:
```bash
/replay path create <name>
```
- Set keyframes
- Smooth camera movement
- Perfect for cinematic shots

**Playback Speed**:
- 0.25x, 0.5x, 1x, 2x, 4x speeds available
- Frame-by-frame stepping
- Pause/play controls

---

## Client-Side Replay Mod (Recommended)

For professional quality, use **Replay Mod** client-side:

### Why Replay Mod?

✅ Higher quality recordings
✅ More camera control
✅ Built-in video rendering
✅ Free camera movement
✅ No server load
✅ Professional features

### Download

**Website**: https://www.replaymod.com/

**Compatible with**:
- Fabric/Forge mods
- Optifine
- Shaders

### Combined Approach

**Best Results**:
1. Use server vanish mode during recording
2. Record with client-side Replay Mod
3. Edit footage in video editor
4. Combine multiple angles

---

## Time & Weather Control

### Time Commands

```bash
/time set day        # Time: 1000
/time set noon       # Time: 6000
/time set sunset     # Time: 12000
/time set night      # Time: 13000
/time set midnight   # Time: 18000
```

**Freeze Time**:
```bash
/gamerule doDaylightCycle false
```

**Resume Time**:
```bash
/gamerule doDaylightCycle true
```

### Weather Commands

```bash
/weather clear     # Clear skies
/weather rain      # Rainy
/weather thunder   # Thunderstorm
```

**Set Duration** (optional):
```bash
/weather clear 1000000  # Clear for long time
```

---

## WorldEdit for Set Building

### Basics

**Get Wand**:
```bash
//wand
```

**Select Area**:
- Left-click: First position
- Right-click: Second position

**Copy/Paste**:
```bash
//copy
//paste
```

**Set Blocks**:
```bash
//set <block>
```

**Replace Blocks**:
```bash
//replace <old> <new>
```

### Useful for Creators

**Create flat platform**:
```bash
//set stone
//set grass_block
```

**Clear area**:
```bash
//set air
```

**Save builds**:
```bash
//copy
//schem save <name>
//schem load <name>
```

---

## Best Practices for Content Creators

### Before Filming

✅ **Plan your shots**
- Storyboard camera angles
- Scout locations
- Test lighting

✅ **Notify staff**
- Let staff know you're filming
- Coordinate if large filming session

✅ **Optimize settings**
- Spectator mode for smooth flight
- Freeze time for consistent lighting
- Clear weather (unless dramatic)

### During Filming

✅ **Use vanish mode**
- Avoid player interruptions
- Stay focused

✅ **Use spectator mode**
- Smooth camera movement
- No fall damage
- Fly through blocks

✅ **Respect players**
- Don't interfere with gameplay
- Don't spoil hidden builds without permission

### After Filming

✅ **Unvanish**
- Return to normal mode
- Re-enable time cycle
- Interact with community

✅ **Credit the server**
- Mention "festas_builds" in video
- Link server IP (if agreed)
- Tag in video description

---

## Creator Guidelines

### Content Requirements

✅ **Family-friendly content**
- Keep videos appropriate for all ages
- No excessive profanity
- No inappropriate topics

✅ **Credit the server**
- Mention festas_builds in videos
- Link to server/Discord
- Use server name in title/tags

✅ **Be respectful**
- Blur player names if requested
- Don't showcase exploits publicly
- Follow all server rules

### What NOT to Do

❌ **Don't abuse permissions**
- No griefing with WorldEdit
- Don't interfere with players
- Don't use vanish to spy

❌ **Don't share exploits**
- Report bugs privately
- Don't showcase dupes
- Help improve server security

❌ **Don't create drama**
- Keep content positive
- No player call-outs
- Be a good community member

---

## Recommended Software & Mods

### Client-Side Mods

**Essential**:
- Replay Mod - Recording
- Optifine - Performance
- Shaders - Beautiful visuals

**Optional**:
- Camera Mod - Extra camera controls
- Better PVP - FPS boost
- JourneyMap - Minimap

### Video Editing

**Free**:
- DaVinci Resolve
- Shotcut
- OpenShot

**Paid**:
- Adobe Premiere Pro
- Final Cut Pro
- Sony Vegas

### Recording Software

- OBS Studio (free)
- Streamlabs OBS (free)
- XSplit (paid)

---

## Filming Techniques

### Camera Movement

**Smooth Flight**:
- Use spectator mode
- Slow, deliberate movements
- Use camera paths for smoothest results

**Cinematic Angles**:
- Low angles for epicness
- High angles for overview
- Dynamic movement for action

**Lighting**:
- Noon (time 6000) for bright, clear shots
- Sunset (12000) for warm, golden hour
- Night (18000) for moody, dramatic

### Build Showcase

**Structure Tour**:
1. Exterior overview (fly around)
2. Main entrance approach
3. Interior walkthrough
4. Detail shots
5. Final exterior shot

**Timelapse**:
1. Set up camera position
2. Record building process
3. Speed up in editing
4. Add music

---

## Troubleshooting

### Can't Vanish

Check:
- Do you have creator rank?
- Permission: `supervanish.vanish`
- Plugin installed: `/plugins`

### Replay Not Recording

Check:
- Start command: `/replay record`
- Storage space available
- AdvancedReplay installed

### WorldEdit Not Working

Check:
- Permission: `worldedit.*`
- FAWE installed
- Correct syntax: `//command`

### Can't Change Gamemode

Check:
- Creator rank assigned
- Permission: `minecraft.command.gamemode`
- Correct syntax: `/gamemode <mode>`

---

## Configuration Files

- `config/plugins/creator-tools/vanish-config.yml` - SuperVanish settings
- `config/plugins/creator-tools/replay-config.yml` - Replay system config
- `config/plugins/creator-tools/creator-permissions.yml` - Permission setup
- `config/plugins/creator-tools/filming-kit.yml` - Filming tools kit

---

## Quick Reference

### Essential Commands

```bash
# Vanish
/vanish - Toggle invisibility
/silentjoin - Silent join
/silentquit - Silent quit

# Gamemode
/gamemode spectator - Best for filming
/gamemode creative - For building sets
/gamemode survival - Return to normal

# Time & Weather
/time set 6000 - Noon
/weather clear - Clear skies
/gamerule doDaylightCycle false - Freeze time

# Filming Presets
/filmpreset cinematic - Perfect filming setup
/filmpreset reset - Return to normal

# Recording
/replay record - Start recording
/replay stop - Stop recording
/replay list - View replays

# Teleport
/tp <x y z> - Teleport to coordinates
/spawn - Return to spawn

# WorldEdit
//wand - Get selection tool
//copy - Copy selection
//paste - Paste selection
```

---

**Ready to create amazing content?** Use these tools wisely, credit the server, and make festas_builds proud!

*For creator support, contact staff or join #creators channel in Discord.*

---

## 📸 Screenshots

### Adding Screenshots

To add screenshots to this documentation:

1. Take screenshots of creator tools in action
2. Save them in `docs/features/images/creator-tools/`
3. Add references in this section

**Recommended Screenshots:**
- Vanish mode interface
- Filming kit GUI
- Replay system controls
- Camera path creation
- Time/weather controls
- Before/after cinematics


---

← [Back to Features](./README.md) | [Documentation Home](../README.md)
