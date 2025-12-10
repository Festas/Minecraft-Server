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
      container.classList.add('stagger-children');
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
