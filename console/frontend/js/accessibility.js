/**
 * Accessibility Module
 * Enhances keyboard navigation, ARIA support, and screen reader compatibility
 */

class AccessibilityManager {
    constructor() {
        this.focusTrapStack = [];
        this.init();
    }

    /**
     * Initialize accessibility features
     */
    init() {
        this.addSkipNavigation();
        this.enhanceKeyboardNavigation();
        this.addARIALabels();
        this.setupFocusManagement();
        this.announcePageChanges();
    }

    /**
     * Add skip navigation link for screen readers and keyboard users
     */
    addSkipNavigation() {
        // Check if skip link already exists
        if (document.querySelector('.skip-navigation')) {
            return;
        }

        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-navigation';
        skipLink.textContent = 'Skip to main content';
        skipLink.setAttribute('aria-label', 'Skip to main content');
        
        // Insert at the very beginning of body
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add click handler to focus main content
        skipLink.addEventListener('click', (e) => {
            e.preventDefault();
            const mainContent = document.querySelector('.main-content') || 
                               document.querySelector('main') ||
                               document.getElementById('main-content');
            if (mainContent) {
                mainContent.setAttribute('tabindex', '-1');
                mainContent.focus();
                mainContent.removeAttribute('tabindex');
            }
        });
    }

    /**
     * Enhance keyboard navigation throughout the application
     */
    enhanceKeyboardNavigation() {
        // Add keyboard support for custom interactive elements
        document.addEventListener('keydown', (e) => {
            // ESC to close modals
            if (e.key === 'Escape') {
                this.closeTopModal();
            }

            // Arrow keys for navigation in lists
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleArrowKeyNavigation(e);
            }
        });

