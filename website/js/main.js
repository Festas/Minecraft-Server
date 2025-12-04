// Main JavaScript for festas_builds Minecraft Server Website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initCopyButton();
    initServerStatus();
    initSmoothScroll();
    initBlueMapButton();
    initDiscordLink();
});

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
 * Check server status (placeholder implementation)
 * In production, this would make an API call to check if server is online
 */
function initServerStatus() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    if (statusIndicator && statusText) {
        // This is a placeholder - in production you would:
        // 1. Make an API call to a status endpoint
        // 2. Use a Minecraft server status API (like mcsrvstat.us or api.mcsrvstat.us)
        // 3. Update the indicator based on the response
        
        // For now, we'll simulate checking the status
        checkServerStatus();
    }
}

/**
 * Simulate server status check
 * Replace this with actual API call in production
 */
async function checkServerStatus() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    // Placeholder: Set to online by default
    // In production, replace with actual API call like:
    // const response = await fetch('https://api.mcsrvstat.us/2/mc.festas-builds.com');
    // const data = await response.json();
    // const isOnline = data.online;
    
    const isOnline = true; // Placeholder
    
    if (isOnline) {
        statusIndicator.style.background = '#7cbd54'; // Green
        statusText.textContent = 'Server Online';
    } else {
        statusIndicator.style.background = '#ff4444'; // Red
        statusText.textContent = 'Server Offline';
        statusIndicator.style.animation = 'none';
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
 * Update this URL when BlueMap is configured
 */
function initBlueMapButton() {
    const bluemapBtn = document.getElementById('bluemapBtn');
    
    if (bluemapBtn) {
        bluemapBtn.addEventListener('click', function(e) {
            // Replace with actual BlueMap URL when configured
            // e.g., 'https://map.festas-builds.com'
            const bluemapUrl = '#'; // Placeholder
            
            if (bluemapUrl === '#') {
                e.preventDefault();
                alert('BlueMap is not yet configured. Check back soon!');
            } else {
                // Open in new tab
                window.open(bluemapUrl, '_blank');
            }
        });
    }
}

/**
 * Discord link handler
 * Update this URL with actual Discord invite
 */
function initDiscordLink() {
    const discordLink = document.getElementById('discordLink');
    
    if (discordLink) {
        discordLink.addEventListener('click', function(e) {
            // Replace with actual Discord invite URL
            // e.g., 'https://discord.gg/your-invite-code'
            const discordUrl = '#'; // Placeholder
            
            if (discordUrl === '#') {
                e.preventDefault();
                alert('Discord server link will be added soon!');
            } else {
                // Open in new tab
                window.open(discordUrl, '_blank');
            }
        });
    }
}

/**
 * Optional: Add scroll animations
 * Reveal elements as they come into view
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all cards and sections
    document.querySelectorAll('.feature-card, .plugin-card, .rule-item, .join-option').forEach(el => {
        observer.observe(el);
    });
}

// Optional: Initialize scroll animations if you want them
// Uncomment the line below to enable:
// initScrollAnimations();
