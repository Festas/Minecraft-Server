// Plan Analytics Integration
const PLAN_URL = 'https://mc-stats.festas-builds.com';

document.addEventListener('DOMContentLoaded', () => {
    initPlan();
    initFullscreen();
    setupAuth();
});

function initPlan() {
    const frame = document.getElementById('planFrame');
    const loading = document.getElementById('statsLoading');
    const error = document.getElementById('statsError');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    frame.onload = () => {
        loading.classList.add('hidden');
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected to Plan';
    };

    frame.onerror = () => {
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        statusDot.classList.add('error');
        statusText.textContent = 'Connection failed';
    };

    // Retry button
    document.getElementById('retryStatsBtn')?.addEventListener('click', () => {
        error.classList.add('hidden');
        loading.classList.remove('hidden');
        frame.src = PLAN_URL;
    });
}

function initFullscreen() {
    const container = document.getElementById('statsContainer');
    const btn = document.getElementById('fullscreenBtn');
    
    btn?.addEventListener('click', () => {
        container.classList.toggle('fullscreen');
        btn.innerHTML = container.classList.contains('fullscreen') 
            ? '<span>✕</span> Exit Fullscreen'
            : '<span>⛶</span> Fullscreen';
    });

    // ESC to exit fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && container.classList.contains('fullscreen')) {
            container.classList.remove('fullscreen');
            btn.innerHTML = '<span>⛶</span> Fullscreen';
        }
    });
}

async function setupAuth() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/console/login.html';
            return;
        }
        
        const userBadge = document.getElementById('currentUser');
        if (userBadge) {
            const roleDisplay = data.role ? ` (${capitalizeFirstLetter(data.role)})` : '';
            userBadge.textContent = (data.username || 'Admin') + roleDisplay;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Logout button
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/console/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/console/login.html';
    }
});
