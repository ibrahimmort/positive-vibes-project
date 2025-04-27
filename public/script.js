// Log right at the start to confirm the script file is executing
console.log("[MAIN SCRIPT] script.js: Script start.");

document.addEventListener('DOMContentLoaded', () => {
    // Log when the DOM is ready
    console.log("[MAIN SCRIPT] script.js: DOMContentLoaded event fired.");

    // --- Global Variables & Elements ---
    // Get references to elements that are always present (login/signup area)
    const mainAppContent = document.getElementById('main-app-content');
    const accountAreaWrapper = document.getElementById('account-area');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const signupMessageElement = document.getElementById('signup-message');
    const loginMessageElement = document.getElementById('login-message');
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');
    const forgotPasswordFormContainer = document.getElementById('forgot-password-form-container');
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotMessageElement = document.getElementById('forgot-message');
    const showLoginLinkFromForgot = document.getElementById('show-login-link-from-forgot');

    // Map Variables
    let mapInstance = null;
    let mapMarkersLayer = null;
    let isMapInitialized = false;

    // Timer variable
    let countdownIntervalId = null;

    // --- Helper Functions ---
    function getStartOfWeekUTC(date) {
        const d = new Date(date); d.setUTCHours(0, 0, 0, 0);
        const day = d.getUTCDay(); const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1);
        return new Date(d.setUTCDate(diff));
     }
    function getNextWeekStartUTC(date) {
        const currentWeekStart = getStartOfWeekUTC(date); const nextWeekStartDate = new Date(currentWeekStart);
        nextWeekStartDate.setUTCDate(currentWeekStart.getUTCDate() + 7); return nextWeekStartDate;
    }

    // --- Data Fetching Functions ---

    /** Fetches user status (/api/auth/status) */
    async function fetchStatusData() {
        console.log("[FETCH] Fetching status data...");
        try {
            const response = await fetch('/api/auth/status', { credentials: 'include' });
            const data = await response.json(); // Try parsing even if not ok
            console.log("[FETCH] Status response status:", response.status);
            console.log("[FETCH] Status data received:", data);
            if (!response.ok) { throw new Error(data.message || `HTTP error ${response.status}`); }
            return data;
        } catch (error) { console.error("[FETCH] Error fetching status data:", error); return { loggedIn: false, error: error.message }; } // Return error state
    }

    /** Fetches theme data (/api/theme/current) */
    async function fetchThemeData() {
        console.log("[FETCH] Fetching theme data...");
        try {
            const response = await fetch('/api/theme/current');
            console.log("[FETCH] Theme response status:", response.status);
            if (!response.ok) { let ed; try { ed = await response.json(); } catch { /*ign*/ } throw new Error(ed?.theme || `HTTP error ${response.status}`); }
            const data = await response.json();
            console.log("[FETCH] Theme data received:", data);
            return data;
        } catch (error) { console.error("[FETCH] Error fetching theme data:", error); return null; }
    }

    /** Fetches stats data (/api/stats) */
    async function fetchStatsData() {
        console.log("[FETCH] Fetching stats data...");
        try {
            const response = await fetch('/api/stats', { credentials: 'include' });
            console.log("[FETCH] Stats response status:", response.status);
            if (!response.ok) { throw new Error(`HTTP error ${response.status}`); }
            const data = await response.json();
            console.log("[FETCH] Stats data received:", data);
            return data;
        } catch (error) { console.error("[FETCH] Error fetching stats data:", error); return null; }
    }

    /** Fetches map data (/api/map-data) */
     async function fetchMapData() {
        console.log("[FETCH] Fetching map data...");
        try {
            const response = await fetch('/api/map-data');
             if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
             const data = await response.json();
             console.log("[FETCH] Map data received:", data);
             return data;
        } catch (error) {
             console.error("[FETCH] Error fetching map data:", error);
             return []; // Return empty array on error
        }
    }

    // --- UI Update Functions ---

    /** Updates the theme section */
    function updateThemeUI(themeData) {
        console.log("[UI UPDATE] Updating theme UI. Data:", themeData);
        const weeklyThemeElement = document.getElementById('weekly-theme');
        const suggestionsListElement = document.getElementById('suggestions-list');
        if (!weeklyThemeElement || !suggestionsListElement) { console.error("[UI UPDATE] Theme/suggestion elements not found."); return; }

        if (themeData && themeData.theme) {
            weeklyThemeElement.textContent = themeData.theme;
            suggestionsListElement.innerHTML = '';
            if (themeData.suggestions && themeData.suggestions.length > 0) {
                const shuffled = [...themeData.suggestions].sort(() => 0.5 - Math.random());
                shuffled.slice(0, 3).forEach(suggestion => { const li = document.createElement('li'); li.textContent = suggestion; suggestionsListElement.appendChild(li); });
            } else { suggestionsListElement.innerHTML = '<li>No specific suggestions this week. Focus on the theme!</li>'; }
            console.log("[UI UPDATE] Theme UI updated successfully.");
        } else {
            weeklyThemeElement.textContent = 'Theme Unavailable';
            suggestionsListElement.innerHTML = `<li>Could not load suggestions.</li>`;
            console.log("[UI UPDATE] Theme UI set to unavailable/error state.");
        }
    }

    /** Updates the stats counters */
    function updateStatsUI(statsData) {
        console.log("[UI UPDATE] Updating stats UI. Data:", statsData);
        const weeklyCounterElement = document.getElementById('weekly-counter');
        const totalCounterElement = document.getElementById('total-counter');
        if (!weeklyCounterElement || !totalCounterElement) { console.error("[UI UPDATE] Counter elements not found."); return; }

        if (statsData) {
            weeklyCounterElement.textContent = statsData.weeklyVibes ?? 0;
            totalCounterElement.textContent = statsData.totalVibes ?? 0;
            console.log("[UI UPDATE] Stats UI updated successfully.");
        } else {
            weeklyCounterElement.textContent = 'Err';
            totalCounterElement.textContent = 'Err';
            console.log("[UI UPDATE] Stats UI set to error state.");
        }
    }

    /** Updates the gamification section (streak, badges, progress) */
    function updateGamificationUI(streak = 0, badges = [], nextBadgeName = '', nextBadgeProgress = 0) {
         console.log(`[UI UPDATE] Updating gamification UI. Streak: ${streak}, Badges: ${badges?.length}, Next: ${nextBadgeName}, Progress: ${nextBadgeProgress}`);
         const streakCounterElement = document.getElementById('streak-counter');
         const badgesListElement = document.getElementById('badges-list');
         const progressBarInnerElement = document.getElementById('progress-bar-inner');
         const nextBadgeTextElement = document.getElementById('next-badge-text');

         if (streakCounterElement) { streakCounterElement.textContent = streak; }
         else { console.warn("[UI UPDATE] Streak counter element not found."); }

         if (badgesListElement) {
             badgesListElement.innerHTML = '';
             if (badges && badges.length > 0) {
                 badges.forEach(badgeName => { const badgeEl = document.createElement('span'); badgeEl.classList.add('badge-item'); badgeEl.textContent = badgeName; badgeEl.title = badgeName; badgesListElement.appendChild(badgeEl); });
             } else { badgesListElement.innerHTML = '<span class="no-badges">Keep spreading vibes to earn badges!</span>'; }
         } else { console.warn("[UI UPDATE] Badges list element not found."); }

         if (progressBarInnerElement && nextBadgeTextElement) {
             const progressPercent = Math.max(0, Math.min(100, nextBadgeProgress));
             progressBarInnerElement.style.width = `${progressPercent}%`;
             progressBarInnerElement.setAttribute('aria-valuenow', progressPercent);
             progressBarInnerElement.textContent = `${progressPercent}%`;
             nextBadgeTextElement.textContent = `Next: ${nextBadgeName || 'N/A'}`;
         } else { console.warn("[UI UPDATE] Progress bar elements not found."); }
         console.log("[UI UPDATE] Finished updating gamification elements.");
    }

    /** Updates the map markers */
    async function updateMapUI(mapData) {
         if (!mapInstance || !mapMarkersLayer) { console.warn("[MAP DEBUG] Map not initialized, cannot update map UI."); return; }
         console.log("[MAP DEBUG] Updating map UI with data:", mapData);
         mapMarkersLayer.clearLayers();
         if (!mapData || mapData.length === 0) { console.log("[MAP DEBUG] No map data to display."); return; }

         const geocodePromises = mapData.map(item => {
             if (item && item.location && item.count > 0) { return geocodeLocation(item.location).then(coords => ({ ...item, coords })); }
             return Promise.resolve(null);
         });
         const results = await Promise.allSettled(geocodePromises);
         results.forEach(result => {
             if (result.status === 'fulfilled' && result.value && result.value.coords) {
                 const item = result.value; const locationString = item.location; const count = item.count; const coords = item.coords;
                 const jitterLat = (Math.random() - 0.5) * 0.01; const jitterLon = (Math.random() - 0.5) * 0.01;
                 const finalLat = coords.lat + jitterLat; const finalLon = coords.lon + jitterLon;
                 const radius = Math.sqrt(count) * 50000; const finalRadius = Math.max(radius, 20000);
                 try { L.circle([finalLat, finalLon], { color: '#28a745', fillColor: '#28a745', fillOpacity: 0.4, radius: finalRadius }).bindPopup(`<b>${locationString}</b><br>${count} Vibes`).addTo(mapMarkersLayer); }
                 catch (circleError) { console.error(`[MAP DEBUG] Error adding circle for ${locationString}:`, circleError); }
             } else if (result.status === 'fulfilled' && result.value) { console.warn(`[MAP DEBUG] Could not geocode location: "${result.value.location}"`); }
             else if (result.status === 'rejected') { console.error("[MAP DEBUG] Geocoding promise rejected:", result.reason); }
         });
         console.log("[MAP DEBUG] Finished updating map UI.");
     }

    /** Sets vibe button style to Active */
    function setButtonStyleActive(button) {
        if (!button) return;
        const buttonInstructionElement = document.querySelector('.button-instruction');
        button.classList.remove('vibe-button-countdown');
        button.classList.add('vibe-button-active');
        button.textContent = 'P';
        button.title = "Push to spread a positive vibe!";
        if (buttonInstructionElement) buttonInstructionElement.innerHTML = "Make sure to spread some Positive Vibes around first<br>then when ready... Push that P!";
     }
    /** Sets vibe button style to Countdown */
    function setButtonStyleCountdown(button) {
        if (!button) return;
        const buttonInstructionElement = document.querySelector('.button-instruction');
        button.classList.remove('vibe-button-active');
        button.classList.add('vibe-button-countdown');
        if (buttonInstructionElement) buttonInstructionElement.textContent = "You are awesome, continue to spread positive vibes everyday, and next week we meet again.";
     }
    /** Updates the vibe button state and starts countdown if needed */
    function updateVibeButtonState(timestampISO) {
        console.log("[UI DEBUG] updateVibeButtonState called with timestamp:", timestampISO);
        const vibeButton = document.getElementById('vibe-button');
        if (!vibeButton) { console.error("[UI DEBUG] Vibe button not found in updateVibeButtonState."); return; }
        if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
        const now = new Date(); const nowTime = now.getTime(); const startOfThisWeek = getStartOfWeekUTC(now);
        let canPushVibe = true; let targetCountdownTime = getNextWeekStartUTC(now);
        if (timestampISO) {
            try {
                const receivedDate = new Date(timestampISO); const receivedTime = receivedDate.getTime();
                if (isNaN(receivedTime)) throw new Error("Invalid date value received");
                if (receivedTime <= nowTime) { const lastVibeTime = receivedDate; if (lastVibeTime >= startOfThisWeek) { canPushVibe = false; targetCountdownTime = getNextWeekStartUTC(lastVibeTime); } else { canPushVibe = true; } }
                else { canPushVibe = false; targetCountdownTime = receivedDate; }
                 if (!canPushVibe && targetCountdownTime <= now) { console.warn("[UI DEBUG] updateVibeButtonState: Next available time is in the past, allowing push."); canPushVibe = true; }
            } catch (e) { console.error("[UI DEBUG] updateVibeButtonState: Error processing timestampISO:", timestampISO, e); canPushVibe = true; }
        }
        if (canPushVibe) { console.log("[UI DEBUG] updateVibeButtonState: Setting button ACTIVE."); vibeButton.disabled = false; setButtonStyleActive(vibeButton); }
        else { console.log("[UI DEBUG] updateVibeButtonState: Setting button COUNTDOWN. Target:", targetCountdownTime instanceof Date ? targetCountdownTime.toISOString() : targetCountdownTime); vibeButton.disabled = true; setButtonStyleCountdown(vibeButton); startCountdown(targetCountdownTime); }
     }
    /** Starts the countdown timer interval */
    function startCountdown(targetDate) {
        console.log(`[UI DEBUG] startCountdown called. Target:`, targetDate);
        const vibeButton = document.getElementById('vibe-button');
        if (!vibeButton) { console.error("[UI DEBUG] Vibe button not found in startCountdown."); return; }
        let targetDateObj; try { targetDateObj = (targetDate instanceof Date) ? targetDate : new Date(targetDate); if (isNaN(targetDateObj.getTime())) throw new Error("Invalid date value"); }
        catch (e) { console.error("[UI DEBUG] startCountdown: Invalid targetDate:", targetDate, e); if (countdownIntervalId) clearInterval(countdownIntervalId); countdownIntervalId = null; updateVibeButtonState(null); return; }
        console.log(`[UI DEBUG] startCountdown: Parsed targetDateObj: ${targetDateObj.toISOString()}`);
        function updateTimer() {
            const currentVibeButton = document.getElementById('vibe-button');
            if (!currentVibeButton || !currentVibeButton.classList.contains('vibe-button-countdown')) { // Check if button still exists and is in countdown mode
                 if (countdownIntervalId) clearInterval(countdownIntervalId); countdownIntervalId = null; console.log("[UI DEBUG] Vibe button removed or state changed, stopping timer."); return;
            }
            const now = new Date().getTime(); const targetTime = targetDateObj.getTime(); const distance = targetTime - now;
            if (distance <= 0) { if (countdownIntervalId) clearInterval(countdownIntervalId); countdownIntervalId = null; console.log("[UI DEBUG] Countdown finished."); currentVibeButton.disabled = false; setButtonStyleActive(currentVibeButton); return; }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24)); const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            let countdownText = ''; if (days > 0) countdownText += `${days}d `; if (days > 0 || hours > 0) countdownText += `${hours}h `; if (days === 0 && hours === 0) { countdownText = `${minutes}m`; } else if (days === 0) { countdownText += `${minutes}m`; } if (countdownText.trim() === '' && distance > 0) countdownText = `Soon...`;
            currentVibeButton.textContent = countdownText.trim();
            try { currentVibeButton.title = `Available ~ ${targetDateObj.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: 'numeric' })}`; } catch { currentVibeButton.title = `Available soon`; }
        }
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        setButtonStyleCountdown(vibeButton); // Ensure style is set
        updateTimer(); // Initial call
        countdownIntervalId = setInterval(updateTimer, 60000);
        console.log("[UI DEBUG] startCountdown: Interval started.");
     }

    /** Handles contact form submission */
    async function handleContactFormSubmit(event) { /* ... unchanged ... */ }

    // --- Authentication & UI Flow ---

    /**
     * Main function to load all app data after login and update the UI.
     */
    async function loadAppData(statusData) {
        console.log("[MAIN SCRIPT] loadAppData called.");
        if (!statusData || !statusData.loggedIn) {
             console.error("[MAIN SCRIPT] loadAppData called without loggedIn status. Aborting.");
             updateLoginUI(false); // Ensure logged out state
             return;
        }

        // Show main app, hide account area, assign elements, add listeners
        if(mainAppContent) mainAppContent.classList.remove('hidden');
        if(accountAreaWrapper) accountAreaWrapper.classList.add('hidden');
        if (!assignMainAppElements()) { console.error("[MAIN SCRIPT] Failed to assign main app elements in loadAppData."); return; }
        addAppEventListeners();
        initializeMap(); // Initialize map (safe to call multiple times)

        // Update static elements immediately from status data
        const userEmailDisplay = document.getElementById('user-email-display');
        const userStatusElement = document.getElementById('user-status');
        if (userStatusElement) userStatusElement.classList.remove('hidden');
        if (userEmailDisplay) userEmailDisplay.textContent = statusData.email || '';

        // Update gamification immediately from status data
        updateGamificationUI(statusData.currentStreak, statusData.badges, statusData.nextBadgeName, statusData.nextBadgeProgress);

        // Set initial loading states for dynamic data
        updateThemeUI(null);
        updateStatsUI(null);
        updateVibeButtonState(statusData.lastVibeTimestamp); // Set initial button state

        // Fetch dynamic data concurrently
        console.log("[MAIN SCRIPT] Fetching theme and stats data concurrently...");
        const [themeData, statsData, mapDataResult] = await Promise.allSettled([
            fetchThemeData(),
            fetchStatsData(),
            fetchMapData() // Fetch map data here too
        ]);
        console.log("[MAIN SCRIPT] Theme, stats, map fetches completed.");

        // Update UI with fetched data (check status for safety)
        updateThemeUI(themeData.status === 'fulfilled' ? themeData.value : null);
        updateStatsUI(statsData.status === 'fulfilled' ? statsData.value : null);
        updateMapUI(mapDataResult.status === 'fulfilled' ? mapDataResult.value : []); // Update map

        console.log("[MAIN SCRIPT] loadAppData finished.");
    }


    /** Handles signup form submission */
    async function handleSignupSubmit(event) { /* ... unchanged ... */ }
    /** Handles login form submission */
    async function handleLoginSubmit(event) {
        event.preventDefault();
        console.log("[LOGIN DEBUG] Login form submitted.");
        if (!loginMessageElement || !loginForm) { console.error("[LOGIN DEBUG] Login form elements missing."); return; }
        loginMessageElement.textContent = '';
        loginMessageElement.className = 'message hidden';
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        if (!email || !password) { loginMessageElement.textContent = 'Please enter both email and password.'; loginMessageElement.className = 'message error'; loginMessageElement.classList.remove('hidden'); return; }
         console.log("[LOGIN DEBUG] Sending login request...");
        try {
            const loginResponse = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), credentials: 'include' });
            const loginResult = await loginResponse.json();
            console.log("[LOGIN DEBUG] Login response:", loginResponse.status, loginResult);
            if (loginResponse.ok) {
                loginForm.reset();
                // Instead of checkSession, directly call loadAppData after successful login
                // We need the status data first though
                const statusData = await fetchStatusData();
                if (statusData && statusData.loggedIn) {
                     loadAppData(statusData); // Load app data using fetched status
                } else {
                     console.error("[LOGIN DEBUG] Failed to fetch status after successful login, showing logout UI.");
                     updateLoginUI(false); // Fallback to logged out UI
                }
            } else {
                loginMessageElement.textContent = loginResult.message || `Login failed (Error: ${loginResponse.status})`;
                loginMessageElement.className = 'message error';
                updateLoginUI(false);
            }
        } catch (error) {
            console.error("[LOGIN DEBUG] Login network error:", error);
            loginMessageElement.textContent = 'Network error. Please try again.';
            loginMessageElement.className = 'message error';
            updateLoginUI(false);
        } finally {
             loginMessageElement.classList.remove('hidden');
        }
     }
    /** Handles logout button click */
    function handleLogout() {
        console.log("[LOGOUT DEBUG] Logout button clicked.");
         if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
         // Clear map instance on logout
         if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarkersLayer = null; isMapInitialized = false; }
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .then(res => res.json())
        .then(data => console.log("[LOGOUT DEBUG] Logout response:", data))
        .catch(error => console.error("[LOGOUT DEBUG] Error during logout fetch:", error))
        .finally(() => {
             // Directly call updateLoginUI with loggedIn: false
             updateLoginUI(false);
        });
     }
    /** Shows the forgot password form */
    function handleForgotPassword(event) { /* ... unchanged ... */ }
    /** Handles forgot password form submission */
    async function handleForgotPasswordSubmit(event) { /* ... unchanged ... */ }
    /** Shows the signup form */
    function showSignupForm(event) { /* ... unchanged ... */ }
    /** Shows the login form */
    function showLoginForm(event) { /* ... unchanged ... */ }

    /**
     * Initial check for user session status on page load.
     */
    async function checkSession() {
        console.log("[MAIN SCRIPT] checkSession called for initial load or refresh.");
        const statusData = await fetchStatusData();
        if (statusData && statusData.loggedIn) {
            console.log("[MAIN SCRIPT] User is logged in via checkSession. Calling loadAppData...");
            loadAppData(statusData); // Load app data using fetched status
        } else {
            console.log("[MAIN SCRIPT] User is not logged in via checkSession.");
            updateLoginUI(false); // Show login UI
        }
        console.log("[MAIN SCRIPT] checkSession finished.");
    }


    // --- Initialization ---
    // Add event listeners for account forms/links FIRST
    console.log("[MAIN SCRIPT DEBUG] Attaching account form/link listeners...");
    if (signupForm) { signupForm.addEventListener('submit', handleSignupSubmit); console.log("[MAIN SCRIPT DEBUG] Signup form listener attached."); }
    else { console.error("[MAIN SCRIPT DEBUG] Signup form not found for listener."); }
    if (loginForm) { loginForm.addEventListener('submit', handleLoginSubmit); console.log("[MAIN SCRIPT DEBUG] Login form listener attached."); }
    else { console.error("[MAIN SCRIPT DEBUG] Login form not found for listener."); }
    if (forgotPasswordForm) { forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit); console.log("[MAIN SCRIPT DEBUG] Forgot password form listener attached."); }
    else { console.error("[MAIN SCRIPT DEBUG] Forgot password form not found for listener."); }
    if (showSignupLink) { showSignupLink.addEventListener('click', showSignupForm); console.log("[MAIN SCRIPT DEBUG] Show signup link listener attached."); }
    else { console.error("[MAIN SCRIPT DEBUG] #show-signup-link not found"); }
    if (showLoginLink) { showLoginLink.addEventListener('click', showLoginForm); console.log("[MAIN SCRIPT DEBUG] Show login link listener attached."); }
    else { console.error("[MAIN SCRIPT DEBUG] #show-login-link not found"); }
    if (showLoginLinkFromForgot) { showLoginLinkFromForgot.addEventListener('click', showLoginForm); console.log("[MAIN SCRIPT DEBUG] Show login link (from forgot) listener attached."); }
    else { console.error("[MAIN SCRIPT DEBUG] #show-login-link-from-forgot not found"); }
    if (forgotPasswordLink) { forgotPasswordLink.addEventListener('click', handleForgotPassword); console.log("[MAIN SCRIPT DEBUG] Forgot password link listener attached."); }
    else { console.error("[MAIN SCRIPT DEBUG] #forgot-password-link not found"); }

    // Initial check to see if user is already logged in
    checkSession();

}); // End DOMContentLoaded

console.log("[MAIN SCRIPT] script.js: Script finished initial execution.");
