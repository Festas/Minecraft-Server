# Frontend Modernization Documentation

## Overview

This document describes the modernized frontend architecture for the Minecraft Server Console. The implementation focuses on maintainability, accessibility, and user experience while maintaining the existing vanilla JavaScript approach to minimize dependencies and complexity.

## Architecture Decision

### Why Modular Vanilla JavaScript?

After evaluating modern frameworks (React, Vue, Svelte), we chose to enhance the existing vanilla JavaScript architecture with a modular approach because:

1. **Minimal Dependencies**: No build tools or framework dependencies reduce complexity and maintenance burden
2. **Performance**: Native JavaScript performs better for this use case with no virtual DOM overhead
3. **Learning Curve**: Easier for contributors familiar with vanilla JS to understand and contribute
4. **Simplicity**: The console is relatively small and doesn't require the complexity of a full framework
5. **Compatibility**: Works seamlessly with the existing Express/Socket.io backend

### Architecture Pattern

The frontend follows a **modular component pattern** using ES6 classes and modules:

- **Separation of Concerns**: Each module handles a specific responsibility (theme management, accessibility, notifications, etc.)
- **Event-Driven Communication**: Components communicate via custom events and the global event bus
- **State Management**: Lightweight state management using localStorage and in-memory objects
- **Progressive Enhancement**: Core functionality works without JavaScript; enhancements improve UX

## Module Structure

### Core Modules

```
console/frontend/
├── js/
│   ├── themeManager.js       # Theme switching and persistence
│   ├── accessibility.js      # Accessibility enhancements
│   ├── app.js                # Main application initialization
│   ├── utils.js              # Shared utility functions
│   ├── websocket.js          # WebSocket connection management
│   ├── notifications.js      # Toast notification system
│   ├── console.js            # Console output handling
│   ├── players.js            # Player management
│   ├── commands.js           # Command execution
│   ├── pluginsV2.js          # Plugin manager (V2)
│   └── user-management.js    # User management UI
├── css/
│   ├── style.css             # Base styles and dark theme
│   ├── theme-light.css       # Light theme overrides
│   ├── accessibility.css     # Accessibility enhancements
│   ├── console.css           # Console-specific styles
│   ├── minecraft-theme.css   # Minecraft aesthetic
│   └── plugins.css           # Plugin manager styles
└── *.html                    # Page templates
```

### Module Loading Order

Modules must be loaded in the correct order to ensure dependencies are available:

1. **themeManager.js** - Loads first to apply theme before rendering
2. **accessibility.js** - Loads early to enhance DOM as it loads
3. **utils.js** - Provides shared utilities for other modules
4. **websocket.js** - Establishes real-time connection
5. **notifications.js** - Toast notification system
6. **Feature modules** - console.js, players.js, commands.js, etc.
7. **app.js** - Main initialization and orchestration

## Theme System

### Implementation

The theme system uses CSS custom properties (CSS variables) and HTML data attributes for theme switching:

```javascript
// Theme is stored in localStorage
localStorage.setItem('minecraft-console-theme', 'dark' | 'light');

// Applied via data attribute
<html data-theme="dark">
```

### Dark Theme (Default)

