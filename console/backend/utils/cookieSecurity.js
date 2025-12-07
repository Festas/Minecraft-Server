/**
 * Cookie Security Configuration Utility
 * 
 * Centralized logic for determining cookie security settings based on environment.
 * This ensures session cookies and CSRF cookies have consistent security configuration.
 */

/**
 * Determine if secure cookies should be used.
 * 
 * Secure cookies (secure: true) are ONLY sent over HTTPS connections.
 * This is critical for production security but BREAKS all HTTP testing:
 * - Local development on http://localhost
 * - CI/CD workflows using plain HTTP
 * - curl/diagnostic scripts via HTTP
 * - Any non-HTTPS environment
 * 
 * When secure: true with HTTP requests:
 * - Browser/curl does NOT send the session cookie back to server
 * - Server sees no cookies, creates new session every request
 * - Session ID changes on every request
 * - Authentication always fails (authenticated: false)
 * - CSRF token never matches (different sessions)
 * - All authenticated API calls fail
 * 
 * Solution:
 * - secure: true ONLY for production with HTTPS/SSL
 * - secure: false for dev/test/CI using HTTP
 * - Override with COOKIE_SECURE=false env var for HTTP testing
 * 
 * @returns {boolean} True if cookies should be secure (HTTPS only), false otherwise (HTTP allowed)
 */
function shouldUseSecureCookies() {
    // Allow explicit override for testing/diagnostics
    if (process.env.COOKIE_SECURE !== undefined) {
        return process.env.COOKIE_SECURE === 'true';
    }
    
    // Only use secure cookies in production (assumes HTTPS/SSL is configured)
    // Development, test, and CI environments use HTTP and MUST have secure: false
    return process.env.NODE_ENV === 'production';
}

/**
 * Get a descriptive warning message about cookie security configuration
 * @param {boolean} secure - Whether cookies are secure
 * @returns {string} Warning message
 */
function getCookieSecurityWarning(secure) {
    return secure 
        ? 'HTTPS/SSL required for cookies to work' 
        : 'HTTP allowed - cookies work without SSL';
}

/**
 * Log cookie configuration to console
 * @param {string} type - Type of cookie (e.g., 'Session', 'CSRF')
 * @param {boolean} secure - Whether cookies are secure
 */
function logCookieConfiguration(type, secure) {
    console.log(`[${type}] Cookie configuration:`, {
        secure,
        nodeEnv: process.env.NODE_ENV || 'development',
        cookieSecureOverride: process.env.COOKIE_SECURE || 'not set',
        warning: getCookieSecurityWarning(secure)
    });
}

module.exports = {
    shouldUseSecureCookies,
    getCookieSecurityWarning,
    logCookieConfiguration
};
