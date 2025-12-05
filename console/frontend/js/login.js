// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Initialize CSRF token on page load
    async function initializeCSRF() {
        try {
            const response = await fetch('/api/csrf-token', {
                method: 'GET',
                credentials: 'same-origin'
            });
            if (!response.ok) {
                console.error('Failed to fetch CSRF token: ' + response.status + ' ' + response.statusText);
            }
        } catch (error) {
            console.error('Error fetching CSRF token:', error);
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        
        setTimeout(function() {
            errorMessage.classList.add('hidden');
        }, 5000);
    }

    // Initialize CSRF token when page loads
    initializeCSRF();

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ username: username, password: password })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    window.location.href = 'index.html';
                } else {
                    var errorMsg = 'Login failed';
                    if (data.error) {
                        errorMsg = data.error;
                    } else if (data.errors && Array.isArray(data.errors)) {
                        errorMsg = data.errors.map(function(err) { return err.msg; }).join(', ');
                    }
                    showError(errorMsg);
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Connection error. Please try again.');
            }
        });
    }
});
