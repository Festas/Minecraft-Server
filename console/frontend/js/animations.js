// Animations utility
(function() {
  'use strict';
  
  // Add animation class and remove after completion
  function animateElement(element, animationClass, duration = 300) {
    element.classList.add(animationClass);
    setTimeout(() => {
      element.classList.remove(animationClass);
    }, duration);
  }
  
  // Intersection Observer for scroll-triggered animations
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fadeInUp');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  }
  
  // Initialize staggered animations for grids
  function initStaggerAnimations() {
    document.querySelectorAll('.stagger-on-load').forEach(container => {
      // Only add stagger-children if not already present and container has children
      if (!container.classList.contains('stagger-children') && container.children.length > 0) {
        container.classList.add('stagger-children');
        
        // Fallback: ensure elements become visible after animation completes
        setTimeout(() => {
          container.classList.add('loaded');
          // Also directly set opacity on children as ultimate fallback
          Array.from(container.children).forEach(child => {
            child.style.opacity = '1';
          });
        }, 500); // 500ms should be enough for all staggered animations
      }
    });
  }
  
  // Shake animation for form errors
  window.shakeElement = function(element) {
    animateElement(element, 'animate-shake', 500);
  };
  
  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initStaggerAnimations();
  });
})();
