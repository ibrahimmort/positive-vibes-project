// Log right at the start to confirm the script file is executing
console.log("[MAIN SCRIPT] script.js: Script start.");

document.addEventListener('DOMContentLoaded', () => {
    // Log when the DOM is ready
    console.log("[MAIN SCRIPT] script.js: DOMContentLoaded event fired.");

    // --- Global Variables & Elements ---
    // Get references to elements that are always present (login/signup area)
    console.log("[MAIN SCRIPT] Getting account area elements...");
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
    console.log("[MAIN SCRIPT] Finished getting account area elements.");


    // Elements assigned after login (declared here, assigned later)
    // These need to be accessible by multiple functions, so declare them in this scope
    let weeklyThemeElement, suggestionsListElement, vibeButton, confirmationMessage,
        weeklyCounterElement, totalCounterElement, userStatusElement,
        userEmailDisplay, logoutButton, buttonInstructionElement, streakCounterElement,
        badgesListElement, progressBarInnerElement, nextBadgeTextElement,
        contactForm, contactTextarea, contactSubmitButton, contactFormMessage;

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

    // --- Assign Main App Elements Function ---
    // Define this function *before* it's potentially called by loadAppData
    /**
     * Assigns references to the main application elements after they become visible.
     * Should only be called *after* successful login. Returns true if successful.
     */
    function assignMainAppElements() {
        console.log("[MAIN SCRIPT] Assigning main app elements (post-login)...");
        try {
            // Assign elements to the higher-scoped variables
            weeklyThemeElement = document.getElementById('weekly-theme');
            suggestionsListElement = document.getElementById('suggestions-list');
            vibeButton = document.getElementById('vibe-button');
            confirmationMessage = document.getElementById('confirmation-message');
            weeklyCounterElement = document.getElementById('weekly-counter');
            totalCounterElement = document.getElementById('total-counter');
            userStatusElement = document.getElementById('user-status');
            userEmailDisplay = document.getElementById('user-email-display');
            logoutButton = document.getElementById('logout-button');
            buttonInstructionElement = document.querySelector('.button-instruction');
            streakCounterElement = document.getElementById('streak-counter');
            badgesListElement = document.getElementById('badges-list');
            progressBarInnerElement = document.getElementById('progress-bar-inner');
            nextBadgeTextElement = document.getElementById('next-badge-text');
            contactForm = document.getElementById('contact-form');
            contactTextarea = document.getElementById('contact-message');
            contactSubmitButton = document.getElementById('contact-submit-button');
            contactFormMessage = document.getElementById('contact-form-message');

            // Check if essential elements were found
            if (!weeklyThemeElement || !suggestionsListElement || !vibeButton || !weeklyCounterElement || !totalCounterElement || !streakCounterElement || !badgesListElement || !progressBarInnerElement || !nextBadgeTextElement) {
                console.warn("[MAIN SCRIPT] Failed to find one or more essential main app elements!");
                // Allow partial functionality even if some elements are missing
            }

            // Ensure contact message element exists if form exists
            if (contactForm && !contactFormMessage) {
                console.warn("Contact form message element missing, creating dynamically.");
                contactFormMessage = document.createElement('p');
                contactFormMessage.id = 'contact-form-message';
                contactFormMessage.className = 'message hidden';
                if(contactSubmitButton) {
                    contactForm.insertBefore(contactFormMessage, contactSubmitButton);
                } else if (contactForm) {
                    contactForm.appendChild(contactFormMessage);
                }
            }
            console.log("[MAIN SCRIPT] Finished assigning main app elements.");
            return true; // Indicate success (or at least completion)
        } catch (error) {
            console.error("[MAIN SCRIPT] Error during assignMainAppElements:", error);
            return false; // Indicate failure
        }
    }

    // --- Data Fetching Functions ---
    /** Fetches user status (/api/auth/status) */
    async function fetchStatusData() {
        console.log("[FETCH] Fetching status data...");
        try {
            const response = await fetch('/api/auth/status', { credentials: 'include' });
            const data = await response.json();
            console.log("[FETCH] Status response status:", response.status);
            console.log("[FETCH] Status data received:", data);
            if (!response.ok) { throw new Error(data.message || `HTTP error ${response.status}`); }
            return data;
        } catch (error) { console.error("[FETCH] Error fetching status data:", error); return { loggedIn: false, error: error.message }; }
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
        } catch (error) { console.error("[FETCH] Error fetching map data:", error); return []; }
    }
    /** Fetches map data and updates UI */
    async function fetchAndDisplayMapData() {
        const mapData = await fetchMapData();
        await updateMapUI(mapData); // await this to ensure geocoding finishes
    }
    /** Geocodes a location string */
    async function geocodeLocation(locationString) {
        if (!locationString) return null;
        const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationString)}&format=json&limit=1&addressdetails=0`;
        try {
            const response = await fetch(apiUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
            if (!response.ok) { console.error(`[GEOCODE] Nominatim API error for "${locationString}": ${response.status}`); return null; }
            const data = await response.json();
            if (data && data.length > 0) { const result = data[0]; return { lat: parseFloat(result.lat), lon: parseFloat(result.lon) }; }
            else { console.warn(`[GEOCODE] No geocoding results found for "${locationString}"`); return null; }
        } catch (error) { console.error(`[GEOCODE] Error during geocoding fetch for "${locationString}":`, error); return null; }
    }


    // --- UI Update Functions ---
    /** Updates the theme section */
    function updateThemeUI(themeData) {
            console.log("[UI UPDATE] Updating theme UI. Data:", themeData);
            // Re-get elements inside update functions to ensure they exist
            const weeklyThemeElement = document.getElementById('weekly-theme');
            const suggestionsListElement = document.getElementById('suggestions-list');
            if (!weeklyThemeElement || !suggestionsListElement) { console.error("[UI UPDATE] Theme/suggestion elements not found for UI update."); return; }
            if (themeData.suggestions && themeData.suggestions.length > 0) {
                 // Clear previous suggestions
                 suggestionsListElement.innerHTML = '';
                 // Loop through ALL suggestions directly
                 themeData.suggestions.forEach(suggestion => { // Correct loop
                     const li = document.createElement('li');
                     li.textContent = suggestion;
                     suggestionsListElement.appendChild(li);
                 });
            } else {
                 // Handle case with no suggestions
                 suggestionsListElement.innerHTML = '<li>No specific suggestions this week. Focus on the theme!</li>';
            }
    /** Updates the stats counters */
    function updateStatsUI(statsData) {
            console.log("[UI UPDATE] Updating stats UI. Data:", statsData);
            const weeklyCounterElement = document.getElementById('weekly-counter');
            const totalCounterElement = document.getElementById('total-counter');
            if (!weeklyCounterElement || !totalCounterElement) { console.error("[UI UPDATE] Counter elements not found for UI update."); return; }
            if (statsData) { weeklyCounterElement.textContent = statsData.weeklyVibes ?? 0; totalCounterElement.textContent = statsData.totalVibes ?? 0; console.log("[UI UPDATE] Stats UI updated successfully."); }
            else { weeklyCounterElement.textContent = 'Err'; totalCounterElement.textContent = 'Err'; console.log("[UI UPDATE] Stats UI set to error state."); }
        }
    /** Updates the gamification section */
    function updateGamificationUI(streak = 0, badges = [], nextBadgeName = '', nextBadgeProgress = 0) {
            console.log(`[UI UPDATE] Updating gamification UI. Streak: ${streak}, Badges: ${badges?.length}, Next: ${nextBadgeName}, Progress: ${nextBadgeProgress}`);
            const streakCounterElement = document.getElementById('streak-counter'); const badgesListElement = document.getElementById('badges-list'); const progressBarInnerElement = document.getElementById('progress-bar-inner'); const nextBadgeTextElement = document.getElementById('next-badge-text');
            if (streakCounterElement) { streakCounterElement.textContent = streak; } else { console.warn("[UI UPDATE] Streak counter element not found."); }
            if (badgesListElement) { badgesListElement.innerHTML = ''; if (badges && badges.length > 0) { badges.forEach(badgeName => { const badgeEl = document.createElement('span'); badgeEl.classList.add('badge-item'); badgeEl.textContent = badgeName; badgeEl.title = badgeName; badgesListElement.appendChild(badgeEl); }); } else { badgesListElement.innerHTML = '<span class="no-badges">Keep spreading vibes to earn badges!</span>'; } }
            else { console.warn("[UI UPDATE] Badges list element not found."); }
            if (progressBarInnerElement && nextBadgeTextElement) { const progressPercent = Math.max(0, Math.min(100, nextBadgeProgress)); progressBarInnerElement.style.width = `${progressPercent}%`; progressBarInnerElement.setAttribute('aria-valuenow', progressPercent); progressBarInnerElement.textContent = `${progressPercent}%`; nextBadgeTextElement.textContent = `Next: ${nextBadgeName || 'N/A'}`; }
            else { console.warn("[UI UPDATE] Progress bar elements not found."); }
            console.log("[UI UPDATE] Finished updating gamification elements.");
    }
    /** Updates the map markers */
    async function updateMapUI(mapData) {
            if (!mapInstance || !mapMarkersLayer) { console.warn("[MAP DEBUG] Map not initialized, cannot update map UI."); return; }
            console.log("[MAP DEBUG] Updating map UI with data:", mapData);
            mapMarkersLayer.clearLayers();
            if (!mapData || mapData.length === 0) { console.log("[MAP DEBUG] No map data to display."); return; }
            const geocodePromises = mapData.map(item => { if (item && item.location && item.count > 0) { return geocodeLocation(item.location).then(coords => ({ ...item, coords })); } return Promise.resolve(null); });
            const results = await Promise.allSettled(geocodePromises);
            console.log("[MAP DEBUG] Geocoding results settled.");
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value && result.value.coords) {
                    const item = result.value; const locationString = item.location; const count = item.count; const coords = item.coords;
                    const jitterLat = (Math.random() - 0.5) * 0.01; const jitterLon = (Math.random() - 0.5) * 0.01; const finalLat = coords.lat + jitterLat; const finalLon = coords.lon + jitterLon;
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
        button.classList.remove('vibe-button-countdown'); button.classList.add('vibe-button-active');
        button.textContent = 'P'; button.title = "Push to spread a positive vibe!";
        if (buttonInstructionElement) buttonInstructionElement.innerHTML = "Make sure to spread some Positive Vibes around first<br>then when ready... Push that P!";
    }
    /** Sets vibe button style to Countdown */
    function setButtonStyleCountdown(button) {
        if (!button) return;
        const buttonInstructionElement = document.querySelector('.button-instruction');
        button.classList.remove('vibe-button-active'); button.classList.add('vibe-button-countdown');
        if (buttonInstructionElement) buttonInstructionElement.textContent = "You are awesome, continue to spread positive vibes everyday, and next week we meet again.";
    }
    /** Updates the vibe button state */
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
            if (!currentVibeButton || !currentVibeButton.classList.contains('vibe-button-countdown')) { if (countdownIntervalId) clearInterval(countdownIntervalId); countdownIntervalId = null; console.log("[UI DEBUG] Vibe button removed or state changed, stopping timer."); return; }
            const now = new Date().getTime(); const targetTime = targetDateObj.getTime(); const distance = targetTime - now;
            if (distance <= 0) { if (countdownIntervalId) clearInterval(countdownIntervalId); countdownIntervalId = null; console.log("[UI DEBUG] Countdown finished."); currentVibeButton.disabled = false; setButtonStyleActive(currentVibeButton); return; }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24)); const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            let countdownText = ''; if (days > 0) countdownText += `${days}d `; if (days > 0 || hours > 0) countdownText += `${hours}h `; if (days === 0 && hours === 0) { countdownText = `${minutes}m`; } else if (days === 0) { countdownText += `${minutes}m`; } if (countdownText.trim() === '' && distance > 0) countdownText = `Soon...`;
            currentVibeButton.textContent = countdownText.trim();
            try { currentVibeButton.title = `Available ~ ${targetDateObj.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: 'numeric' })}`; } catch { currentVibeButton.title = `Available soon`; }
        }
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        setButtonStyleCountdown(vibeButton); updateTimer(); countdownIntervalId = setInterval(updateTimer, 60000);
        console.log("[UI DEBUG] startCountdown: Interval started.");
    }

    // --- Map Initialization ---
    function initializeMap() {
        if (isMapInitialized) { console.log("[MAP DEBUG] Map already initialized."); return; }
        isMapInitialized = true; console.log("[MAP DEBUG] Initializing map...");
        const mapElement = document.getElementById('map');
        if (!mapElement) { console.error("[MAP DEBUG] Map container element (#map) not found."); isMapInitialized = false; return; }
        try {
            if (!mapInstance) { mapInstance = L.map('map').setView([20, 0], 2); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(mapInstance); mapMarkersLayer = L.layerGroup().addTo(mapInstance); console.log("[MAP DEBUG] Leaflet map instance created."); }
            else { console.log("[MAP DEBUG] Map instance already exists."); }
            fetchAndDisplayMapData(); // Fetch data after initializing
        } catch (error) { console.error("[MAP DEBUG] Error initializing Leaflet map:", error); if(mapElement) mapElement.innerHTML = "<p>Error loading map.</p>"; isMapInitialized = false; mapInstance = null; mapMarkersLayer = null; }
    }

    // --- Event Handlers ---
    async function handleVibeButtonClick() {
        console.log("[VIBE CLICK DEBUG] handleVibeButtonClick called.");
        const vibeButton = document.getElementById('vibe-button'); const confirmationMessage = document.getElementById('confirmation-message');
        if (!vibeButton || !confirmationMessage) { console.error("[VIBE CLICK DEBUG] Vibe button or confirmation message not found."); return; }
        vibeButton.disabled = true; vibeButton.textContent = '...'; vibeButton.classList.remove('vibe-button-active', 'vibe-button-countdown');
        console.log("[VIBE CLICK DEBUG] Button disabled, text set to '...'.");
        try {
            console.log("[VIBE CLICK DEBUG] Sending POST /api/vibes...");
            const response = await fetch('/api/vibes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), credentials: 'include' });
            console.log("[VIBE CLICK DEBUG] /api/vibes response status:", response.status);
            let result; try { result = await response.json(); } catch (e) { result = { message: "Invalid server response."}; }
            console.log("[VIBE CLICK DEBUG] /api/vibes response data:", result);
            if (response.ok) {
                console.log("[VIBE CLICK DEBUG] Vibe push OK. Updating UI...");
                updateVibeButtonState(result.nextAvailableTimestamp); console.log("[VIBE CLICK DEBUG] updateVibeButtonState called immediately.");
                confirmationMessage.textContent = result.message || 'Vibe Pushed! Thank you!'; confirmationMessage.className = 'message success'; confirmationMessage.classList.remove('hidden'); setTimeout(() => { if(confirmationMessage) confirmationMessage.classList.add('hidden'); }, 4000);
                console.log("[VIBE CLICK DEBUG] Calling checkSession to refresh ALL UI data...");
                await checkSession(); // This re-fetches status and triggers full UI update via loadAppData
                console.log("[VIBE CLICK DEBUG] checkSession call finished after vibe push.");
            } else if (response.status === 429) {
                console.log("[VIBE CLICK DEBUG] Vibe push returned 429 (Already pushed).");
                confirmationMessage.textContent = result.message || "Already pushed this week!"; confirmationMessage.className = 'message error'; confirmationMessage.classList.remove('hidden'); setTimeout(() => { if(confirmationMessage) confirmationMessage.classList.add('hidden'); }, 4000);
                updateVibeButtonState(result.nextAvailableTimestamp); console.log("[VIBE CLICK DEBUG] updateVibeButtonState call finished after 429.");
            } else {
                console.error("[VIBE CLICK DEBUG] Vibe push failed with status:", response.status);
                confirmationMessage.textContent = result.message || `Error: ${response.status}`; confirmationMessage.className = 'message error'; confirmationMessage.classList.remove('hidden'); setTimeout(() => { if(confirmationMessage) confirmationMessage.classList.add('hidden'); }, 4000);
                const currentVibeButton = document.getElementById('vibe-button'); if(currentVibeButton) { currentVibeButton.disabled = false; setButtonStyleActive(currentVibeButton); }
            }
        } catch (error) {
            console.error('[VIBE CLICK DEBUG] Network error recording vibe:', error);
            if(confirmationMessage) { confirmationMessage.textContent = 'Network error. Please try again.'; confirmationMessage.className = 'message error'; confirmationMessage.classList.remove('hidden'); setTimeout(() => { if(confirmationMessage) confirmationMessage.classList.add('hidden'); }, 4000); }
            const currentVibeButton = document.getElementById('vibe-button'); if(currentVibeButton) { currentVibeButton.disabled = false; setButtonStyleActive(currentVibeButton); }
        }
    }
    async function handleContactFormSubmit(event) {
        event.preventDefault();
        console.log("[CONTACT FORM DEBUG] Contact form submitted.");
        const contactTextarea = document.getElementById('contact-message');
        const contactSubmitButton = document.getElementById('contact-submit-button');
        const contactFormMessage = document.getElementById('contact-form-message');

        if (!contactTextarea || !contactSubmitButton || !contactFormMessage) {
            console.error("[CONTACT FORM DEBUG] Contact form elements missing.");
            return;
        }
        const messageContent = contactTextarea.value.trim();
        if (!messageContent) {
            contactFormMessage.textContent = 'Please enter a message.';
            contactFormMessage.className = 'message error';
            contactFormMessage.classList.remove('hidden');
            return;
        }

        contactFormMessage.textContent = 'Sending...';
        contactFormMessage.className = 'message'; // Neutral style while sending
        contactFormMessage.classList.remove('hidden');
        contactSubmitButton.disabled = true;

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageContent }),
                credentials: 'include' // Send session cookie if logged in
            });
            const result = await response.json();
            console.log("[CONTACT FORM DEBUG] Contact response:", response.status, result);

            if (response.ok) {
                contactFormMessage.textContent = result.message || 'Message sent successfully!';
                contactFormMessage.className = 'message success';
                contactTextarea.value = ''; // Clear textarea on success
            } else {
                contactFormMessage.textContent = result.message || `Error: ${response.status}`;
                contactFormMessage.className = 'message error';
            }
        } catch (error) {
            console.error("[CONTACT FORM DEBUG] Contact form network error:", error);
            contactFormMessage.textContent = 'Network error. Please try again.';
            contactFormMessage.className = 'message error';
        } finally {
            contactSubmitButton.disabled = false;
            contactFormMessage.classList.remove('hidden');
            // Optionally hide the message after a few seconds
            setTimeout(() => { if(contactFormMessage) contactFormMessage.classList.add('hidden'); }, 5000);
        }
    }
    async function handleSignupSubmit(event) {
        event.preventDefault(); // *** ENSURE THIS IS PRESENT ***
        console.log("[SIGNUP DEBUG] Signup form submitted.");
        if (!signupMessageElement || !signupForm) { console.error("[SIGNUP DEBUG] Signup form elements missing."); return; }
        signupMessageElement.textContent = ''; signupMessageElement.className = 'message hidden';
        const emailInput = document.getElementById('signup-email'); const passwordInput = document.getElementById('signup-password'); const locationInput = document.getElementById('signup-location');
        const email = emailInput ? emailInput.value.trim() : ''; const password = passwordInput ? passwordInput.value : ''; const location = locationInput ? locationInput.value.trim() : '';
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) { signupMessageElement.textContent = 'Please enter a valid email address.'; signupMessageElement.className = 'message error'; signupMessageElement.classList.remove('hidden'); return; }
        if (!password || password.length < 6) { signupMessageElement.textContent = 'Password must be at least 6 characters long.'; signupMessageElement.className = 'message error'; signupMessageElement.classList.remove('hidden'); return; }
        console.log("[SIGNUP DEBUG] Sending signup request...");
        try {
            const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, location }) });
            const result = await response.json(); console.log("[SIGNUP DEBUG] Signup response:", response.status, result);
            if (response.ok) { signupMessageElement.textContent = result.message || 'Signup successful! Please log in.'; signupMessageElement.className = 'message success'; signupForm.reset(); setTimeout(showLoginForm, 1500); }
            else { signupMessageElement.textContent = result.message || `Error: ${response.status}`; signupMessageElement.className = 'message error'; }
        } catch (error) { console.error("[SIGNUP DEBUG] Signup network error:", error); signupMessageElement.textContent = 'Network error. Please try again.'; signupMessageElement.className = 'message error'; }
        finally { signupMessageElement.classList.remove('hidden'); }
    }
    async function handleLoginSubmit(event) {
        event.preventDefault(); // *** ENSURE THIS IS PRESENT ***
        console.log("[LOGIN DEBUG] Login form submitted.");
        if (!loginMessageElement || !loginForm) { console.error("[LOGIN DEBUG] Login form elements missing."); return; }
        loginMessageElement.textContent = ''; loginMessageElement.className = 'message hidden';
        const emailInput = document.getElementById('login-email'); const passwordInput = document.getElementById('login-password');
        const email = emailInput ? emailInput.value.trim() : ''; const password = passwordInput ? passwordInput.value : '';
        if (!email || !password) { loginMessageElement.textContent = 'Please enter both email and password.'; loginMessageElement.className = 'message error'; loginMessageElement.classList.remove('hidden'); return; }
        console.log("[LOGIN DEBUG] Sending login request...");
        try {
            const loginResponse = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), credentials: 'include' });
            const loginResult = await loginResponse.json(); console.log("[LOGIN DEBUG] Login response:", loginResponse.status, loginResult);
            if (loginResponse.ok) {
                loginForm.reset();
                console.log("[LOGIN DEBUG] Login API success. Calling checkSession to load app data...");
                await checkSession(); // Load app data after successful login
            } else {
                loginMessageElement.textContent = loginResult.message || `Login failed (Error: ${loginResponse.status})`;
                loginMessageElement.className = 'message error';
            }
        } catch (error) { console.error("[LOGIN DEBUG] Login network error:", error); loginMessageElement.textContent = 'Network error. Please try again.'; loginMessageElement.className = 'message error'; }
        finally { loginMessageElement.classList.remove('hidden'); }
    }
    function handleLogout() {
        console.log("[LOGOUT DEBUG] Logout button clicked.");
        if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
        if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarkersLayer = null; isMapInitialized = false; }
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .then(res => res.json()).then(data => console.log("[LOGOUT DEBUG] Logout response:", data))
        .catch(error => console.error("[LOGOUT DEBUG] Error during logout fetch:", error))
        .finally(() => { updateLoginUI(false); }); // Show logged out UI
    }
    function handleForgotPassword(event) {
        if (event) event.preventDefault(); // *** ENSURE THIS IS PRESENT ***
        console.log("[FORM TOGGLE DEBUG] handleForgotPassword called.");
        if (loginFormContainer) loginFormContainer.classList.add('hidden');
        if (signupFormContainer) signupFormContainer.classList.add('hidden');
        if (forgotPasswordFormContainer) forgotPasswordFormContainer.classList.remove('hidden');
        if(loginMessageElement) loginMessageElement.textContent = ''; if(signupMessageElement) signupMessageElement.textContent = ''; if(forgotMessageElement) forgotMessageElement.textContent = '';
    }
    async function handleForgotPasswordSubmit(event) {
        event.preventDefault(); // *** ENSURE THIS IS PRESENT ***
        console.log("[FORGOT PW DEBUG] Forgot password form submitted.");
        if (!forgotMessageElement || !forgotPasswordForm) return;
        forgotMessageElement.textContent = ''; forgotMessageElement.className = 'message hidden';
        const emailInput = document.getElementById('forgot-email'); const email = emailInput ? emailInput.value.trim() : '';
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) { forgotMessageElement.textContent = 'Please enter a valid email address.'; forgotMessageElement.className = 'message error'; forgotMessageElement.classList.remove('hidden'); return; }
        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]'); if(submitButton) submitButton.disabled = true;
        console.log("[FORGOT PW DEBUG] Sending forgot password request...");
        try {
            const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
            const result = await response.json(); console.log("[FORGOT PW DEBUG] Forgot password response:", response.status, result);
            forgotMessageElement.textContent = result.message || 'If an account exists for this email, a reset link has been sent.'; forgotMessageElement.className = 'message success'; forgotPasswordForm.reset();
        } catch (error) { console.error("[FORGOT PW DEBUG] Forgot password network error:", error); forgotMessageElement.textContent = 'Network error. Please try again.'; forgotMessageElement.className = 'message error'; }
        finally { if(submitButton) submitButton.disabled = false; forgotMessageElement.classList.remove('hidden'); }
    }
    function showSignupForm(event) {
        if (event) event.preventDefault(); // *** ENSURE THIS IS PRESENT ***
        console.log("[FORM TOGGLE DEBUG] showSignupForm called.");
        if (loginFormContainer && signupFormContainer && forgotPasswordFormContainer) { if(loginMessageElement) loginMessageElement.textContent = ''; if(signupMessageElement) signupMessageElement.textContent = ''; if(forgotMessageElement) forgotMessageElement.textContent = ''; loginFormContainer.classList.add('hidden'); forgotPasswordFormContainer.classList.add('hidden'); signupFormContainer.classList.remove('hidden'); }
        else { console.error("Form containers not found for toggling."); }
    }
    function showLoginForm(event) {
        if (event) event.preventDefault(); // *** ENSURE THIS IS PRESENT ***
        console.log("[FORM TOGGLE DEBUG] showLoginForm called.");
        if (loginFormContainer && signupFormContainer && forgotPasswordFormContainer) { if(loginMessageElement) loginMessageElement.textContent = ''; if(signupMessageElement) signupMessageElement.textContent = ''; if(forgotMessageElement) forgotMessageElement.textContent = ''; signupFormContainer.classList.add('hidden'); forgotPasswordFormContainer.classList.add('hidden'); loginFormContainer.classList.remove('hidden'); }
        else { console.error("Form containers not found for toggling."); }
    }

    // --- Add App Event Listeners Function ---  <<<<< NEW FUNCTION DEFINITION
    /**
     * Adds event listeners to elements within the main application view.
     * Should only be called AFTER assignMainAppElements has run successfully.
     */
    function addAppEventListeners() {
        console.log("[MAIN SCRIPT] Adding main app event listeners...");

        // Get references again, or ensure they are accessible from the higher scope
        // Re-getting them here ensures they are the most current elements
        const vibeButton = document.getElementById('vibe-button');
        const logoutButton = document.getElementById('logout-button');
        const contactForm = document.getElementById('contact-form');
        // ... add any other elements within the main app that need listeners ...

        if (vibeButton) {
            // Remove existing listener first to prevent duplicates if this runs multiple times
            vibeButton.removeEventListener('click', handleVibeButtonClick);
            vibeButton.addEventListener('click', handleVibeButtonClick);
            console.log("[MAIN SCRIPT DEBUG] Vibe button listener attached.");
        } else {
            console.error("[MAIN SCRIPT DEBUG] Vibe button not found for listener attachment.");
        }

        if (logoutButton) {
            // Remove existing listener first
            logoutButton.removeEventListener('click', handleLogout);
            logoutButton.addEventListener('click', handleLogout);
            console.log("[MAIN SCRIPT DEBUG] Logout button listener attached.");
        } else {
            console.error("[MAIN SCRIPT DEBUG] Logout button not found for listener attachment.");
        }

        if (contactForm) {
            // Remove existing listener first
            contactForm.removeEventListener('submit', handleContactFormSubmit);
            contactForm.addEventListener('submit', handleContactFormSubmit);
            console.log("[MAIN SCRIPT DEBUG] Contact form listener attached.");
        } else {
            console.error("[MAIN SCRIPT DEBUG] Contact form not found for listener attachment.");
        }

        // Add other listeners for main app elements here...

        console.log("[MAIN SCRIPT] Finished adding main app event listeners.");
    }


    // --- Authentication & UI Flow ---

    /**
     * Main function to load all app data after login and update the UI.
     */
    async function loadAppData(statusData) {
        console.log("[MAIN SCRIPT] loadAppData called.");
        if (!statusData || !statusData.loggedIn) { console.error("[MAIN SCRIPT] loadAppData called without loggedIn status. Aborting."); updateLoginUI(false); return; }

        // Show main app, hide account area
        if(mainAppContent) mainAppContent.classList.remove('hidden');
        if(accountAreaWrapper) accountAreaWrapper.classList.add('hidden');

        // Assign elements *before* trying to update anything
        if (!assignMainAppElements()) { console.error("[MAIN SCRIPT] Failed to assign main app elements in loadAppData."); return; }

        // Add listeners for the main app elements  <<<<< CALL TO THE NEW FUNCTION
        addAppEventListeners();

        // Initialize map
        initializeMap(); // Safe to call multiple times due to flag

        // Update static elements
        const userEmailDisplay = document.getElementById('user-email-display');
        const userStatusElement = document.getElementById('user-status');
        if (userStatusElement) userStatusElement.classList.remove('hidden');
        if (userEmailDisplay) userEmailDisplay.textContent = statusData.email || '';

        // Update dynamic elements based on initial status data
        updateGamificationUI(statusData.currentStreak, statusData.badges, statusData.nextBadgeName, statusData.nextBadgeProgress);
        updateVibeButtonState(statusData.lastVibeTimestamp); // Set initial button state

        // Set initial loading states for theme/stats
        updateThemeUI(null);
        updateStatsUI(null);

        // Fetch dynamic data concurrently
        console.log("[MAIN SCRIPT] Fetching theme and stats data concurrently...");
        const [themeResult, statsResult] = await Promise.allSettled([
            fetchThemeData(),
            fetchStatsData()
            // Map data is fetched within initializeMap/fetchAndDisplayMapData
        ]);
        console.log("[MAIN SCRIPT] Theme and stats fetches completed.");

        // Update UI with fetched data
        updateThemeUI(themeResult.status === 'fulfilled' ? themeResult.value : null);
        updateStatsUI(statsResult.status === 'fulfilled' ? statsResult.value : null);

        console.log("[MAIN SCRIPT] loadAppData finished.");
    }

    /**
     * Updates the overall UI state based on login status.
     */
    function updateLoginUI(isLoggedIn, email = '', lastVibeTimestampISO = null, streak = 0, badges = [], nextBadgeName = '', nextBadgeProgress = 0) {
        console.log(`[UI DEBUG] updateLoginUI called. isLoggedIn: ${isLoggedIn}, email: ${email}, streak: ${streak}`);
        if (isLoggedIn) {
            // Call loadAppData to handle showing UI and fetching data
                const initialStatusData = { loggedIn: true, email, lastVibeTimestamp: lastVibeTimestampISO, currentStreak: streak, badges, nextBadgeName, nextBadgeProgress };
                loadAppData(initialStatusData); // Pass initial data to avoid extra status fetch here
        } else {
            // Logout Cleanup
            console.log("[UI DEBUG] Handling logout state.");
            if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
            if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarkersLayer = null; isMapInitialized = false; }

            if(mainAppContent) mainAppContent.classList.add('hidden');
            if(accountAreaWrapper) accountAreaWrapper.classList.remove('hidden');

            // Ensure user status is hidden on logout
            const userStatusElement = document.getElementById('user-status');
            if (userStatusElement) userStatusElement.classList.add('hidden');

            // Reset to show login form by default on logout
            if (loginFormContainer) loginFormContainer.classList.remove('hidden');
            if (signupFormContainer) signupFormContainer.classList.add('hidden');
            if (forgotPasswordFormContainer) forgotPasswordFormContainer.classList.add('hidden');

            // Clear any messages on login/signup forms
            if (loginMessageElement) loginMessageElement.textContent = '';
            if (signupMessageElement) signupMessageElement.textContent = '';
            if (forgotMessageElement) forgotMessageElement.textContent = '';

            // No need to reset inner elements if mainAppContent is hidden
        }
    }


    /**
     * Checks the user's session status on page load and updates UI.
     */
    async function checkSession() {
        console.log("[MAIN SCRIPT] checkSession called for initial load or refresh.");
        const statusData = await fetchStatusData(); // Fetch status first
        // Call updateLoginUI with the fetched status data
        updateLoginUI(
            statusData.loggedIn, statusData.email, statusData.lastVibeTimestamp,
            statusData.currentStreak, statusData.badges, statusData.nextBadgeName,
            statusData.nextBadgeProgress
        );
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