        // Trap focus in modals
        document.addEventListener('focusin', (e) => {
            if (this.focusTrapStack.length > 0) {
                const currentTrap = this.focusTrapStack[this.focusTrapStack.length - 1];
                if (!currentTrap.contains(e.target)) {
                    e.preventDefault();
                    const focusable = this.getFocusableElements(currentTrap);
                    if (focusable.length > 0) {
                        focusable[0].focus();
                    }
                }
            }
        });
    }

    /**
     * Handle arrow key navigation in lists and grids
     */
    handleArrowKeyNavigation(e) {
        const target = e.target;
        
        // Navigation items in sidebar
        if (target.classList.contains('nav-item')) {
            const navItems = Array.from(document.querySelectorAll('.nav-item'));
            const currentIndex = navItems.indexOf(target);
            
            if (e.key === 'ArrowUp' && currentIndex > 0) {
                e.preventDefault();
                navItems[currentIndex - 1].focus();
            } else if (e.key === 'ArrowDown' && currentIndex < navItems.length - 1) {
                e.preventDefault();
                navItems[currentIndex + 1].focus();
            }
        }

        // Button grids (quick commands, etc.)
        if (target.closest('.quick-commands') || target.closest('.action-buttons')) {
            const container = target.closest('.quick-commands') || target.closest('.action-buttons');
            const buttons = Array.from(container.querySelectorAll('button'));
            const currentIndex = buttons.indexOf(target);
            const columns = this.getGridColumns(container);
            
            let nextIndex = currentIndex;
            
            if (e.key === 'ArrowRight' && currentIndex < buttons.length - 1) {
                nextIndex = currentIndex + 1;
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                nextIndex = currentIndex - 1;
            } else if (e.key === 'ArrowDown' && currentIndex + columns < buttons.length) {
                nextIndex = currentIndex + columns;
            } else if (e.key === 'ArrowUp' && currentIndex - columns >= 0) {
                nextIndex = currentIndex - columns;
            }
            
            if (nextIndex !== currentIndex) {
                e.preventDefault();
                buttons[nextIndex].focus();
            }
        }
    }

    /**
     * Get number of columns in a grid layout
     */
    getGridColumns(element) {
        const style = window.getComputedStyle(element);
        const templateColumns = style.getPropertyValue('grid-template-columns');
        if (templateColumns && templateColumns !== 'none') {
            return templateColumns.split(' ').length;
        }
        return 3; // Default fallback
    }

    /**
     * Add or enhance ARIA labels throughout the application
     */
    addARIALabels() {
        // Mark main content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !mainContent.hasAttribute('role')) {
            mainContent.setAttribute('role', 'main');
            mainContent.id = 'main-content';
        }

        // Mark navigation
        const sidebar = document.querySelector('.sidebar nav');
        if (sidebar && !sidebar.hasAttribute('role')) {
            sidebar.setAttribute('role', 'navigation');
            sidebar.setAttribute('aria-label', 'Main navigation');
        }

        // Mark sections
        document.querySelectorAll('.content-section').forEach(section => {
            if (!section.hasAttribute('role')) {
                section.setAttribute('role', 'region');
                const heading = section.querySelector('h3');
                if (heading && !section.hasAttribute('aria-label')) {
                    section.setAttribute('aria-labelledby', heading.id || this.generateId(heading));
                }
            }
        });

        // Enhance buttons without aria-label
        document.querySelectorAll('button').forEach(button => {
            if (!button.hasAttribute('aria-label') && !button.textContent.trim()) {
                const icon = button.textContent.trim();
                if (icon) {
                    button.setAttribute('aria-label', this.getButtonLabel(button));
                }
            }
        });

        // Mark status indicators
        document.querySelectorAll('.status-indicator').forEach(indicator => {
            if (!indicator.hasAttribute('role')) {
                indicator.setAttribute('role', 'status');
                indicator.setAttribute('aria-live', 'polite');
            }
        });

        // Mark alerts and warnings
        document.querySelectorAll('.warning-banner, .error-message').forEach(alert => {
            if (!alert.hasAttribute('role')) {
                alert.setAttribute('role', 'alert');
                alert.setAttribute('aria-live', 'assertive');
            }
        });

        // Enhance form inputs
        document.querySelectorAll('input, select, textarea').forEach(input => {
            if (!input.hasAttribute('aria-label') && !input.id) {
                const label = this.findLabelForInput(input);
                if (label && !input.hasAttribute('aria-labelledby')) {
                    input.setAttribute('aria-label', label);
                }
            }
        });
    }

    /**
     * Generate unique ID for element
     */
    generateId(element) {
        const id = 'a11y-' + Math.random().toString(36).substr(2, 9);
        element.id = id;
        return id;
    }

    /**
     * Get descriptive label for button
     */
    getButtonLabel(button) {
        const classList = Array.from(button.classList);
        const dataAttrs = button.dataset;
        
        // Try to infer from context
        if (dataAttrs.command) {
            return `Execute command: ${dataAttrs.command}`;
        }
        
        if (dataAttrs.section) {
            return `Navigate to ${dataAttrs.section}`;
        }
        
        const id = button.id;
        if (id) {
            // Convert camelCase to readable text
            return id.replace(/([A-Z])/g, ' $1')
                     .replace(/Btn$/, '')
                     .trim();
        }
        
        return 'Button';
    }

    /**
     * Find label text for input element
     */
    findLabelForInput(input) {
        // Check for associated label
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label.textContent.trim();
        }
        
        // Check for parent label
        const parentLabel = input.closest('label');
        if (parentLabel) return parentLabel.textContent.trim();
        
        // Check for placeholder
        if (input.placeholder) return input.placeholder;
        
        return null;
    }

    /**
     * Setup focus management for modals and dynamic content
     */
    setupFocusManagement() {
        // Observe modal creation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if it's a modal
                        if (node.classList && node.classList.contains('modal') && 
                            !node.classList.contains('hidden')) {
                            this.trapFocus(node);
                        }
                        
                        // Check for modals within added node
                        const modals = node.querySelectorAll && 
                                      node.querySelectorAll('.modal:not(.hidden)');
                        if (modals) {
                            modals.forEach(modal => this.trapFocus(modal));
                        }
                    }
                });
                
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList && 
                        node.classList.contains('modal')) {
                        this.removeFocusTrap(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Trap focus within element (for modals)
     */
    trapFocus(element) {
        if (!this.focusTrapStack.includes(element)) {
            this.focusTrapStack.push(element);
            
            // Focus first focusable element
            const focusable = this.getFocusableElements(element);
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        }
    }

    /**
     * Remove focus trap
     */
    removeFocusTrap(element) {
        const index = this.focusTrapStack.indexOf(element);
        if (index > -1) {
            this.focusTrapStack.splice(index, 1);
        }
    }

    /**
     * Get all focusable elements within container
     */
    getFocusableElements(container) {
        const selectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ];
        
        return Array.from(container.querySelectorAll(selectors.join(', ')))
            .filter(el => {
                return el.offsetParent !== null && // visible
                       !el.hasAttribute('hidden') &&
                       !el.closest('.hidden');
            });
    }

    /**
     * Close topmost modal
     */
    closeTopModal() {
        const modals = document.querySelectorAll('.modal:not(.hidden)');
        if (modals.length > 0) {
            const topModal = modals[modals.length - 1];
            
            // Try to find and click close button
            const closeBtn = topModal.querySelector('#confirmNo, .modal-close, [data-close]');
            if (closeBtn) {
                closeBtn.click();
            } else {
                // Otherwise just hide it
                topModal.classList.add('hidden');
            }
            
            this.removeFocusTrap(topModal);
        }
    }

    /**
     * Announce page/section changes to screen readers
     */
    announcePageChanges() {
        // Create live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'announcements';
        document.body.appendChild(liveRegion);

        // Listen for section changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('content-section') && 
                        target.classList.contains('active')) {
                        const heading = target.querySelector('h3');
                        if (heading) {
                            this.announce(`Navigated to ${heading.textContent}`);
                        }
                    }
                }
            });
        });

        document.querySelectorAll('.content-section').forEach(section => {
            observer.observe(section, { attributes: true });
        });
    }

    /**
     * Announce message to screen readers
     */
    announce(message) {
        const liveRegion = document.getElementById('announcements');
        if (liveRegion) {
            liveRegion.textContent = message;
            
            // Clear after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }
}

// Initialize accessibility manager when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.accessibilityManager = new AccessibilityManager();
        });
    } else {
        window.accessibilityManager = new AccessibilityManager();
    }
}
