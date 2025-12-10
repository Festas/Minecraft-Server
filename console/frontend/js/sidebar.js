/**
 * SIDEBAR NAVIGATION - Mobile-First Responsive Behavior
 * 
 * Features:
 * - Toggle sidebar on mobile with hamburger button
 * - Close on overlay click, escape key, or nav item click
 * - Highlight active page based on current URL
 * - Auto-close when resizing from mobile to desktop
 */

(function() {
  'use strict';

  // State
  let isMobile = window.innerWidth < 1024;
  let sidebarOpen = false;

  // DOM Elements
  const body = document.body;
  const hamburger = document.querySelector('.hamburger-button');
  const overlay = document.querySelector('.sidebar-overlay');
  const sidebar = document.querySelector('.sidebar');
  const navItems = document.querySelectorAll('.nav-item');

  /**
   * Initialize sidebar functionality
   */
  function init() {
    // Set initial state
    updateMobileState();
    highlightActivePage();

    // Event listeners
    if (hamburger) {
      hamburger.addEventListener('click', toggleSidebar);
    }

    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close on escape key
    document.addEventListener('keydown', handleEscapeKey);

    // Close sidebar when nav item is clicked (mobile only)
    navItems.forEach(item => {
      item.addEventListener('click', handleNavItemClick);
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    });
  }

  /**
   * Toggle sidebar open/closed
   */
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    updateSidebarState();
  }

  /**
   * Close sidebar
   */
  function closeSidebar() {
    if (sidebarOpen) {
      sidebarOpen = false;
      updateSidebarState();
    }
  }

  /**
   * Update sidebar state in DOM
   */
  function updateSidebarState() {
    if (sidebarOpen) {
      body.classList.add('sidebar-open');
      // Prevent body scroll when sidebar is open on mobile
      if (isMobile) {
        body.style.overflow = 'hidden';
      }
    } else {
      body.classList.remove('sidebar-open');
      body.style.overflow = '';
    }
  }

  /**
   * Handle escape key press
   */
  function handleEscapeKey(e) {
    if (e.key === 'Escape' && sidebarOpen && isMobile) {
      closeSidebar();
    }
  }

  /**
   * Handle navigation item click
   */
  function handleNavItemClick(e) {
    // Close sidebar on mobile when nav item is clicked
    if (isMobile && sidebarOpen) {
      // Small delay to allow navigation to feel responsive
      setTimeout(closeSidebar, 100);
    }

    // Handle navigation for items with data-href
    const href = e.currentTarget.getAttribute('data-href');
    if (href) {
      e.preventDefault();
      window.location.href = href;
    }
  }

  /**
   * Update mobile state based on window width
   */
  function updateMobileState() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < 1024;

    // If transitioning from mobile to desktop, close sidebar
    if (wasMobile && !isMobile && sidebarOpen) {
      closeSidebar();
    }
  }

  /**
   * Handle window resize
   */
  function handleResize() {
    updateMobileState();
  }

  /**
   * Highlight active page based on current URL
   */
  function highlightActivePage() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';

    navItems.forEach(item => {
      // Remove active class from all items first
      item.classList.remove('active');

      // Check if this nav item corresponds to the current page
      const href = item.getAttribute('data-href');
      if (href) {
        const hrefPage = href.split('/').pop() || 'index.html';
        if (hrefPage === currentPage || 
            (currentPage === '' && hrefPage === 'index.html') ||
            (currentPage === '/' && hrefPage === 'index.html')) {
          item.classList.add('active');
        }
      }

      // Also check for section-based navigation (for index.html)
      const section = item.getAttribute('data-section');
      if (section && (currentPage === 'index.html' || currentPage === '')) {
        // This is handled by the page's own navigation logic
        // We just need to highlight the dashboard if on index
        if (section === 'dashboard' && (currentPage === 'index.html' || currentPage === '')) {
          item.classList.add('active');
        }
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for potential external use
  window.SidebarNav = {
    open: () => {
      sidebarOpen = true;
      updateSidebarState();
    },
    close: closeSidebar,
    toggle: toggleSidebar,
    refresh: highlightActivePage
  };

})();
