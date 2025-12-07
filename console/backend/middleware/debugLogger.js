/**
 * Debug logging middleware for authentication and session debugging
 * Logs comprehensive request details for troubleshooting session/CSRF issues
 */

const fs = require('fs').promises;
const path = require('path');

// Debug log file path
const DEBUG_LOG_PATH = path.join(__dirname, '../logs/api-debug.log');

// Ensure logs directory exists
async function ensureLogDirectory() {
    const logDir = path.dirname(DEBUG_LOG_PATH);
    try {
        await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
        console.error('Failed to create logs directory:', error);
    }
}

// Initialize log directory
ensureLogDirectory();

/**
 * Format log entry with timestamp and structured data
 */
function formatLogEntry(data) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${JSON.stringify(data, null, 2)}\n${'='.repeat(80)}\n`;
}

/**
 * Write to debug log file
 */
async function writeDebugLog(data) {
    try {
        const logEntry = formatLogEntry(data);
        await fs.appendFile(DEBUG_LOG_PATH, logEntry);
    } catch (error) {
        console.error('Failed to write debug log:', error);
    }
}

/**
 * Debug logging middleware for API routes
 * Logs session state, cookies, headers, and authentication details
 */
function debugLogger(options = {}) {
    const {
        logBody = false, // Log request body (may contain sensitive data)
        logResponse = false, // Log response (may be verbose)
    } = options;

    return async (req, res, next) => {
        const startTime = Date.now();

        // Extract session information
        const sessionInfo = {
            sessionID: req.sessionID || 'NO_SESSION_ID',
            sessionExists: !!req.session,
            authenticated: req.session?.authenticated || false,
            username: req.session?.username || 'NOT_SET',
            sessionData: req.session ? {
                cookie: {
                    maxAge: req.session.cookie.maxAge,
                    expires: req.session.cookie.expires,
                    httpOnly: req.session.cookie.httpOnly,
                    secure: req.session.cookie.secure,
                    sameSite: req.session.cookie.sameSite,
                    path: req.session.cookie.path,
                    domain: req.session.cookie.domain
                }
            } : null
        };

        // Extract cookie information
        const cookieInfo = {
            rawCookies: req.headers.cookie || 'NO_COOKIES',
            parsedCookies: req.cookies || {},
            signedCookies: req.signedCookies || {}
        };

        // Extract CSRF information
        const csrfInfo = {
            csrfTokenHeader: req.headers['csrf-token'] || req.headers['x-csrf-token'] || 'NO_CSRF_HEADER',
            csrfCookie: req.cookies['csrf-token'] || 'NO_CSRF_COOKIE'
        };

        // Extract headers (filter out potentially sensitive data)
        const headers = { ...req.headers };
        // Don't log authorization headers in production
        if (process.env.NODE_ENV === 'production' && headers.authorization) {
            headers.authorization = '[REDACTED]';
        }

        // Build debug log entry
        const debugEntry = {
            timestamp: new Date().toISOString(),
            request: {
                method: req.method,
                url: req.url,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('user-agent') || 'NO_USER_AGENT'
            },
            session: sessionInfo,
            cookies: cookieInfo,
            csrf: csrfInfo,
            headers: headers
        };

        // Optionally log request body (be careful with sensitive data)
        if (logBody && req.body && Object.keys(req.body).length > 0) {
            // Redact password fields
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.password) {
                sanitizedBody.password = '[REDACTED]';
            }
            debugEntry.requestBody = sanitizedBody;
        }

        // Intercept response to log status code and response time
        const originalSend = res.send;
        res.send = function (data) {
            debugEntry.response = {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                responseTime: `${Date.now() - startTime}ms`
            };

            // Optionally log response body (may be verbose)
            if (logResponse && data) {
                try {
                    const responseData = typeof data === 'string' ? JSON.parse(data) : data;
                    // Redact sensitive response data
                    if (responseData && typeof responseData === 'object') {
                        const sanitizedResponse = { ...responseData };
                        if (sanitizedResponse.csrfToken) {
                            sanitizedResponse.csrfToken = `[TOKEN:${sanitizedResponse.csrfToken.substring(0, 8)}...]`;
                        }
                        debugEntry.responseBody = sanitizedResponse;
                    }
                } catch (e) {
                    debugEntry.responseBody = '[COULD_NOT_PARSE]';
                }
            }

            // Write to debug log
            writeDebugLog(debugEntry);

            // Also log to console for immediate visibility
            console.log('=== API DEBUG LOG ===');
            console.log(`${req.method} ${req.url} - ${res.statusCode} (${Date.now() - startTime}ms)`);
            console.log('Session:', {
                id: sessionInfo.sessionID.substring(0, 12) + '...',
                authenticated: sessionInfo.authenticated,
                username: sessionInfo.username
            });
            console.log('CSRF:', {
                header: csrfInfo.csrfTokenHeader !== 'NO_CSRF_HEADER' ? '[PRESENT]' : '[MISSING]',
                cookie: csrfInfo.csrfCookie !== 'NO_CSRF_COOKIE' ? '[PRESENT]' : '[MISSING]'
            });
            console.log('====================');

            // Call original send
            return originalSend.call(this, data);
        };

        next();
    };
}

/**
 * Get the contents of the debug log file
 */
async function getDebugLogs(lines = 500) {
    try {
        const content = await fs.readFile(DEBUG_LOG_PATH, 'utf8');
        const allLines = content.split('\n');
        // Return last N lines
        return allLines.slice(-lines).join('\n');
    } catch (error) {
        return `Error reading debug log: ${error.message}`;
    }
}

/**
 * Clear the debug log file
 */
async function clearDebugLogs() {
    try {
        await fs.writeFile(DEBUG_LOG_PATH, '');
        return { success: true, message: 'Debug log cleared' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    debugLogger,
    getDebugLogs,
    clearDebugLogs,
    DEBUG_LOG_PATH
};
