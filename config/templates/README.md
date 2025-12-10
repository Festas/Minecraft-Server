# Templates Directory

**Templates for competitions, events, and server activities**

This directory contains templates and resources for organizing server events, competitions, and other structured activities.

## 📁 Directory Structure

```
templates/
├── README.md                    # This file
└── competitions/                # Build competition templates
    └── weekly-themes.md         # Competition theme library
```

## 🏗️ Build Competitions

### Weekly Themes Library

**File**: [`competitions/weekly-themes.md`](competitions/weekly-themes.md)

A curated collection of building competition themes organized by difficulty and category. Use these themes for:
- Weekly build competitions
- Special events
- Creative challenges
- Community building activities

#### Using Competition Themes

**Via Competition Manager Script**:
```bash
# Start competition with random theme
./scripts/competition-manager.sh start

# Manually announce a theme
./scripts/competition-manager.sh announce "Medieval Castle"
```

**Manually Selecting a Theme**:
1. Open `competitions/weekly-themes.md`
2. Browse themes by category or difficulty
3. Select an appropriate theme
4. Announce to players via RCON or console

#### Theme Categories

Themes are organized into these categories:

- **🏛️ Architecture & Buildings**: Castles, temples, modern structures
- **🌿 Nature & Landscapes**: Gardens, forests, natural formations
- **🚀 Fantasy & Sci-Fi**: Magical towers, spaceships, futuristic cities
- **🎨 Abstract & Creative**: Emotions, concepts, art installations
- **🎄 Seasonal & Events**: Holidays, seasons, celebrations
- **⚙️ Technical & Redstone**: Mechanisms, contraptions, automation
- **🌍 Themed Worlds**: Specific universes, time periods, cultures

#### Difficulty Levels

- **Easy**: Simple builds, basic shapes, good for beginners
- **Medium**: More complex structures, intermediate techniques
- **Hard**: Advanced builds, large scale, expert techniques
- **Expert**: Extremely challenging, requires mastery

### Adding New Themes

To add new competition themes:

1. Open `competitions/weekly-themes.md`
2. Add to the appropriate category section
3. Include:
   - Theme name
   - Difficulty level
   - Brief description or requirements
   - Optional: Suggested plot size or materials

**Example Format**:
```markdown
### 🏰 Medieval Village
**Difficulty**: Medium
Create a small medieval village with at least 3 buildings, a central square, and period-appropriate details.
- Suggested plot size: 64x64
- Materials: Stone, wood, cobblestone
```

## 📝 Creating New Templates

### Template Guidelines

When creating new templates for server activities:

1. **Use Clear Structure**:
   - Sections for different aspects
   - Easy-to-scan format
   - Consistent naming conventions

2. **Include Examples**:
   - Show what success looks like
   - Provide concrete examples
   - Link to reference builds if possible

3. **Define Requirements**:
   - What's required vs. optional
   - Judging criteria (for competitions)
   - Time limits or constraints

4. **Add Context**:
   - Why this template exists
   - When to use it
   - How to customize it

### Template Types

Consider creating templates for:

- **Events**: Holiday events, celebrations, special occasions
- **Challenges**: Speed builds, resource restrictions, theme variations
- **Tours**: Guided server tours, showcase events
- **Workshops**: Building tutorials, technique demonstrations
- **Contests**: PvP tournaments, parkour races, treasure hunts

### Example: Event Template Structure

```markdown
# Event Name Template

## Overview
- **Type**: Competition/Workshop/Challenge
- **Duration**: X hours/days
- **Participants**: Solo/Team/Everyone
- **Difficulty**: Easy/Medium/Hard

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Rules
1. Rule 1
2. Rule 2
3. Rule 3

## Judging Criteria
- Criteria 1 (X points)
- Criteria 2 (Y points)
- Criteria 3 (Z points)

## Prizes
- 1st Place: Prize description
- 2nd Place: Prize description
- 3rd Place: Prize description

## Setup Instructions
1. Step 1
2. Step 2
3. Step 3

## Announcement Template
Copy this announcement for Discord/in-game:

```
[EVENT ANNOUNCEMENT TEXT HERE]
```

## Tips for Participants
- Tip 1
- Tip 2
- Tip 3
```

