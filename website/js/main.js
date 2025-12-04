// Main JavaScript for festas_builds Minecraft Server Website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initThemeToggle();
    initAnimatedBackground();
    initCopyButton();
    initServerStatus();
    initSmoothScroll();
    initBlueMapButton();
    initDiscordLink();
    initFAQAccordion();
    initScrollAnimations();
});

/**
 * Theme toggle functionality with localStorage persistence
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    // Check for saved theme preference or default to 'dark'
    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Add a little animation
            themeToggle.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                themeToggle.style.transform = '';
            }, 300);
        });
    }
}

/**
 * Create animated background particles
 */
function initAnimatedBackground() {
    const animatedBg = document.getElementById('animatedBg');
    
    if (!animatedBg) return;
    
    // Create 20 floating particles
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random horizontal position
        particle.style.left = Math.random() * 100 + '%';
        
        // Random delay for staggered animation
        particle.style.animationDelay = Math.random() * 15 + 's';
        
        // Random duration for varied speed
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        
        animatedBg.appendChild(particle);
    }
}

/**
 * Copy server IP to clipboard functionality
 */
function initCopyButton() {
    const copyBtn = document.getElementById('copyBtn');
    const serverIp = document.getElementById('serverIp');
    
    if (copyBtn && serverIp) {
        copyBtn.addEventListener('click', async function() {
            const ipText = serverIp.textContent;
            
            try {
                // Modern Clipboard API
                await navigator.clipboard.writeText(ipText);
                showCopyFeedback(copyBtn, 'Copied!');
            } catch (err) {
                // Fallback for older browsers
                fallbackCopyToClipboard(ipText);
                showCopyFeedback(copyBtn, 'Copied!');
            }
        });
    }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
}

/**
 * Show feedback when IP is copied
 */
function showCopyFeedback(button, message) {
    const originalHTML = button.innerHTML;
    button.innerHTML = `<span style="font-size: 0.9rem;">${message}</span>`;
    button.style.background = '#5a9c3a';
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = '';
    }, 2000);
}

/**
 * Check server status using mcstatus.io API
 * Displays online/offline status, player count, and uptime
 */
function initServerStatus() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    const playerCount = document.getElementById('playerCount');
    const serverUptime = document.getElementById('serverUptime');
    
    if (statusIndicator && statusText) {
        checkServerStatus();
        
        // Update status every 60 seconds
        setInterval(checkServerStatus, 60000);
    }
}

/**
 * Fetch server status from mcstatus.io API
 */
async function checkServerStatus() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    const playerCount = document.getElementById('playerCount');
    const serverUptime = document.getElementById('serverUptime');
    
    const serverAddress = 'mc.festas-builds.com';
    
    try {
        // Using mcstatus.io API for server status
        const response = await fetch(`https://api.mcsrvstat.us/3/${serverAddress}`);
        const data = await response.json();
        
        if (data.online) {
            // Server is online
            statusIndicator.style.background = '#7cbd54'; // Green
            statusText.textContent = 'Server Online';
            
            // Update player count
            if (playerCount && data.players) {
                const online = data.players.online || 0;
                const max = data.players.max || 20;
                playerCount.textContent = `${online}/${max}`;
            }
            
            // Calculate and display uptime (if available in future)
            if (serverUptime) {
                // For now, show a placeholder
                // In production, you would track server start time
                serverUptime.textContent = 'Running';
            }
        } else {
            // Server is offline
            statusIndicator.style.background = '#ff4444'; // Red
            statusText.textContent = 'Server Offline';
            statusIndicator.style.animation = 'none';
            
            if (playerCount) {
                playerCount.textContent = '0/20';
            }
            
            if (serverUptime) {
                serverUptime.textContent = 'Offline';
            }
        }
    } catch (error) {
        console.error('Failed to fetch server status:', error);
        
        // Fallback to unknown status
        statusIndicator.style.background = '#ffaa00'; // Orange
        statusText.textContent = 'Status Unknown';
        
        if (playerCount) {
            playerCount.textContent = '-/-';
        }
        
        if (serverUptime) {
            serverUptime.textContent = '-';
        }
    }
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Ignore if href is just "#"
            if (href === '#') {
                e.preventDefault();
                return;
            }
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * BlueMap button handler
 * Now links to https://map.festas-builds.com
 */
function initBlueMapButton() {
    const bluemapBtn = document.getElementById('bluemapBtn');
    
    // The button now has a direct href, but we can still add tracking or other behavior
    if (bluemapBtn) {
        bluemapBtn.addEventListener('click', function(e) {
            // Track click if analytics are enabled
            if (typeof gtag !== 'undefined') {
                gtag('event', 'bluemap_click', {
                    'event_category': 'external_link',
                    'event_label': 'BlueMap'
                });
            }
        });
    }
}

/**
 * Discord link handler
 * Update the href in HTML with actual Discord invite
 */
function initDiscordLink() {
    const discordLink = document.getElementById('discordLink');
    
    if (discordLink) {
        discordLink.addEventListener('click', function(e) {
            // Track click if analytics are enabled
            if (typeof gtag !== 'undefined') {
                gtag('event', 'discord_click', {
                    'event_category': 'external_link',
                    'event_label': 'Discord'
                });
            }
            
            // Note: Update the href in HTML to your actual Discord invite URL
            // Current placeholder: https://discord.gg/YOUR_INVITE_CODE
        });
    }
}

/**
 * FAQ Accordion functionality
 */
function initFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            // Close other open items (optional - remove if you want multiple items open)
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });
}

/**
 * Scroll animations - Reveal elements as they come into view
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    const elementsToAnimate = document.querySelectorAll(
        '.feature-card, .plugin-card, .rule-item, .join-option, ' +
        '.news-card, .showcase-card, .gallery-item, .cosmetic-card, ' +
        '.plugin-highlight-card, .leaderboard-card, .faq-item'
    );
    
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });
}

/**
 * Lazy loading for images (when you add actual images)
 * Add loading="lazy" attribute to img tags in HTML
 */
if ('loading' in HTMLImageElement.prototype) {
    // Browser supports native lazy loading
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src || img.src;
    });
} else {
    // Fallback for browsers that don't support lazy loading
    // You can add an intersection observer implementation here if needed
    console.log('Native lazy loading not supported');
}

