/**
 * Theme Manager Module
 * Handles dark/light theme switching with localStorage persistence
 * Ensures WCAG AA color contrast compliance
 */

class ThemeManager {
    constructor() {
        this.THEME_KEY = 'minecraft-console-theme';
        this.themes = {
            dark: 'dark',
            light: 'light'
        };
        
        // Initialize theme on load
        this.init();
    }

    /**
     * Initialize theme manager
     */
    init() {
        // Get saved theme or default to dark
        const savedTheme = this.getSavedTheme();
        this.applyTheme(savedTheme);
        
        // Listen for theme toggle events
        this.setupEventListeners();
    }

    /**
     * Get saved theme from localStorage
     * @returns {string} Theme name ('dark' or 'light')
     */
    getSavedTheme() {
        const saved = localStorage.getItem(this.THEME_KEY);
        return saved && this.themes[saved] ? saved : this.themes.dark;
    }

    /**
     * Save theme preference to localStorage
     * @param {string} theme - Theme name to save
     */
    saveTheme(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
    }

    /**
     * Apply theme to document
     * @param {string} theme - Theme name to apply
     */
    applyTheme(theme) {
        // Update data attribute for CSS targeting
        document.documentElement.setAttribute('data-theme', theme);
        
        // Save preference
        this.saveTheme(theme);
        
        // Update toggle button state if exists
        this.updateToggleButton(theme);
        
        // Dispatch theme change event for other components
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { theme } 
        }));
    }

    /**
     * Toggle between dark and light themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || this.themes.dark;
        const newTheme = currentTheme === this.themes.dark ? this.themes.light : this.themes.dark;
        this.applyTheme(newTheme);
    }

    /**
     * Update theme toggle button appearance
     * @param {string} theme - Current theme
     */
    updateToggleButton(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('.theme-icon');
            const text = toggleBtn.querySelector('.theme-text');
            
            if (icon) {
                icon.textContent = theme === this.themes.dark ? '☀️' : '🌙';
            }
            
            if (text) {
                text.textContent = theme === this.themes.dark ? 'Light Mode' : 'Dark Mode';
            }
            
            // Update ARIA label for accessibility
            toggleBtn.setAttribute('aria-label', 
                theme === this.themes.dark 
                    ? 'Switch to light mode' 
                    : 'Switch to dark mode'
            );
        }
    }

    /**
     * Setup event listeners for theme toggle
     */
    setupEventListeners() {
        // Theme toggle button
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTheme());
            
            // Keyboard support
            toggleBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });
        }

        // Listen for system theme preference changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem(this.THEME_KEY)) {
                    this.applyTheme(e.matches ? this.themes.dark : this.themes.light);
                }
            });
        }
    }

    /**
     * Get current theme
     * @returns {string} Current theme name
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || this.themes.dark;
    }
}

// Initialize theme manager when DOM is ready
if (typeof window !== 'undefined') {
    window.themeManager = new ThemeManager();
}
