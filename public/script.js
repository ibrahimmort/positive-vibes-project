// Log right at the start to confirm the script file is executing
console.log("[MAIN SCRIPT] script.js: Script start.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("[MAIN SCRIPT] DOMContentLoaded event fired.");

    // --- Global Variables ---
    const mainAppContent = document.getElementById('main-app-content');
    const accountAreaWrapper = document.getElementById('account-area');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const weeklyThemeElement = document.getElementById('weekly-theme');
    const suggestionsListElement = document.getElementById('suggestions-list');
    const streakCounterElement = document.getElementById('streak-counter');
    const badgesListElement = document.getElementById('badges-list');
    const vibeButton = document.getElementById('vibe-button');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const mapElement = document.getElementById('map');
    const contactForm = document.getElementById('contact-form');
    let countdownIntervalId = null;
    let mapInstance = null;
    let mapMarkersLayer = null;

    // --- Helper Functions ---
    async function fetchJSON(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`[FETCH] Error fetching ${url}:`, error);
            throw error;
        }
    }

    function updateThemeUI(themeData) {
        if (themeData?.theme) {
            weeklyThemeElement.textContent = themeData.theme;
            suggestionsListElement.innerHTML = themeData.suggestions
                .map(suggestion => `<li>${suggestion}</li>`)
                .join('');
        } else {
            weeklyThemeElement.textContent = "Theme unavailable";
            suggestionsListElement.innerHTML = "<li>No suggestions available</li>";
        }
    }

    function updateGamificationUI(streak, badges) {
        streakCounterElement.textContent = streak || 0;

        badgesListElement.innerHTML = badges.length
            ? badges.map(badge => `<span class="badge">${badge}</span>`).join('')
            : '<span class="no-badges">No badges yet</span>';
    }

    function updateLoginUI(isLoggedIn) {
        if (isLoggedIn) {
            mainAppContent.classList.remove('hidden');
            accountAreaWrapper.classList.add('hidden');
        } else {
            mainAppContent.classList.add('hidden');
            accountAreaWrapper.classList.remove('hidden');
        }
    }

    function initializeCountdown(nextAvailableDate) {
        if (countdownIntervalId) clearInterval(countdownIntervalId);

        const now = new Date();
        const distance = new Date(nextAvailableDate) - now;

        if (distance <= 0) {
            vibeButton.disabled = false;
            vibeButton.textContent = "Push that P!";
            return;
        }

        const updateCountdown = () => {
            const remaining = new Date(nextAvailableDate) - new Date();
            if (remaining <= 0) {
                vibeButton.disabled = false;
                vibeButton.textContent = "Push that P!";
                clearInterval(countdownIntervalId);
                return;
            }

            const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            vibeButton.textContent = `Available in ${hours}h ${minutes}m`;
        };

        updateCountdown();
        countdownIntervalId = setInterval(updateCountdown, 60000); // Update countdown every minute
    }

    function initializeMap(mapData) {
        if (!mapInstance) {
            mapInstance = L.map(mapElement).setView([20, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(mapInstance);
            mapMarkersLayer = L.layerGroup().addTo(mapInstance);
        }

        mapMarkersLayer.clearLayers();
        mapData.forEach(({ location, count }) => {
            const jitter = (Math.random() - 0.5) * 0.01; // Add slight jitter to markers
            const marker = L.circle([location.lat + jitter, location.lon + jitter], {
                radius: Math.sqrt(count) * 50000,
                color: '#28a745',
                fillColor: '#28a745',
                fillOpacity: 0.4,
            }).bindPopup(`<b>${location.name}</b><br>${count} Vibes`);
            marker.addTo(mapMarkersLayer);
        });
    }

    // --- Event Handlers ---
    async function handleLoginSubmit(event) {
        event.preventDefault();
        const email = loginForm.querySelector('[name="email"]').value;
        const password = loginForm.querySelector('[name="password"]').value;

        try {
            const result = await fetchJSON('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            });
            console.log("[LOGIN] Login successful:", result);
            updateLoginUI(true);
            loadUserData();
        } catch (error) {
            console.error("[LOGIN] Login failed:", error);
        }
    }

    async function handleLogout() {
        try {
            await fetchJSON('/api/auth/logout', { method: 'POST', credentials: 'include' });
            console.log("[LOGOUT] Logout successful.");
            updateLoginUI(false);
        } catch (error) {
            console.error("[LOGOUT] Logout failed:", error);
        }
    }

    async function handleForgotPassword(event) {
        event.preventDefault();
        const email = forgotPasswordForm.querySelector('[name="email"]').value;

        try {
            const result = await fetchJSON('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            console.log("[FORGOT PASSWORD] Email sent:", result);
        } catch (error) {
            console.error("[FORGOT PASSWORD] Failed to send email:", error);
        }
    }

    async function handleVibeButtonClick() {
        try {
            const result = await fetchJSON('/api/vibes', { method: 'POST', credentials: 'include' });
            console.log("[VIBE] Vibe sent successfully:", result);
            initializeCountdown(result.nextAvailableTimestamp);
            loadUserData(); // Reload streaks, badges, etc.
        } catch (error) {
            console.error("[VIBE] Failed to send a vibe:", error);