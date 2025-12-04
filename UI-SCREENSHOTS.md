# Plugin Manager UI Screenshots

This document describes what the UI looks like for documentation purposes.

## Main Plugin Manager Page (`/console/plugins.html`)

### Header
- Title: "🎮 Festas Builds - Plugin Manager"
- User badge showing admin username
- Logout button on the right

### Sidebar Navigation
- Dashboard
- Console
- Players
- Controls
- Backups
- **Plugins** (highlighted/active)
- Settings

### Quick Install Section
A card at the top with:
- Large text input for plugin URL with placeholder: "Paste plugin URL here (Direct JAR, GitHub release, Modrinth)..."
- Optional text input for custom name with placeholder: "Custom name (optional - auto-detected from plugin.yml)"
- Two buttons:
  - "⬇️ Install Plugin" (primary blue button)
  - "📋 Bulk Install" (secondary gray button)

### Installed Plugins Section
A card showing:
- Header: "🔌 Installed Plugins" with count badge
- Refresh button (🔄)
- List of plugin items, each showing:
  - Toggle switch (green when enabled)
  - Plugin name (bold)
  - Version badge (blue)
  - Source badge (purple)
  - Category badge (orange)
  - Description text
  - Action buttons:
    - Rollback (↩️) - if backup exists
    - Uninstall (🗑️)

### Installation History Section
A card showing:
- Header: "📜 Installation History"
- Clear button
- List of history items with:
  - Icon (✅, ⬆️, ⬇️, 🗑️, etc.)
  - Action description
  - Timestamp (relative: "2 minutes ago", "1 hour ago")

## Modal Dialogs

### Confirmation Modal
Shows when:
- Updating a plugin
- Downgrading a plugin
- Reinstalling a plugin
- Uninstalling a plugin
- Rolling back a plugin

Contains:
- Title (e.g., "⬆️ Update Available")
- Message with version comparison
- Action buttons (context-specific)

### Multi-Option Modal
Shows when GitHub release has multiple JAR files:
- Title: "Select Plugin File"
- List of available JARs with:
  - Filename
  - Size in KB/MB
  - "← Recommended" tag on first option
- Cancel button

### Bulk Install Modal
Shows when clicking "Bulk Install":
- Title: "Bulk Install Plugins"
- Large textarea for URLs (one per line)
- "Install All" button
- "Cancel" button
- Progress section showing:
  - ⏳ Pending items
  - ✅ Successfully installed
  - ❌ Failed installations

## Color Scheme

- Primary Blue: #4a9eff (buttons, badges)
- Success Green: #4CAF50 (toggles, success messages)
- Warning Orange: #e65100 (warnings, categories)
- Danger Red: #f44336 (delete actions, errors)
- Purple: #7b1fa2 (source badges)
- Gray: #666 (secondary text)

## Responsive Design

- Desktop: Sidebar on left, main content fills remaining space
- Tablet: Sidebar collapses to icons only
- Mobile: Sidebar becomes hamburger menu

## Toast Notifications

Appear in top-right corner:
- Success: Green background with ✅ icon
- Error: Red background with ❌ icon
- Info: Blue background with ℹ️ icon
- Warning: Orange background with ⚠️ icon

Auto-dismiss after 5 seconds.

## Loading States

- Empty state shows centered icon and message
- Loading shows "Loading..." with spinner
- Plugin list shows actual data when loaded

## Example Plugin Entry

```
[✅ Toggle]  LuckPerms
             v5.4.120  modrinth  essential
             Advanced permissions management system
             [↩️ Rollback] [🗑️ Delete]
```

## Example History Entry

```
⬆️  Updated LuckPerms v5.4.102 → v5.4.120
    2 hours ago
```

## Accessibility

- All buttons have title attributes
- Semantic HTML structure
- Keyboard navigable
- Screen reader friendly labels
- High contrast text