The dark theme maintains the Minecraft aesthetic with:
- Dark backgrounds (#1a1a1a, #2d2d2d, #3a3a3a)
- Light text (#ffffff, #b0b0b0)
- Minecraft-inspired accent colors
- Pixelated textures and blocky design elements

**Accessibility Considerations:**
- All text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- Focus indicators use high-contrast colors (#4dd0e1)
- Status indicators include both color and iconography

### Light Theme

The light theme provides an accessible alternative with:
- Light backgrounds (#f5f5f5, #ffffff, #e8e8e8)
- Dark text (#1a1a1a, #4a4a4a)
- Adjusted accent colors for readability
- Maintains Minecraft aesthetic with lighter palette

**Accessibility Considerations:**
- Exceeds WCAG AA contrast requirements
- Primary actions use #1976d2 (4.57:1 contrast on white)
- Success states use #2e7d32 (4.54:1 contrast)
- Error states use #c62828 (5.47:1 contrast)

### Theme Toggle

Users can switch themes via the theme toggle button in the header:

```html
<button id="themeToggle" aria-label="Toggle theme">
    <span class="theme-icon">☀️</span>
    <span class="theme-text">Light Mode</span>
</button>
```

The toggle:
- Persists preference to localStorage
- Updates all pages consistently
- Respects system preferences if no manual selection
- Provides visual and ARIA feedback

### Customizing Themes

To customize theme colors, edit the CSS custom properties:

**Dark Theme** (`css/style.css`):
```css
:root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --accent-primary: #4a9eff;
    /* ... */
}
```

**Light Theme** (`css/theme-light.css`):
```css
[data-theme="light"] {
    --bg-primary: #f5f5f5;
    --bg-secondary: #ffffff;
    --text-primary: #1a1a1a;
    --accent-primary: #1976d2;
    /* ... */
}
```

### Adding a New Theme

To add a custom theme (e.g., "high-contrast"):

1. Create `css/theme-high-contrast.css`:
```css
[data-theme="high-contrast"] {
    --bg-primary: #000000;
    --bg-secondary: #000000;
    --text-primary: #ffffff;
    --accent-primary: #ffff00;
    --border-color: #ffffff;
}
```

2. Update `themeManager.js`:
```javascript
this.themes = {
    dark: 'dark',
    light: 'light',
    highContrast: 'high-contrast'
};
```

3. Add theme selection UI as needed

## Accessibility

### WCAG Compliance

The console meets **WCAG 2.1 Level AA** standards:

#### Perceivable
- ✅ Text contrast ratios meet AA standards (4.5:1 minimum)
- ✅ Color is not the only means of conveying information
- ✅ Content is structured with semantic HTML
- ✅ Images have alt text (where applicable)

#### Operable
- ✅ All functionality available via keyboard
- ✅ Keyboard focus is visible (3px outline)
- ✅ No keyboard traps
- ✅ Skip navigation link for keyboard users
- ✅ Minimum touch target size of 44×44px (48×48px on mobile)

#### Understandable
- ✅ Page language specified (`<html lang="en">`)
- ✅ Navigation is consistent across pages
- ✅ Error messages are clear and descriptive
- ✅ Labels and instructions provided for inputs

#### Robust
- ✅ Valid HTML5 markup
- ✅ ARIA roles and properties used correctly
- ✅ Compatible with assistive technologies

### Keyboard Navigation

#### Global Shortcuts
- **Tab/Shift+Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and dialogs
- **Arrow Keys**: Navigate within lists and grids

#### Skip Navigation
Press **Tab** on any page to reveal the "Skip to main content" link, allowing keyboard users to bypass navigation.

#### Focus Management
- Focus is trapped within modals when open
- Focus returns to trigger element when modal closes
- Focus indicators are always visible for keyboard users
- Custom focus styles prevent loss of context

### Screen Reader Support

#### ARIA Landmarks
```html
<nav role="navigation" aria-label="Main navigation">
<main role="main" id="main-content">
<aside role="complementary">
```

#### Live Regions
Dynamic content updates are announced:
```html
<div role="status" aria-live="polite">
<div role="alert" aria-live="assertive">
```

#### Form Labels
All inputs have associated labels:
```html
<label for="username">Username</label>
<input id="username" type="text" aria-label="Username">
```

#### Button Labels
All buttons have descriptive labels:
```html
<button aria-label="Start server">▶️</button>
<button aria-label="Switch to light mode">☀️</button>
```

### Testing Accessibility

#### Automated Testing
Use browser extensions:
- **axe DevTools**: Comprehensive accessibility testing
- **WAVE**: Visual feedback for accessibility issues
- **Lighthouse**: Chrome DevTools audit

#### Manual Testing
1. **Keyboard Navigation**:
   - Unplug mouse and navigate entire application
   - Verify all interactive elements are reachable
   - Check focus is always visible

2. **Screen Reader**:
   - Test with NVDA (Windows), JAWS (Windows), or VoiceOver (Mac)
   - Verify all content is announced correctly
   - Check form labels and error messages

3. **Color Contrast**:
   - Use Chrome DevTools or WebAIM Contrast Checker
   - Verify all text meets minimum ratios
   - Test both light and dark themes

4. **Responsive Design**:
   - Test on mobile devices
   - Verify touch targets are adequately sized
   - Check zoom up to 200%

### Accessibility Checklist

When adding new features:

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible and high contrast
- [ ] ARIA labels and roles added where needed
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Touch targets minimum 44×44px
- [ ] Error messages clear and associated with inputs
- [ ] Dynamic content updates announced to screen readers
- [ ] Heading hierarchy is logical (h1 → h2 → h3)
- [ ] Forms have proper labels and fieldsets
- [ ] Modal focus is trapped and returns on close
- [ ] Tested with keyboard only
- [ ] Tested with screen reader
- [ ] Tested at 200% zoom

## Component Development

### Creating a New Component

Components follow this pattern:

```javascript
/**
 * Component description
 * @module ComponentName
 */

class ComponentName {
    constructor(options = {}) {
        this.options = {
            // Defaults
            enabled: true,
            ...options
        };
        
        this.state = {};
        this.init();
    }

    /**
     * Initialize component
     */
    init() {
        this.setupEventListeners();
        this.render();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Event delegation preferred
        document.addEventListener('click', (e) => {
            if (e.target.matches('.component-trigger')) {
                this.handleTrigger(e);
            }
        });
    }

    /**
     * Render component
     */
    render() {
        // Update DOM
    }

    /**
     * Handle specific event
     */
    handleTrigger(event) {
        // Emit custom event for other components
        window.dispatchEvent(new CustomEvent('componentevent', {
            detail: { data: 'value' }
        }));
    }

    /**
     * Cleanup component
     */
    destroy() {
        // Remove event listeners
        // Clear state
    }
}

// Auto-initialize on DOM ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.componentName = new ComponentName();
        });
    } else {
        window.componentName = new ComponentName();
    }
}
```

### Component Communication

Components communicate via:

1. **Custom Events**:
```javascript
// Emitter
window.dispatchEvent(new CustomEvent('themechange', { 
    detail: { theme: 'dark' } 
}));

// Listener
window.addEventListener('themechange', (e) => {
    console.log('Theme changed to:', e.detail.theme);
});
```

2. **Shared State**:
```javascript
// Via window object (use sparingly)
window.currentUser = { username: 'admin', role: 'owner' };

// Via localStorage for persistence
localStorage.setItem('key', JSON.stringify(data));
```

3. **Direct Method Calls**:
```javascript
// Access other components directly
if (window.themeManager) {
    const theme = window.themeManager.getCurrentTheme();
}
```

### Example: Adding a Settings Panel

```javascript
/**
 * Settings Panel Component
 */
class SettingsPanel {
    constructor() {
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.createPanel();
        this.setupEventListeners();
        this.applySettings();
    }

    loadSettings() {
        const defaults = {
            autoScroll: true,
            soundAlerts: false,
            colorCoded: true
        };
        
        const saved = localStorage.getItem('console-settings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.className = 'settings-panel';
        panel.innerHTML = `
            <h3>Settings</h3>
            <label>
                <input type="checkbox" id="autoScrollSetting" ${this.settings.autoScroll ? 'checked' : ''}>
                Auto-scroll logs
            </label>
            <label>
                <input type="checkbox" id="soundAlertsSetting" ${this.settings.soundAlerts ? 'checked' : ''}>
                Sound alerts
            </label>
        `;
        
        document.querySelector('.settings-container').appendChild(panel);
    }

    setupEventListeners() {
        document.querySelectorAll('.settings-panel input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const setting = e.target.id.replace('Setting', '');
                this.updateSetting(setting, e.target.checked);
            });
        });
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('console-settings', JSON.stringify(this.settings));
        this.applySettings();
        
        // Notify other components
        window.dispatchEvent(new CustomEvent('settingschange', {
            detail: { [key]: value }
        }));
    }

    applySettings() {
        // Apply settings to application
        if (this.settings.autoScroll) {
            // Enable auto-scroll
        }
    }
}

window.settingsPanel = new SettingsPanel();
```

## Development Workflow

### Dev Server Setup

The console runs on the Express backend with hot-reload via nodemon:

```bash
cd console/backend
npm run dev
```

Access the console at `http://localhost:3000/console/`

### Making Changes

1. **CSS Changes**: Edit CSS files directly; refresh browser to see changes
2. **JS Changes**: Edit JS files; refresh browser (hard refresh if needed: Ctrl+Shift+R)
3. **HTML Changes**: Edit template files; refresh browser

### Testing Locally

```bash
# Start backend with dev server
cd console/backend
npm run dev

# In browser, navigate to:
http://localhost:3000/console/

# Test different pages:
http://localhost:3000/console/login.html
http://localhost:3000/console/plugins-v2.html
http://localhost:3000/console/user-management.html
```

### Browser DevTools

Use browser developer tools effectively:

1. **Console**: Check for JavaScript errors
2. **Network**: Monitor API calls and WebSocket
3. **Elements**: Inspect DOM and CSS
4. **Application**: Check localStorage and cookies
5. **Lighthouse**: Run accessibility audits

## Best Practices

### Code Style

- Use ES6+ features (const/let, arrow functions, template literals)
- Document functions with JSDoc comments
- Use meaningful variable and function names
- Keep functions small and focused
- Avoid global pollution; use IIFE or modules

### Performance

- Use event delegation for dynamic content
- Debounce/throttle frequent events (scroll, resize, input)
- Minimize DOM manipulation; batch updates
- Use CSS animations over JavaScript
- Lazy load non-critical resources

### Accessibility

- Always provide text alternatives for icons
- Use semantic HTML (nav, main, article, etc.)
- Include ARIA labels for screen readers
- Test keyboard navigation for new features
- Ensure color contrast meets standards

### Security

- Sanitize user input before rendering
- Use CSP-compliant code (no inline scripts/styles)
- Validate form inputs client and server-side
- Don't expose sensitive data in client code
- Use CSRF tokens for state-changing requests

## Troubleshooting

### Theme Not Applying

**Issue**: Theme doesn't change or reverts to dark

**Solution**:
1. Check browser console for JavaScript errors
2. Verify `themeManager.js` is loaded before other scripts
3. Clear localStorage: `localStorage.removeItem('minecraft-console-theme')`
4. Hard refresh browser (Ctrl+Shift+R)

### Accessibility Features Not Working

**Issue**: Skip navigation or keyboard shortcuts don't work

**Solution**:
1. Verify `accessibility.js` is loaded
2. Check browser console for errors
3. Ensure DOM is fully loaded before initialization
4. Test in different browsers

### WebSocket Connection Issues

**Issue**: Real-time updates not working

**Solution**:
1. Check backend is running
2. Verify WebSocket connection in Network tab
3. Check CORS and proxy configuration
4. Review browser console for connection errors

## Resources

### Learning Resources

- [MDN Web Docs](https://developer.mozilla.org/): HTML, CSS, JavaScript reference
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/): Accessibility standards
- [WebAIM](https://webaim.org/): Accessibility resources and tools
- [A11y Project](https://www.a11yproject.com/): Accessibility checklist and patterns

### Tools

- **Chrome DevTools**: Debugging and performance
- **axe DevTools**: Accessibility testing
- **WAVE**: Visual accessibility evaluation
- **Contrast Checker**: Color contrast verification
- **NVDA/JAWS/VoiceOver**: Screen reader testing

### Related Documentation

- [Console Setup Guide](./admin/console-setup.md)
- [API Documentation](./API.md)
- [User Management Guide](./user-management.md)
- [Plugin Manager V2](development/plugin-manager-api.md)

## Changelog

### v1.0.0 - Frontend Modernization (2024)

**Added**:
- Modular JavaScript architecture with component classes
- Dark/light theme switching with localStorage persistence
- Comprehensive accessibility enhancements (WCAG AA compliant)
- Skip navigation for keyboard users
- Enhanced focus indicators and keyboard navigation
- ARIA labels and live regions for screen readers
- Responsive theme toggle button
- Complete documentation for development and customization

**Improved**:
- Color contrast for better readability
- Touch target sizes for mobile accessibility
- Heading hierarchy and semantic structure
- Form label associations
- Modal focus management

**Maintained**:
- Existing functionality and API compatibility
- Vanilla JavaScript approach (no framework dependencies)
- Minecraft-inspired aesthetic
- Express/Socket.io backend integration

---

## Contributing

When contributing to the frontend:

1. Follow the modular component pattern
2. Add JSDoc comments to functions
3. Test accessibility with keyboard and screen reader
4. Verify color contrast meets WCAG AA
5. Test in both light and dark themes
6. Update this documentation for significant changes
7. Test on multiple browsers and devices

## Support

For questions or issues:

1. Check this documentation first
2. Review existing code examples
3. Test in browser DevTools
4. Check browser console for errors
5. Consult related documentation
6. Open an issue with reproduction steps

---

**Document Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: Festas Builds Team