## 🛠️ Using Templates

### For Administrators

1. **Review Template**: Read through the template to understand requirements
2. **Customize**: Adjust timing, rules, or requirements as needed
3. **Prepare**: Set up necessary plugins, plots, or permissions
4. **Announce**: Share with players via Discord, website, or in-game
5. **Execute**: Run the event according to template guidelines
6. **Document**: Record results and lessons learned

### For Players

1. **Read Carefully**: Review all requirements and rules
2. **Ask Questions**: Clarify anything unclear before starting
3. **Follow Guidelines**: Adhere to specified rules and constraints
4. **Be Creative**: Templates provide structure, but creativity matters
5. **Have Fun**: Templates enhance the experience, not restrict it

## 📋 Competition Management Workflow

### Before Competition

1. **Select Theme**: Choose from `competitions/weekly-themes.md`
2. **Set Up Plots**: Configure PlotSquared if needed
3. **Announce**: Notify players via Discord and in-game
4. **Prepare**: Ensure all plugins and permissions are ready

### During Competition

1. **Monitor**: Watch for rule violations or technical issues
2. **Support**: Help players with questions or problems
3. **Engage**: Encourage participation and creativity
4. **Document**: Take screenshots or recordings

### After Competition

1. **Judge**: Review submissions using defined criteria
2. **Announce Winners**: Share results with community
3. **Award Prizes**: Distribute rewards
4. **Showcase**: Feature winning builds on website/Discord
5. **Feedback**: Gather feedback for future improvements

## 🎯 Best Practices

### Theme Selection

- **Variety**: Rotate between different categories
- **Difficulty**: Mix easy and hard themes
- **Seasonality**: Use seasonal themes when appropriate
- **Player Input**: Consider community suggestions
- **Balance**: Ensure themes work for different skill levels

### Competition Timing

- **Advance Notice**: Announce at least 48 hours before
- **Reasonable Duration**: Give enough time but maintain excitement
- **Time Zones**: Consider international player base
- **Avoid Conflicts**: Don't overlap with major events

### Judging

- **Clear Criteria**: Define judging standards upfront
- **Multiple Judges**: Use 2-3 judges for fairness
- **Transparency**: Explain scoring to participants
- **Consistency**: Apply same standards to all entries
- **Feedback**: Provide constructive feedback to all

## 🔍 Finding Templates

### By Activity Type

- **Build Competitions**: `competitions/weekly-themes.md`
- **Events**: (Future templates will go here)
- **Challenges**: (Future templates will go here)

### By Difficulty

```bash
# Search themes by difficulty
grep -i "easy" competitions/weekly-themes.md
grep -i "medium" competitions/weekly-themes.md
grep -i "hard" competitions/weekly-themes.md
```

### By Category

Browse the weekly-themes.md file directly to see all categories and themes.

## 🚀 Future Template Ideas

Consider adding templates for:

- **Seasonal Events**: Halloween haunted house, Winter wonderland
- **Collaborative Builds**: Server spawn, community projects
- **Speed Builds**: 30-minute challenges, time trials
- **Resource Challenges**: Limited blocks, specific palettes
- **Roleplay Events**: Themed gameplay sessions
- **Building Workshops**: Tutorial sessions, technique sharing

## 📚 Related Documentation

- [Build Competitions Guide](../../docs/features/build-competitions.md)
- [Admin Guide](../../docs/admin/admin-guide.md)
- [Competition Manager Script](../../scripts/competition-manager.sh)
- [PlotSquared Configuration](../plugins/plotsquared/)

## 🔗 External Resources

- [Minecraft Building Ideas](https://www.minecraft.net/en-us/article/best-minecraft-builds)
- [Build Competition Examples](https://www.planetminecraft.com/contests/)
- [Theme Generators](https://perchance.org/minecraft-build-idea)

## 🆘 Getting Help

- **Theme Suggestions**: Create an issue or discussion on GitHub
- **Technical Issues**: See [troubleshooting guide](../../docs/troubleshooting/common-issues.md)
- **Event Planning**: Ask in Discord admin channel
- **Community Input**: Post in Discord for feedback

---

**Last Updated**: December 2025  
**Maintainer**: Festas Build Server Team
