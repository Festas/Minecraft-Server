/**
 * Simple i18n (Internationalization) Module
 * 
 * Provides basic translation functionality for the Minecraft Server Console.
 * 
 * Usage:
 *   import { i18n, setLocale } from './i18n.js';
 *   
 *   // Get a translation
 *   const text = i18n.t('common.loading');
 *   
 *   // Change language
 *   await setLocale('es');
 */

class I18n {
    constructor() {
        this.locale = 'en';
        this.translations = {};
        this.fallbackLocale = 'en';
        this.availableLocales = ['en', 'es'];
    }

    /**
     * Load translations for a specific locale
     * @param {string} locale - Locale code (e.g., 'en', 'es')
     */
    async loadLocale(locale) {
        try {
            const response = await fetch(`/console/locales/${locale}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load locale: ${locale}`);
            }
            this.translations[locale] = await response.json();
            return true;
        } catch (error) {
            console.error(`Error loading locale ${locale}:`, error);
            return false;
        }
    }

    /**
     * Set the current locale
     * @param {string} locale - Locale code
     */
    async setLocale(locale) {
        if (!this.availableLocales.includes(locale)) {
            console.warn(`Locale ${locale} not available, using fallback`);
            locale = this.fallbackLocale;
        }

        // Load locale if not already loaded
        if (!this.translations[locale]) {
            const loaded = await this.loadLocale(locale);
            if (!loaded && locale !== this.fallbackLocale) {
                // Fall back to default
                await this.loadLocale(this.fallbackLocale);
                locale = this.fallbackLocale;
            }
        }

        this.locale = locale;
        
        // Update HTML lang attribute
        document.documentElement.lang = locale;
        
        // Store preference
        localStorage.setItem('locale', locale);
        
        // Emit event for other components to update
        window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale } }));
    }

    /**
     * Get a translation by key path
     * @param {string} keyPath - Dot-notation path to translation (e.g., 'common.loading')
     * @param {object} params - Optional parameters for interpolation
     * @returns {string} Translated text or key if not found
     */
    t(keyPath, params = {}) {
        const keys = keyPath.split('.');
        let translation = this.translations[this.locale];
        
        // Traverse the translation object
        for (const key of keys) {
            if (translation && typeof translation === 'object') {
                translation = translation[key];
            } else {
                translation = undefined;
                break;
            }
        }

        // Fallback to default locale if not found
        if (!translation && this.locale !== this.fallbackLocale) {
            let fallback = this.translations[this.fallbackLocale];
            for (const key of keys) {
                if (fallback && typeof fallback === 'object') {
                    fallback = fallback[key];
                } else {
                    fallback = undefined;
                    break;
                }
            }
            translation = fallback;
        }

        // If still not found, return the key path
        if (!translation) {
            console.warn(`Translation not found: ${keyPath}`);
            return keyPath;
        }

        // Interpolate parameters
        return this.interpolate(translation, params);
    }

    /**
     * Interpolate parameters into a translation string
     * @param {string} text - Translation text with {{param}} placeholders
     * @param {object} params - Parameters to interpolate
     * @returns {string} Interpolated text
     */
    interpolate(text, params) {
        if (typeof text !== 'string') return text;
        
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Get the current locale
     * @returns {string} Current locale code
     */
    getLocale() {
        return this.locale;
    }

    /**
     * Get list of available locales
     * @returns {array} Available locale codes
     */
    getAvailableLocales() {
        return this.availableLocales;
    }

    /**
     * Detect browser language preference
     * @returns {string} Detected locale code
     */
    detectLocale() {
        // Check localStorage first
        const stored = localStorage.getItem('locale');
        if (stored && this.availableLocales.includes(stored)) {
            return stored;
        }

        // Check browser language
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0]; // Get base language (e.g., 'en' from 'en-US')
        
        if (this.availableLocales.includes(langCode)) {
            return langCode;
        }

        return this.fallbackLocale;
    }
}

// Create singleton instance
const i18n = new I18n();

/**
 * Initialize i18n with detected or default locale
 */
async function initI18n() {
    const locale = i18n.detectLocale();
    await i18n.setLocale(locale);
    return i18n;
}

/**
 * Set locale (convenience function)
 * @param {string} locale - Locale code
 */
async function setLocale(locale) {
    await i18n.setLocale(locale);
}

/**
 * Get translation (convenience function)
 * @param {string} keyPath - Translation key path
 * @param {object} params - Interpolation parameters
 * @returns {string} Translated text
 */
function t(keyPath, params) {
    return i18n.t(keyPath, params);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18n, initI18n, setLocale, t };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.i18n = i18n;
    window.initI18n = initI18n;
    window.setLocale = setLocale;
    window.t = t;
}
