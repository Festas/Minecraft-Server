← [Back to Features](./README.md) | [Documentation Home](../README.md)

---

# Build Competition System for festas_builds

A complete guide to running engaging build competitions on the festas_builds Minecraft server using PlotSquared and custom management tools.

**Setup Difficulty:** ⭐⭐ Medium  
**Target Audience:** Server Administrators & Players  
**Estimated Setup Time:** 45-60 minutes

---

## 📋 Dependencies

**Required:**
- PlotSquared (auto-installable via plugins.json)
- FastAsyncWorldEdit (FAWE) - Required dependency for PlotSquared

**Optional:**
- DiscordSRV (for Discord integration)
- LuckPerms (for permission-based rewards)
- Multiverse-Core (for competition world management)

**Additional Resources:**
- Competition manager script (`scripts/utilities/competition-manager.sh`)
- Theme library (`config/templates/competitions/weekly-themes.md`)

---

A complete guide to running engaging build competitions on the festas_builds Minecraft server using PlotSquared and custom management tools.

---

## Table of Contents

1. [Overview](#overview)
2. [System Components](#system-components)
3. [Installation & Setup](#installation--setup)
4. [Creating Competition Worlds](#creating-competition-worlds)
5. [Running Competitions](#running-competitions)
6. [Voting Systems](#voting-systems)
7. [Rewards & Recognition](#rewards--recognition)
8. [Competition Schedule](#competition-schedule)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Build competitions are a core feature of the festas_builds server, providing:

- **Weekly/Monthly themed building contests**
- **Plot-based competition system** (100x100 plots)
- **Community voting and judging**
- **Exclusive cosmetic rewards** for winners
- **Rank progression** (Legend status for champions)
- **Discord integration** for announcements

### Competition Flow

```
1. Announce Theme → 2. Players Claim Plots → 3. Build Period (1 week) 
→ 4. Voting Period (3 days) → 5. Winners Announced → 6. Rewards Given → 7. Reset
```

---

## System Components

### Required Plugins

1. **PlotSquared** - Plot management system
   - GitHub: IntellectualSites/PlotSquared
   - Provides competition plots and world management

2. **FastAsyncWorldEdit (FAWE)** - Enhanced WorldEdit
   - GitHub: IntellectualSites/FastAsyncWorldEdit
   - Required dependency for PlotSquared
   - Better performance for builders

### Configuration Files

- `config/plotsquared/settings.yml` - Main PlotSquared configuration
- `config/plotsquared/worlds.yml` - Competition world settings
- `scripts/utilities/competition-manager.sh` - Competition automation script
- `config/templates/competitions/weekly-themes.md` - Theme library

---

## Installation & Setup

### Step 1: Enable Plugins

Edit `plugins.json`:

```json
{
  "name": "FastAsyncWorldEdit",
  "enabled": true,  // Set to true
  ...
},
{
  "name": "PlotSquared",
  "enabled": true,  // Set to true
  ...
}
```

### Step 2: Install Plugins

```bash
cd /home/deploy/minecraft-server
./install-plugins.sh
```

### Step 3: Configure PlotSquared

Copy our templates:

```bash
# After first server start with PlotSquared
cp config/plotsquared/settings.yml plugins/PlotSquared/settings.yml
cp config/plotsquared/worlds.yml plugins/PlotSquared/worlds.yml
```

### Step 4: Create Competition World

```bash
# In-game or console
/mv create competition normal -g PlotSquared

# Or using Multiverse-Core
/mvcreate competition normal -g PlotSquared
```

### Step 5: Configure World Settings

Edit `plugins/PlotSquared/worlds.yml`:

```yaml
worlds:
  competition:
    generator:
      type: PlotSquared
    plot:
      size: 100  # 100x100 plots
    road:
      width: 7
```

### Step 6: Restart Server

```bash
sudo systemctl restart minecraft.service
```

---

## Creating Competition Worlds

### Basic Competition World

```
/plot setup
```

Follow the wizard:
- World name: `competition`
- Plot size: `100`
- Road width: `7`
- Floor: `grass_block`
- Wall: `stone_bricks`
- Road: `quartz_block`

### Alternative: Pre-configured World

Our `worlds.yml` template includes a pre-configured competition world. Just create the world with:

```
/mv create competition normal -g PlotSquared
```

### World Features

- **Plot Size**: 100x100 (good for themed builds)
- **Road Width**: 7 blocks (easy navigation)
- **Floor**: Grass blocks
- **Walls**: Stone bricks
- **Road**: Quartz blocks
- **Build Height**: Full 256 blocks
- **Protected**: No PvP, no mob spawning, time locked at noon

---

## Running Competitions

### Using the Competition Manager Script

We've provided a bash script to automate competition management:

```bash
./scripts/utilities/competition-manager.sh [command]
```

Commands:
- `start` - Start new competition with random theme
- `end` - End build period, start voting
- `reset` - Clear all plots for next competition
- `announce` - Remind players about current competition
- `vote` - Open voting period
- `winners` - Announce competition winners

### Manual Competition Management

#### 1. Start Competition

```bash
# Choose a theme from config/templates/competitions/weekly-themes.md
# Or let the script choose randomly:
./scripts/utilities/competition-manager.sh start
```

This will:
- Pick a random theme
- Announce to server
- Save theme to file
- Allow players to claim plots

#### 2. Player Claims Plot

Players use:
```
/plots auto
```

PlotSquared automatically assigns them an empty plot.

#### 3. Building Period

- Default: 1 week
- Players build according to theme
- Use WorldEdit for efficiency
- Plots are protected automatically

#### 4. End Build Period

```bash
./scripts/utilities/competition-manager.sh end
```

Announces end of building, starts voting period.

#### 5. Voting Period

Players visit builds and vote:

```
/plots visit <player>
/plot rate <1-10>
```

Duration: 3 days

#### 6. Announce Winners

```bash
./scripts/utilities/competition-manager.sh winners
```

Enter 1st, 2nd, 3rd place winners.

#### 7. Give Rewards

See [Rewards & Recognition](#rewards--recognition)

#### 8. Reset for Next Competition

```bash
./scripts/utilities/competition-manager.sh reset
```

⚠️ **Warning**: This clears ALL plots!

---

## Voting Systems

### Option 1: In-Game Rating (PlotSquared)

**Pros**: Built-in, automatic
**Cons**: Can be biased, requires players to visit all plots

Players use:
```
/plot rate <1-10>
```

View top rated:
```
/plot top
```

### Option 2: Discord Poll

**Pros**: More participants, fair voting, persistent record
**Cons**: Requires manual setup each time

1. Post builds to Discord #competition channel
2. Create poll with reactions (🥇 🥈 🥉)
3. Players vote via reactions
4. Tally votes after 3 days

### Option 3: Staff Judging

**Pros**: Expert judgment, fair, detailed feedback
**Cons**: Less community involvement

Criteria:
- **Creativity** (30%): Unique interpretation of theme
- **Technique** (30%): Building skill and detail
- **Theme Adherence** (30%): How well it matches theme
- **Overall** (10%): Wow factor

### Option 4: Hybrid System (Recommended)

1. Community voting (50% weight)
2. Staff judging (50% weight)
3. Combine scores for final rankings

Provides balance between popular vote and expert judgment.

---

## Rewards & Recognition

### 1st Place Winner

**Cosmetics**:
- Winner Crown (diamond helmet)
- Winner's Spark particle effect
- Champion Glow particle
- Laurel wreath hat

**Rank**:
- Legend rank (if not already)

**Recognition**:
- Featured on Discord
- Build showcased at spawn
- Name on hall of fame
- Competition winner tag

**Commands** (LuckPerms):
```bash
lp user <winner> parent set legend
lp user <winner> permission set cosmetics.hat.winner true
lp user <winner> permission set playerparticles.effect.electric_spark true
```

### 2nd Place

**Cosmetics**:
- Silver Crown
- Firework particle effect

**Commands**:
```bash
lp user <player> permission set cosmetics.hat.crown_silver true
lp user <player> permission set playerparticles.effect.firework true
```

### 3rd Place

**Cosmetics**:
- Basic Crown
- Totem particle effect

**Commands**:
```bash
lp user <player> permission set cosmetics.hat.crown_basic true
lp user <player> permission set playerparticles.effect.totem_of_undying true
```

### Participation Rewards

All participants get:
- Builder XP points
- Entry in competition history
- Practice and community recognition

---

## Competition Schedule

### Weekly Competitions (Recommended)

**Format**: Small-medium builds
**Duration**: 5-7 days building + 2-3 days voting
**Themes**: Rotate through easy-medium difficulty

Example schedule:
- Monday: Announce theme
- Monday-Sunday: Building period
- Monday-Wednesday: Voting
- Thursday: Winners announced
- Friday: Reset and new theme

### Monthly Grand Competitions

**Format**: Large, complex builds
**Duration**: 3-4 weeks building + 1 week voting
**Themes**: Complex, challenging themes
**Rewards**: Extra special (custom cosmetics, featured builds)

### Special Event Competitions

- **Holiday themed** (Halloween, Christmas, etc.)
- **Collaboration competitions** (teams of 2-4)
- **Speed build competitions** (24 hours)
- **Specific block palette challenges**

---

## Best Practices

### For Competition Organizers

1. **Announce Early**: Give 24-48 hours notice before start
2. **Clear Themes**: Be specific but allow creativity
3. **Consistent Schedule**: Same day/time each week
4. **Fair Judging**: Use consistent criteria
5. **Celebrate Participation**: Recognize all entries
6. **Showcase Builds**: Share screenshots on Discord
7. **Keep Plots Clean**: Reset promptly after competition

### For Theme Selection

✅ **Good Themes**:
- "Medieval Castle"
- "Underwater Base"
- "Cozy Cottage"
- "Futuristic City"

❌ **Vague Themes**:
- "Something cool"
- "Build anything"
- "Be creative"

✅ **Add Constraints** (optional):
- "Medieval Castle under siege"
- "Underwater base with no glass"
- "Cozy cottage using only 5 block types"

### For Voting

1. **Anonymize** builds during voting (if possible)
2. **Set clear criteria**
3. **Encourage constructive feedback**
4. **No self-voting** (enforce with permissions)
5. **Screenshot all entries** before reset

### For Community Engagement

1. Post builds on Discord
2. Stream build tours
3. Create compilation videos
4. Feature in festas_builds content
5. Player spotlights
6. Behind-the-scenes build process posts

---

## Troubleshooting

### Players Can't Claim Plots

**Check**:
```
/plot list available
```

**Solution**: Ensure world is set up correctly:
```
/plot setup
```

### Plots Not Resetting

**Manual clear**:
```
/plot clear *
```

Or delete and regenerate chunks:
```
/plot regen *
```

### WorldEdit Not Working

**Check FAWE is installed**:
```
/fawe version
```

**Grant permissions**:
```
lp group builder permission set worldedit.* true
```

### Rating System Not Working

**Enable in settings.yml**:
```yaml
ratings:
  enabled: true
```

**Restart server** after config change.

### Competition World Not Loading

**Check multiverse**:
```
/mv list
```

**Import world**:
```
/mv import competition normal
```

---

## Advanced Features

### Custom Plot Sizes

Edit `worlds.yml`:
```yaml
plot:
  size: 150  # For larger builds
```

### Team Competitions

Allow plot merging:
```yaml
claiming:
  plot-merge: true
```

Players merge with:
```
/plot merge <direction>
```

### Plot Themes

Set different floor blocks per competition:
```
/plot set floor grass_block
/plot set floor sand
/plot set floor stone
```

### Competition Archives

Save schematics of winning builds:
```
/plot download
```

Or use WorldEdit:
```
//copy
//schem save competition_winner_<name>
```

---

## Integration with Other Features

### Discord Integration

Post to Discord when:
- New competition starts
- Voting begins
- Winners announced

### Cosmetics System

Winners automatically unlock exclusive cosmetics (see [cosmetics.md](./cosmetics.md)).

### Rank Progression

Competition wins contribute to Legend rank requirements (see ranks-rewards.yml).

---

## Resources

- **PlotSquared Wiki**: https://github.com/IntellectualSites/PlotSquared/wiki
- **Theme Ideas**: See `config/templates/competitions/weekly-themes.md`
- **Competition Manager Script**: `scripts/utilities/competition-manager.sh`
- **Discord Community**: Share builds and get inspiration!

---

## Quick Reference

### Essential Commands

```bash
# Admin Commands
/plot setup                    # Create competition world
/plot claim                   # Manually claim plot
/plot auto                    # Auto-assign plot to player
/plot clear *                 # Clear all plots
/plot delete                  # Delete plot
/plot set floor <block>       # Change floor block

# Player Commands
/plots auto                   # Claim competition plot
/plot home                    # Go to your plot
/plot visit <player>          # Visit another plot
/plot rate <1-10>             # Rate current plot
/plot trust <player>          # Add friend to plot
/plot info                    # Plot information

# Competition Manager Script
./scripts/utilities/competition-manager.sh start     # Start competition
./scripts/utilities/competition-manager.sh end       # End building period
./scripts/utilities/competition-manager.sh reset     # Clear all plots
./scripts/utilities/competition-manager.sh announce  # Remind players
./scripts/utilities/competition-manager.sh winners   # Announce winners
```

---

**Ready to run amazing build competitions?** Follow this guide, be creative with themes, and watch your community thrive!

*For questions or improvements, submit a PR or contact server staff.*

---

## 📸 Screenshots

### Adding Screenshots

To add screenshots to this documentation:

1. Take screenshots of your competition setup
2. Save them in `docs/features/images/build-competitions/`
3. Add references in this section

**Recommended Screenshots:**
- Competition plot overview
- Voting interface
- Competition manager script in action
- Example builds from past competitions
- Discord integration announcements


---

← [Back to Features](./README.md) | [Documentation Home](../README.md)
