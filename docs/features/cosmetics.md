← [Back to Features](./README.md) | [Documentation Home](../README.md)

---

# Cosmetics & Rewards System for festas_builds

Complete guide to the cosmetics system - unlock hats, particles, and rewards through gameplay!

**Setup Difficulty:** ⭐⭐ Medium  
**Target Audience:** Server Administrators & Players  
**Estimated Setup Time:** 30-45 minutes

---

## 📋 Dependencies

**Required:**
- PlayerParticles (auto-installable via plugins.json)
- LuckPerms (for rank-based permissions)

**Manual Installation Required:**
- HMCCosmetics (download from SpigotMC)
- HeadDatabase (download from SpigotMC)

**Configuration Files:**
- `config/plugins/cosmetics/particle-effects.yml`
- `config/plugins/cosmetics/cosmetics-config.yml`
- `config/plugins/cosmetics/ranks-rewards.yml`

---

Complete guide to the cosmetics system - unlock hats, particles, and rewards through gameplay!

---

## Overview

The festas_builds server features a comprehensive cosmetics system that rewards players for:
- **Playtime** - Earn ranks and cosmetics by playing
- **Competitions** - Win exclusive items
- **Achievements** - Complete challenges
- **Rank Progression** - Unlock new cosmetics at each rank

**EULA Compliant**: All cosmetics are visual only - no gameplay advantages!

---

## Available Cosmetics

### Particle Effects (PlayerParticles)

#### Basic Effects (Everyone)
- **Flame Trail** - Leave flames behind you
- **Love Aura** - Floating hearts
- **Music Notes** - Musical particles

#### Builder Rank (10+ hours)
- **Happy Particles** - Green sparkles
- **Enchanting Aura** - Mystical symbols
- **Water Drops** - Refreshing droplets

#### Architect Rank (50+ hours)
- **Beam of Light** - Bright light particles
- **Celebration** - Firework bursts
- **Dragon Aura** - Purple dragon breath
- **Totem Blessing** - Golden particles

#### Master Builder Rank (200+ hours)
- **Soul Fire** - Blue soul fire trail
- **Cherry Blossom** - Pink petals
- **Sculk Energy** - Mysterious sculk particles

#### Competition Winners
- **Winner's Spark** - Electric sparks
- **Champion Glow** - Radiant glow
- **Legendary Aura** - Exclusive ominous effect

### Hats & Cosmetic Items (HMCCosmetics)

#### Basic Hats (Everyone)
- Builder's Hard Hat
- Party Hat
- Chef's Hat

#### Builder Rank
- Basic Crown (gold)
- Construction Helmet

#### Architect Rank
- Silver Crown
- Elegant Top Hat
- Wizard Hat
- Diamond Backpack
- Rainbow Balloon Bundle

#### Master Builder Rank
- Master's Golden Crown
- Angelic Halo
- Angel Wings Backpack

#### Competition Winners
- Competition Winner Crown (diamond)
- Laurel Wreath
- Winner cosmetic set

---

## Rank Progression System

### Rank Tiers

```
Newcomer → Builder → Architect → Master Builder → Legend
   0h       10h       50h          200h           Win Competition
```

### Rank Details

**Newcomer** (0 hours)
- Basic particle effects
- Basic hats
- Starting cosmetics

**Builder** (10 hours)
- Basic crown
- Enhanced particles
- Colorful backpack
- 3 homes, increased claims

**Architect** (50 hours)
- Silver crown & top hats
- Advanced particles (dragon breath, fireworks)
- Rainbow balloon
- Diamond backpack
- WorldEdit access

**Master Builder** (200 hours)
- Golden Master Crown
- Angelic halo & wings
- Soul fire & cherry blossom effects
- Master Builder aura combo
- Full WorldEdit access

**Legend** (Competition Winner)
- Diamond Winner Crown
- Exclusive legendary particles
- Champion glow effect
- Hall of Fame entry
- All cosmetics unlocked

---

## How to Use Cosmetics

### Particle Effects

```
/pp - Open particle menu
/pp list - List available effects
/pp add <effect> <style> - Add a particle effect
/pp remove <id> - Remove an effect
/pp reset - Remove all effects
```

**Styles**:
- Trail - Follows you as you move
- Halo - Circle above head
- Orbit - Particles orbit around you
- Wings - Particle wings
- Feet - Particles at feet

### Hats & Items

```
/cosmetics - Open cosmetics wardrobe
/cosmetics hat - Browse hats
/cosmetics backpack - Browse backpacks
/cosmetics balloon - Browse balloons
```

---

## Unlocking Cosmetics

### Through Playtime

Cosmetics unlock automatically as you rank up:
- Play regularly
- Build and participate
- Reach hourly milestones
- Auto-rank system handles progression

### Through Competitions

Win build competitions to unlock:
- Winner crowns
- Exclusive particles
- Legend rank
- Special effects

See [build-competitions.md](./build-competitions.md) for details.

### Through Achievements

Complete server challenges:
- First claim
- First home set
- Help new players
- Community projects

---

## Integration with LuckPerms

Cosmetics are tied to your rank. Example setup:

```bash
# Grant particle permission to builders
lp group builder permission set playerparticles.effect.villager_happy true

# Grant hat to architects
lp group architect permission set cosmetics.hat.crown_silver true
```

See `config/plugins/cosmetics/ranks-rewards.yml` for full permission list.

---

## EULA Compliance

✅ **All cosmetics are VISUAL ONLY**
✅ **No gameplay advantages**
✅ **Can be earned through free gameplay**
✅ **Can be offered to supporters (cosmetic perks only)**

Safe for monetization:
- Cosmetic-only supporter perks
- No pay-to-win elements
- Earn everything through gameplay

---

## FAQ

**Q: Can I buy cosmetics?**
A: No direct purchase. You can earn all cosmetics by playing! Supporters may get early access to seasonal cosmetics (still EULA compliant).

**Q: How long to unlock all cosmetics?**
A: Most cosmetics unlock through normal play. Master Builder rank (200h) unlocks majority. Legend cosmetics require competition wins.

**Q: Can I use multiple particles?**
A: Yes! Up to 3 particles at once (configurable).

**Q: Do cosmetics reset?**
A: No - once unlocked, they're permanent!

**Q: Can I preview cosmetics?**
A: Yes - use `/cosmetics` GUI to preview hats and items.

---

## Configuration Files

- `config/plugins/cosmetics/particle-effects.yml` - Particle configurations
- `config/plugins/cosmetics/cosmetics-config.yml` - Hats and items
- `config/plugins/cosmetics/ranks-rewards.yml` - Rank progression and rewards

---

## Quick Reference

### Commands

```bash
/cosmetics - Open wardrobe
/pp - Particle menu
/pp add flame trail - Add flame trail
/cosmetics hat - Browse hats
```

### Plugin Requirements

- PlayerParticles (auto-install via plugins.json)
- HMCCosmetics (manual download from SpigotMC)
- HeadDatabase (manual download from SpigotMC)
- LuckPerms (already installed)

---

**Ready to customize your appearance?** Start playing, rank up, and unlock amazing cosmetics!

*For support or suggestions, contact server staff or submit a GitHub PR.*

---

## 📸 Screenshots

### Adding Screenshots

To add screenshots to this documentation:

1. Take screenshots of the cosmetics system in action
2. Save them in `docs/features/images/cosmetics/`
3. Add references in this section

**Recommended Screenshots:**
- Particle effects showcase
- Cosmetics menu/GUI
- Different rank cosmetics
- Player with multiple cosmetics equipped
- Competition winner cosmetics


---

← [Back to Features](./README.md) | [Documentation Home](../README.md)
