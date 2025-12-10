# Localization (i18n) Guide

This guide explains how to use and contribute to the internationalization (i18n) system in the Minecraft Server Console.

## Overview

The console uses a simple JSON-based translation system that supports multiple languages. Currently supported languages:

- **English (en)** - Default
- **Spanish (es)**

## For Users

### Changing Language

The console automatically detects your browser language. To manually change the language:

1. **Via Browser Console** (temporary):
   ```javascript
   setLocale('es'); // Switch to Spanish
   setLocale('en'); // Switch to English
   ```

2. **Via localStorage** (persistent):
   ```javascript
   localStorage.setItem('locale', 'es');
   location.reload();
   ```

### Future: Language Selector UI

A language selector will be added to the console header in a future update.

## For Developers

### Using Translations in JavaScript

```javascript
// Load the i18n module
<script src="js/i18n.js"></script>

// Initialize (call once on page load)
await initI18n();

// Use translations
const text = t('common.loading'); // Returns "Loading..." (or translated equivalent)
const error = t('errors.networkError'); // Returns error message in current language

// With parameters (interpolation)
const message = t('players.kickSuccess', { player: 'Steve' });
// Future feature: will replace {{player}} in translation string
```

### Using Translations in HTML

```html
<!-- Add data-i18n attribute with translation key -->
<button data-i18n="common.save">Save</button>
<h1 data-i18n="dashboard.title">Server Dashboard</h1>

<!-- The i18n system will automatically replace text content -->
<!-- Add this script after content loads: -->
<script>
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
</script>
```

### Translation File Structure

Translation files are located in `/console/frontend/locales/` as JSON files.

Example structure:
```json
{
  "common": {
    "appName": "Minecraft Server Console",
    "loading": "Loading...",
    "error": "Error"
  },
  "auth": {
    "login": "Login",
    "username": "Username"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "console": "Console"
  }
}
```

Access translations using dot notation:
- `common.appName`
- `auth.login`
- `navigation.dashboard`

## Contributing Translations

### Adding a New Language

1. **Create Translation File**

   Copy `en.json` and create a new file for your language:
   ```bash
   cp console/frontend/locales/en.json console/frontend/locales/fr.json
   ```

2. **Translate Content**

   Edit the new file and translate all strings:
   ```json
   {
     "common": {
       "loading": "Chargement...",
       "error": "Erreur"
     }
   }
   ```

3. **Register Locale**

   Add your locale to `js/i18n.js`:
   ```javascript
   this.availableLocales = ['en', 'es', 'fr']; // Add 'fr'
   ```

4. **Test**

   ```javascript
   setLocale('fr');
   ```

### Translation Guidelines

1. **Keep Keys Consistent**
   - Don't change key names
   - Only translate the values
   - Maintain the same JSON structure

2. **Preserve Formatting**
   - Keep line breaks (`\n`) in the same places
   - Don't remove HTML entities
   - Preserve parameter placeholders (e.g., `{{player}}`)

3. **Context Matters**
   - "Save" could mean "Save File" or "Cost Savings" - check usage
   - Read surrounding translations for context
   - Test in the actual UI when possible

4. **Technical Terms**
   - Keep technical terms in English when appropriate:
     - "TPS", "RCON", "UUID", "API"
   - Translate user-facing terms:
     - "Server Status" → "Estado del Servidor" (ES)

5. **Character Sets**
   - UTF-8 encoding is supported
   - Use native characters (é, ñ, ü, etc.)

### Locale Codes

Use standard ISO 639-1 two-letter codes:
- `en` - English
- `es` - Spanish (Español)
- `fr` - French (Français)
- `de` - German (Deutsch)
- `pt` - Portuguese (Português)
- `it` - Italian (Italiano)
- `ja` - Japanese (日本語)
- `zh` - Chinese (中文)

### Testing Your Translation

1. **Manual Testing**
   ```bash
   cd console/frontend
   python3 -m http.server 8000
   # Open http://localhost:8000
   ```

2. **Check Coverage**
   - Visit all pages: Dashboard, Console, Players, Backups, etc.
   - Test all modals and dialogs
   - Check error messages
   - Verify button labels

3. **Validation**
   ```bash
   # Validate JSON syntax
   python3 -m json.tool locales/fr.json > /dev/null && echo "Valid JSON"
   
   # Check for missing keys (compared to English)
   # (Add comparison script here)
   ```

## Translation Priority

When translating, prioritize in this order:

1. **High Priority** (Most visible)
   - Navigation menu items
   - Page titles
   - Button labels
   - Error messages

2. **Medium Priority**
   - Form labels
   - Table headers
   - Status messages
   - Help text

3. **Low Priority** (Less common)
   - Advanced settings
   - Technical documentation
   - Debug messages

## Supported Languages Status

| Language | Code | Status | Completeness | Maintainer |
|----------|------|--------|--------------|------------|
| English | en | ✅ Complete | 100% | Core Team |
| Spanish | es | ✅ Complete | 100% | Community |
| French | fr | 🚧 Planned | 0% | Needed |
| German | de | 🚧 Planned | 0% | Needed |
| Portuguese | pt | 🚧 Planned | 0% | Needed |

Want to maintain a language? Open an issue or PR!

## API Reference

### i18n Object

```javascript
// Get current locale
i18n.getLocale(); // Returns 'en', 'es', etc.

// Get available locales
i18n.getAvailableLocales(); // Returns ['en', 'es']

// Set locale
await i18n.setLocale('es');

// Get translation
i18n.t('common.loading'); // Returns translated string

// With interpolation (future feature)
i18n.t('message.welcome', { name: 'Steve' });
// Would replace {{name}} in translation
```

### Events

```javascript
// Listen for locale changes
window.addEventListener('localeChanged', (event) => {
  console.log('New locale:', event.detail.locale);
  // Update your UI here
});
```

## Future Enhancements

Planned improvements to the i18n system:

- [ ] Language selector in console header
- [ ] RTL (right-to-left) language support
- [ ] Number and date formatting per locale
- [ ] Pluralization support
- [ ] Translation memory/glossary
- [ ] Automated translation validation
- [ ] Translation coverage reporting
- [ ] Backend API response translations

## Resources

- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
- [Unicode Character Table](https://unicode-table.com/)
- [i18n Best Practices](https://www.w3.org/International/questions/qa-i18n)

## Contributing

To contribute a translation:

1. Fork the repository
2. Create a new translation file
3. Translate all strings
4. Test thoroughly
5. Submit a Pull Request

Include in your PR:
- Translation file (`locales/[code].json`)
- Update to `i18n.js` (add locale to availableLocales)
- Update to this README (add to supported languages table)
- Screenshots showing the translation in action

## Support

For translation questions or issues:
- Open a GitHub issue with `i18n` label
- Tag translation maintainer for specific language
- Join our Discord for real-time help

---

**Thank you for helping make the Minecraft Server Console accessible to more people worldwide! 🌍**
