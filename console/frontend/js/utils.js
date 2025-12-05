// Shared utilities for console frontend

// CSRF token (fetched after login)
let csrfToken = null;

// Fetch CSRF token
async function fetchCsrfToken() {
    try {
        const response = await fetch('/api/csrf-token', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        csrfToken = data.csrfToken;
        return csrfToken;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
        return null;
    }
}

// Helper function to make authenticated API requests with CSRF token
async function apiRequest(url, options = {}) {
    if (!options.headers) {
        options.headers = {};
    }
    
    // Add CSRF token to all non-GET requests
    if (csrfToken && options.method && options.method !== 'GET') {
        options.headers['x-csrf-token'] = csrfToken;
    }
    
    // Ensure credentials are included
    options.credentials = 'same-origin';
    
    return fetch(url, options);
}

// Export for use in other scripts
window.apiRequest = apiRequest;
window.fetchCsrfToken = fetchCsrfToken;
