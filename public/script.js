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
    let weeklyThemeElement, suggestionsListElement, vibeButton, confirmationMessage,
        weeklyCounterElement, totalCounterElement, userStatusElement,
        userEmailDisplay, logoutButton, buttonInstructionElement, streakCounterElement,
        badgesListElement, progressBarInnerElement, nextBadgeTextElement,
        contactForm, contactTextarea, contactSubmitButton, contactFormMessage;

    // Map Variables
    let mapInstance = null;
    let mapMarkersLayer = null;
    let isMapInitialized = false; // Flag to prevent multiple initializations

    // Timer variable
    let countdownIntervalId = null;

    // --- Helper Functions ---
    function getStartOfWeekUTC(date) {
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1);
        const weekStart = new Date(d.setUTCDate(diff));
        return weekStart;
     }
    function getNextWeekStartUTC(date) {
        const currentWeekStart = getStartOfWeekUTC(date);
        const nextWeekStartDate = new Date(currentWeekStart);
        nextWeekStartDate.setUTCDate(currentWeekStart.getUTCDate() + 7);
        return nextWeekStartDate;
    }

    /**
     * Assigns references to the main application elements after they become visible.
     * Should only be called *after* successful login. Returns true if successful.
     */
    function assignMainAppElements() {
        console.log("[MAIN SCRIPT] Assigning main app elements (post-login)...");
        try {
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
            if (!weeklyThemeElement || !suggestionsListElement || !vibeButton || !weeklyCounterElement || !totalCounterElement || !streakCounterElement) {
                 console.error("[MAIN SCRIPT] Failed to find one or more essential main app elements!");
                 return false; // Indicate failure
            }

            // Ensure contact message element exists if form exists
            if (contactForm && !contactFormMessage) {
                 console.warn("Contact form message element missing, creating dynamically.");
                 contactFormMessage = document.createElement('p');
                 contactFormMessage.id = 'contact-form-message';
                 contactFormMessage.className = 'message hidden';
                 if(contactSubmitButton) {
                    contactForm.insertBefore(contactFormMessage, contactSubmitButton);
                 } else {
                    contactForm.appendChild(contactFormMessage);
                 }
            }
            console.log("[MAIN SCRIPT] Finished assigning main app elements successfully.");
            return true; // Indicate success
        } catch (error) {
             console.error("[MAIN SCRIPT] Error during assignMainAppElements:", error);
             return false; // Indicate failure
        }
    }

    /**
     * Adds event listeners to the main application elements (called after login).
     */
    function addAppEventListeners() {
        console.log("[MAIN SCRIPT] Adding app event listeners (post-login)...");
        try {
            if (vibeButton) {
                vibeButton.removeEventListener('click', handleVibeButtonClick); // Prevent duplicates
                vibeButton.addEventListener('click', handleVibeButtonClick);
                console.log("[MAIN SCRIPT] Vibe button listener attached.");
            } else { console.error("[MAIN SCRIPT] Vibe button not found for listener."); }

            if (logoutButton) {
                logoutButton.removeEventListener('click', handleLogout); // Prevent duplicates
                logoutButton.addEventListener('click', handleLogout);
                 console.log("[MAIN SCRIPT DEBUG] Logout button listener attached.");
            } else { console.error("[MAIN SCRIPT DEBUG] Logout button not found for listener."); }

            if (contactForm) {
                contactForm.removeEventListener('submit', handleContactFormSubmit); // Prevent duplicates
                contactForm.addEventListener('submit', handleContactFormSubmit);
                 console.log("[MAIN SCRIPT DEBUG] Contact form listener attached.");
            } else { console.error("[MAIN SCRIPT DEBUG] Contact form not found for listener."); }
            console.log("[MAIN SCRIPT] Finished adding app event listeners.");
        } catch (error) {
             console.error("[MAIN SCRIPT] Error during addAppEventListeners:", error);
        }
    }

    // --- Map Functions ---
    /**
     * Initializes the Leaflet map.
     */
    function initializeMap() {
        // Prevent multiple initializations
        if (isMapInitialized) {
             console.log("[MAP DEBUG] Map already initialized or initialization in progress.");
             return;
        }
        isMapInitialized = true; // Set flag immediately
        console.log("[MAP DEBUG] Initializing map...");

        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error("[MAP DEBUG] Map container element (#map) not found.");
            isMapInitialized = false; // Reset flag on failure
            return;
        }

        try {
            // Only create map if it doesn't exist
            if (!mapInstance) {
                 mapInstance = L.map('map').setView([20, 0], 2); // Center view, zoom level 2
                 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                     maxZoom: 18,
                     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                 }).addTo(mapInstance);
                 mapMarkersLayer = L.layerGroup().addTo(mapInstance);
                 console.log("[MAP DEBUG] Leaflet map instance created.");
            } else {
                 console.log("[MAP DEBUG] Map instance already exists, skipping creation.");
            }
            fetchAndDisplayMapData(); // Fetch data (will clear existing markers)
        } catch (error) {
            console.error("[MAP DEBUG] Error initializing Leaflet map:", error);
            if(mapElement) mapElement.innerHTML = "<p>Error loading map.</p>";
            isMapInitialized = false; // Reset flag on failure
            mapInstance = null; // Ensure instance is null on error
            mapMarkersLayer = null;
        }
    }

    /**
     * Attempts to get latitude/longitude for a location string using Nominatim API.
     */
    async function geocodeLocation(locationString) {
        if (!locationString) return null;
        const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationString)}&format=json&limit=1&addressdetails=0`;
        // console.log(`Geocoding: ${locationString}`);
        try {
            const response = await fetch(apiUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
            if (!response.ok) {
                console.error(`[GEOCODE] Nominatim API error for "${locationString}": ${response.status}`);
                return null;
            }
            const data = await response.json();
            if (data && data.length > 0) {
                const result = data[0];
                // console.log(`[GEOCODE] Geocoded "${locationString}" to:`, { lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
                return { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
            } else {
                console.warn(`[GEOCODE] No geocoding results found for "${locationString}"`);
                return null;
            }
        } catch (error) {
            console.error(`[GEOCODE] Error during geocoding fetch for "${locationString}":`, error);
            return null;
        }
     }

    /**
     * Fetches map data from the backend and adds markers/circles.
     */
    async function fetchAndDisplayMapData() {
        if (!mapInstance || !mapMarkersLayer) {
            console.warn("[MAP DEBUG] Map not initialized, cannot display data.");
            return;
        }
        console.log("[MAP DEBUG] Fetching map data...");

        try {
            const response = await fetch('/api/map-data');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const mapData = await response.json();
            console.log("[MAP DEBUG] Map data received:", mapData);

            mapMarkersLayer.clearLayers();
            console.log("[MAP DEBUG] Cleared previous markers.");

            console.log("[MAP DEBUG] Processing map data items for geocoding...");
            // Use Promise.allSettled to handle geocoding concurrently but wait for all
            const geocodePromises = mapData.map(item => {
                if (item && item.location && item.count > 0) {
                    return geocodeLocation(item.location).then(coords => ({ ...item, coords })); // Add coords to item
                }
                return Promise.resolve(null); // Skip invalid items
            });

            const results = await Promise.allSettled(geocodePromises);
            console.log("[MAP DEBUG] Geocoding results settled.");

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value && result.value.coords) {
                    const item = result.value;
                    const locationString = item.location;
                    const count = item.count;
                    const coords = item.coords;

                    // console.log(`[MAP DEBUG] Plotting for ${locationString}:`, coords);
                    const jitterLat = (Math.random() - 0.5) * 0.01;
                    const jitterLon = (Math.random() - 0.5) * 0.01;
                    const finalLat = coords.lat + jitterLat;
                    const finalLon = coords.lon + jitterLon;
                    const radius = Math.sqrt(count) * 50000;
                    const finalRadius = Math.max(radius, 20000);

                    try {
                        L.circle([finalLat, finalLon], {
                            color: '#28a745', fillColor: '#28a745',
                            fillOpacity: 0.4, radius: finalRadius
                        })
                        .bindPopup(`<b>${locationString}</b><br>${count} Vibes`)
                        .addTo(mapMarkersLayer);
                        // console.log(`[MAP DEBUG] Added circle for ${locationString}`);
                    } catch (circleError) {
                         console.error(`[MAP DEBUG] Error adding circle for ${locationString}:`, circleError);
                    }
                } else if (result.status === 'fulfilled' && result.value) {
                     console.warn(`[MAP DEBUG] Could not geocode location: "${result.value.location}"`);
                } else if (result.status === 'rejected') {
                     console.error("[MAP DEBUG] Geocoding promise rejected:", result.reason);
                }
            });
            console.log("[MAP DEBUG] Finished processing map data items.");

        } catch (error) {
            console.error("[MAP DEBUG] Failed to fetch or display map data:", error);
            const mapElement = document.getElementById('map');
            if(mapElement) {
                mapElement.innerHTML = `<p style="padding: 10px; color: red;">Error loading map data: ${error.message}</p>`;
            }
        }
     }


    // --- Core Application Logic ---

    /**
     * Fetches and updates the weekly and total vibe counters.
     */
    async function fetchAndUpdateStats() {
        console.log("[STATS DEBUG] fetchAndUpdateStats called.");
        // Ensure elements are assigned (might not be if called before login completes)
        if (!weeklyCounterElement || !totalCounterElement) {
             if(!assignMainAppElements()) { // Try assigning again
                 console.error("[STATS DEBUG] Counter elements not found even after re-assign attempt.");
                 return;
             }
        }
        try {
            console.log("[STATS DEBUG] Fetching /api/stats...");
            const response = await fetch('/api/stats', { credentials: 'include' });
            console.log("[STATS DEBUG] /api/stats response status:", response.status);
            if (response.ok) {
                const stats = await response.json();
                console.log("[STATS DEBUG] Stats received:", stats);
                weeklyCounterElement.textContent = stats.weeklyVibes ?? 0;
                totalCounterElement.textContent = stats.totalVibes ?? 0;
                console.log("[STATS DEBUG] Counters updated in UI.");
            } else {
                console.error("[STATS DEBUG] Error fetching stats:", response.status);
                weeklyCounterElement.textContent = 'Err';
                totalCounterElement.textContent = 'Err';
            }
        } catch (error) {
            console.error("[STATS DEBUG] Network error fetching stats:", error);
            if (weeklyCounterElement) weeklyCounterElement.textContent = 'Err';
            if (totalCounterElement) totalCounterElement.textContent = 'Err';
        }
    }

    /**
     * Displays the weekly theme and suggestions by fetching from the backend.
     */
    async function displayWeeklyInfo() {
        console.log("[THEME DEBUG] displayWeeklyInfo called.");
        // Ensure elements are assigned
        if (!weeklyThemeElement || !suggestionsListElement) {
             if(!assignMainAppElements()) {
                 console.error("[THEME DEBUG] Theme/suggestion elements not found even after re-assign attempt.");
                 return;
             }
        }

        weeklyThemeElement.textContent = 'Loading theme...';
        suggestionsListElement.innerHTML = '<li>Loading suggestions...</li>';
        console.log("[THEME DEBUG] Set loading state.");

        try {
            console.log("[THEME DEBUG] Fetching /api/theme/current...");
            const response = await fetch('/api/theme/current');
            console.log("[THEME DEBUG] /api/theme/current response status:", response.status);

            if (!response.ok) {
                let errorData; try { errorData = await response.json(); } catch { /* ignore */ }
                const errorMsg = errorData?.theme || `HTTP error! status: ${response.status}`;
                console.error("[THEME DEBUG] Fetch error:", errorMsg);
                throw new Error(errorMsg);
            }
            const weeklyData = await response.json();
            console.log("[THEME DEBUG] Raw weekly theme data received:", weeklyData);

            if (weeklyData && weeklyData.theme) {
                weeklyThemeElement.textContent = weeklyData.theme;
                suggestionsListElement.innerHTML = ''; // Clear loading/previous

                if (weeklyData.suggestions && weeklyData.suggestions.length > 0) {
                    const shuffled = [...weeklyData.suggestions].sort(() => 0.5 - Math.random());
                    shuffled.slice(0, 3).forEach(suggestion => {
                        const li = document.createElement('li');
                        li.textContent = suggestion;
                        suggestionsListElement.appendChild(li);
                    });
                    console.log("[THEME DEBUG] Suggestions displayed.");
                } else {
                    suggestionsListElement.innerHTML = '<li>No specific suggestions this week. Focus on the theme!</li>';
                    console.log("[THEME DEBUG] No suggestions to display.");
                }
            } else {
                 console.error("[THEME DEBUG] Received OK response but theme data is missing or invalid:", weeklyData);
                 throw new Error("Received invalid theme data from server.");
            }
        } catch (error) {
            console.error("[THEME DEBUG] Failed to fetch or display weekly info:", error);
            if (weeklyThemeElement) weeklyThemeElement.textContent = 'Theme Unavailable';
            if (suggestionsListElement) suggestionsListElement.innerHTML = `<li>Could not load suggestions. ${error.message || ''}</li>`;
        }
    }

    /**
     * Handles the click event for the vibe button.
     */
    async function handleVibeButtonClick() {
        console.log("[VIBE CLICK DEBUG] handleVibeButtonClick called.");
        if (!vibeButton || !confirmationMessage) {
             // Try assigning elements again just in case they weren't ready before
             if (!assignMainAppElements()) {
                 console.error("[VIBE CLICK DEBUG] Vibe button or confirmation message not found.");
                 return;
             }
        }

        vibeButton.disabled = true;
        vibeButton.textContent = '...';
        vibeButton.classList.remove('vibe-button-active', 'vibe-button-countdown');
        console.log("[VIBE CLICK DEBUG] Button disabled, text set to '...'.");

        try {
            console.log("[VIBE CLICK DEBUG] Sending POST /api/vibes...");
            const response = await fetch('/api/vibes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), credentials: 'include' });
            console.log("[VIBE CLICK DEBUG] /api/vibes response status:", response.status);
            let result; try { result = await response.json(); } catch (e) { result = { message: "Invalid server response."}; }
            console.log("[VIBE CLICK DEBUG] /api/vibes response data:", result);

            if (response.ok) {
                console.log("[VIBE CLICK DEBUG] Vibe push OK. Updating UI...");
                // Don't wait for stats/map to update button state
                updateVibeButtonState(result.nextAvailableTimestamp);
                console.log("[VIBE CLICK DEBUG] updateVibeButtonState called.");

                // Show confirmation immediately
                confirmationMessage.textContent = result.message || 'Vibe Pushed! Thank you!';
                confirmationMessage.className = 'message success';
                confirmationMessage.classList.remove('hidden');
                setTimeout(() => { confirmationMessage.classList.add('hidden'); }, 4000);

                // Update other things asynchronously
                fetchAndUpdateStats();
                fetchAndDisplayMapData();
                console.log("[VIBE CLICK DEBUG] Calling checkSession to refresh status...");
                await checkSession(); // Re-fetch status for streak/badges
                console.log("[VIBE CLICK DEBUG] checkSession call finished after vibe push.");

            } else if (response.status === 429) {
                 console.log("[VIBE CLICK DEBUG] Vibe push returned 429 (Already pushed).");
                 confirmationMessage.textContent = result.message || "Already pushed this week!";
                 confirmationMessage.className = 'message error';
                 confirmationMessage.classList.remove('hidden');
                 setTimeout(() => { confirmationMessage.classList.add('hidden'); }, 4000);
                 console.log("[VIBE CLICK DEBUG] Calling updateVibeButtonState with (from 429):", result.nextAvailableTimestamp);
                 updateVibeButtonState(result.nextAvailableTimestamp); // Still update button timer
                 console.log("[VIBE CLICK DEBUG] updateVibeButtonState call finished after 429.");
            } else {
                console.error("[VIBE CLICK DEBUG] Vibe push failed with status:", response.status);
                confirmationMessage.textContent = result.message || `Error: ${response.status}`;
                confirmationMessage.className = 'message error';
                confirmationMessage.classList.remove('hidden');
                setTimeout(() => { confirmationMessage.classList.add('hidden'); }, 4000);
                 vibeButton.disabled = false;
                 setButtonStyleActive(vibeButton);
            }
        } catch (error) {
            console.error('[VIBE CLICK DEBUG] Network error recording vibe:', error);
            confirmationMessage.textContent = 'Network error. Please try again.';
            confirmationMessage.className = 'message error';
            confirmationMessage.classList.remove('hidden');
            setTimeout(() => { confirmationMessage.classList.add('hidden'); }, 4000);
            if(vibeButton) { // Check if button exists before enabling
                 vibeButton.disabled = false;
                 setButtonStyleActive(vibeButton);
            }
        }
    }

    /**
     * Sets the CSS class and instruction text for the vibe button when it's active (showing 'P').
     */
    function setButtonStyleActive(button) {
        // console.log("[UI DEBUG] Setting button style to ACTIVE");
        if (!button) return;
        button.classList.remove('vibe-button-countdown');
        button.classList.add('vibe-button-active');
        button.textContent = 'P';
        button.title = "Push to spread a positive vibe!";
        if (buttonInstructionElement) {
            buttonInstructionElement.innerHTML = "Make sure to spread some Positive Vibes around first<br>then when ready... Push that P!";
        }
     }
    /**
     * Sets the CSS class and instruction text for the vibe button when it's in countdown mode.
     */
    function setButtonStyleCountdown(button) {
        // console.log("[UI DEBUG] Setting button style to COUNTDOWN");
        if (!button) return;
        button.classList.remove('vibe-button-active');
        button.classList.add('vibe-button-countdown');
        if (buttonInstructionElement) {
            buttonInstructionElement.textContent = "You are awesome, continue to spread positive vibes everyday, and next week we meet again.";
        }
     }
    /**
     * Updates the state and style class of the vibe button (enabled/disabled, text/countdown).
     */
    function updateVibeButtonState(timestampISO) {
        console.log("[UI DEBUG] updateVibeButtonState called with timestamp:", timestampISO);
        if (!vibeButton) { console.error("[UI DEBUG] Vibe button not found in updateVibeButtonState."); return; }
        if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
        const now = new Date();
        const nowTime = now.getTime();
        const startOfThisWeek = getStartOfWeekUTC(now);
        let canPushVibe = true;
        let targetCountdownTime = getNextWeekStartUTC(now);
        if (timestampISO) {
            try {
                const receivedDate = new Date(timestampISO);
                const receivedTime = receivedDate.getTime();
                if (isNaN(receivedTime)) throw new Error("Invalid date value received");
                if (receivedTime <= nowTime) {
                    const lastVibeTime = receivedDate;
                    if (lastVibeTime >= startOfThisWeek) {
                        canPushVibe = false;
                        targetCountdownTime = getNextWeekStartUTC(lastVibeTime);
                    } else { canPushVibe = true; }
                } else {
                    canPushVibe = false;
                    targetCountdownTime = receivedDate;
                }
                 if (!canPushVibe && targetCountdownTime <= now) {
                     console.warn("[UI DEBUG] updateVibeButtonState: Next available time is in the past, allowing push.");
                     canPushVibe = true;
                 }
            } catch (e) {
                console.error("[UI DEBUG] updateVibeButtonState: Error processing timestampISO:", timestampISO, e);
                canPushVibe = true;
            }
        }
        if (canPushVibe) {
            console.log("[UI DEBUG] updateVibeButtonState: Setting button ACTIVE.");
            vibeButton.disabled = false;
            setButtonStyleActive(vibeButton);
        } else {
             console.log("[UI DEBUG] updateVibeButtonState: Setting button COUNTDOWN. Target:", targetCountdownTime.toISOString());
            vibeButton.disabled = true;
            setButtonStyleCountdown(vibeButton);
            startCountdown(targetCountdownTime);
        }
     }
    /**
     * Starts a countdown timer displayed on the vibe button.
     */
    function startCountdown(targetDate) {
        console.log(`[UI DEBUG] startCountdown called. Target:`, targetDate);
        if (!vibeButton) { console.error("[UI DEBUG] Vibe button not found in startCountdown."); return; }
        let targetDateObj;
        try {
            targetDateObj = (targetDate instanceof Date) ? targetDate : new Date(targetDate);
            if (isNaN(targetDateObj.getTime())) throw new Error("Invalid date value");
        } catch (e) {
             console.error("[UI DEBUG] startCountdown: Invalid targetDate:", targetDate, e);
             if (countdownIntervalId) clearInterval(countdownIntervalId);
             countdownIntervalId = null;
             updateVibeButtonState(null);
             return;
        }
        console.log(`[UI DEBUG] startCountdown: Parsed targetDateObj: ${targetDateObj.toISOString()}`);

        function updateTimer() {
            const now = new Date().getTime();
            const targetTime = targetDateObj.getTime();
            const distance = targetTime - now;
            if (distance <= 0) {
                if (countdownIntervalId) clearInterval(countdownIntervalId);
                countdownIntervalId = null;
                console.log("[UI DEBUG] Countdown finished.");
                if(vibeButton) { // Check again before updating
                    vibeButton.disabled = false;
                    setButtonStyleActive(vibeButton);
                }
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            let countdownText = '';
            if (days > 0) countdownText += `${days}d `;
            if (days > 0 || hours > 0) countdownText += `${hours}h `;
            if (days === 0 && hours === 0) { countdownText = `${minutes}m`; }
            else if (days === 0) { countdownText += `${minutes}m`; }
            if (countdownText.trim() === '' && distance > 0) countdownText = `Soon...`;

            // Ensure button still exists before updating text
            if(vibeButton) {
                vibeButton.textContent = countdownText.trim();
                try { vibeButton.title = `Available ~ ${targetDateObj.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: 'numeric' })}`; }
                catch { vibeButton.title = `Available soon`; }
            } else {
                 // If button disappeared (e.g., user logged out), clear interval
                 if (countdownIntervalId) clearInterval(countdownIntervalId);
                 countdownIntervalId = null;
            }
        }
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        setButtonStyleCountdown(vibeButton); // Ensure style is set
        updateTimer(); // Initial call
        countdownIntervalId = setInterval(updateTimer, 60000); // Update every minute
        console.log("[UI DEBUG] startCountdown: Interval started.");
     }
    /**
     * Handles the submission of the contact form.
     */
    async function handleContactFormSubmit(event) { /* ... unchanged ... */ }

    // --- Authentication & UI Flow ---

    /**
     * Updates the UI based on the user's login status.
     */
    function updateLoginUI(isLoggedIn, email = '', lastVibeTimestampISO = null, streak = 0, badges = [], nextBadgeName = '', nextBadgeProgress = 0) {
        console.log(`[UI DEBUG] updateLoginUI called. isLoggedIn: ${isLoggedIn}, email: ${email}, streak: ${streak}`);
        if (isLoggedIn) {
            if(mainAppContent) mainAppContent.classList.remove('hidden');
            if(accountAreaWrapper) accountAreaWrapper.classList.add('hidden');

            // Try assigning elements *before* using them
            if (!assignMainAppElements()) {
                 console.error("[UI DEBUG] Failed to assign main app elements in updateLoginUI. Aborting UI update.");
                 // Maybe show a generic error to the user?
                 return;
            }
            addAppEventListeners();
            initializeMap();

            if (userStatusElement) userStatusElement.classList.remove('hidden');
            if (userEmailDisplay) userEmailDisplay.textContent = email;

            // Update Gamification
            if (streakCounterElement) {
                console.log(`[UI DEBUG] Updating streak display from ${streakCounterElement.textContent} to ${streak}`);
                streakCounterElement.textContent = streak;
            } else { console.warn("[UI DEBUG] Streak counter element not found."); }
            if (badgesListElement) {
                badgesListElement.innerHTML = '';
                if (badges && badges.length > 0) {
                    badges.forEach(badgeName => {
                        const badgeEl = document.createElement('span');
                        badgeEl.classList.add('badge-item');
                        badgeEl.textContent = badgeName;
                        badgeEl.title = badgeName;
                        badgesListElement.appendChild(badgeEl);
                     });
                    console.log(`[UI DEBUG] Displayed ${badges.length} badges.`);
                } else {
                    badgesListElement.innerHTML = '<span class="no-badges">Keep spreading vibes to earn badges!</span>';
                    console.log(`[UI DEBUG] No badges to display.`);
                }
            } else { console.warn("[UI DEBUG] Badges list element not found."); }
            if (progressBarInnerElement && nextBadgeTextElement) {
                console.log(`[UI DEBUG] Updating progress bar to ${nextBadgeProgress}%. Next: ${nextBadgeName}`);
                const progressPercent = Math.max(0, Math.min(100, nextBadgeProgress));
                progressBarInnerElement.style.width = `${progressPercent}%`;
                progressBarInnerElement.setAttribute('aria-valuenow', progressPercent);
                progressBarInnerElement.textContent = `${progressPercent}%`;
                nextBadgeTextElement.textContent = `Next: ${nextBadgeName || 'N/A'}`;
            } else { console.warn("[UI DEBUG] Progress bar elements not found."); }
            console.log("[UI DEBUG] Finished updating gamification elements.");

            // Fetch initial data (Theme and Stats)
            // Use Promise.all to fetch concurrently
            Promise.all([displayWeeklyInfo(), fetchAndUpdateStats()])
                .catch(err => console.error("[UI DEBUG] Error during initial data fetch:", err))
                .finally(() => {
                     // Set button state *after* initial fetches attempt to complete
                     console.log("[UI DEBUG] Setting initial button state after theme/stats fetch attempt.");
                     updateVibeButtonState(lastVibeTimestampISO);
                });

        } else {
            // Logout Cleanup
            console.log("[UI DEBUG] Handling logout state.");
            if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
            if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarkersLayer = null; isMapInitialized = false; } // Reset map flag

            if(mainAppContent) mainAppContent.classList.add('hidden');
            if(accountAreaWrapper) accountAreaWrapper.classList.remove('hidden');

            if (userStatusElement) userStatusElement.classList.add('hidden');
            if (loginFormContainer) loginFormContainer.classList.remove('hidden');
            if (signupFormContainer) signupFormContainer.classList.add('hidden');
            if (forgotPasswordFormContainer) forgotPasswordFormContainer.classList.add('hidden');

            // No need to reset inner elements if mainAppContent is hidden
        }
    }

    /**
     * Handles the signup form submission.
     */
    async function handleSignupSubmit(event) {
        event.preventDefault();
        console.log("[SIGNUP DEBUG] Signup form submitted.");
        if (!signupMessageElement || !signupForm) { console.error("[SIGNUP DEBUG] Signup form elements missing."); return; }
        signupMessageElement.textContent = '';
        signupMessageElement.className = 'message hidden';
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const locationInput = document.getElementById('signup-location');
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        const location = locationInput ? locationInput.value.trim() : '';
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) { signupMessageElement.textContent = 'Please enter a valid email address.'; signupMessageElement.className = 'message error'; signupMessageElement.classList.remove('hidden'); return; }
        if (!password || password.length < 6) { signupMessageElement.textContent = 'Password must be at least 6 characters long.'; signupMessageElement.className = 'message error'; signupMessageElement.classList.remove('hidden'); return; }
        console.log("[SIGNUP DEBUG] Sending signup request...");
        try {
            const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, location }) });
            const result = await response.json();
             console.log("[SIGNUP DEBUG] Signup response:", response.status, result);
            if (response.ok) { signupMessageElement.textContent = result.message || 'Signup successful! Please log in.'; signupMessageElement.className = 'message success'; signupForm.reset(); setTimeout(showLoginForm, 1500); }
            else { signupMessageElement.textContent = result.message || `Error: ${response.status}`; signupMessageElement.className = 'message error'; }
        } catch (error) { console.error("[SIGNUP DEBUG] Signup network error:", error); signupMessageElement.textContent = 'Network error. Please try again.'; signupMessageElement.className = 'message error'; }
        finally { signupMessageElement.classList.remove('hidden'); }
     }

    /**
     * Handles the login form submission.
     */
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
            if (loginResponse.ok) { loginForm.reset(); await checkSession(); }
            else { loginMessageElement.textContent = loginResult.message || `Login failed (Error: ${loginResponse.status})`; loginMessageElement.className = 'message error'; updateLoginUI(false); }
        } catch (error) { console.error("[LOGIN DEBUG] Login network error:", error); loginMessageElement.textContent = 'Network error. Please try again.'; loginMessageElement.className = 'message error'; updateLoginUI(false); }
        finally { loginMessageElement.classList.remove('hidden'); }
     }

    /**
     * Handles the logout button click.
     */
    function handleLogout() {
        console.log("[LOGOUT DEBUG] Logout button clicked.");
         if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .then(res => res.json())
        .then(data => console.log("[LOGOUT DEBUG] Logout response:", data))
        .catch(error => console.error("[LOGOUT DEBUG] Error during logout fetch:", error))
        .finally(() => { updateLoginUI(false); });
     }

    /**
	* Shows the forgot password form.
     */
    function handleForgotPassword(event) {
        if (event) event.preventDefault();
        console.log("[FORM TOGGLE DEBUG] handleForgotPassword called.");
        if (loginFormContainer) loginFormContainer.classList.add('hidden');
        if (signupFormContainer) signupFormContainer.classList.add('hidden');
        if (forgotPasswordFormContainer) forgotPasswordFormContainer.classList.remove('hidden');
        if(loginMessageElement) loginMessageElement.textContent = '';
        if(signupMessageElement) signupMessageElement.textContent = '';
        if(forgotMessageElement) forgotMessageElement.textContent = '';
     }

    /**
     * Handles the submission of the forgot password email request form.
     */
    async function handleForgotPasswordSubmit(event) {
        event.preventDefault();
         console.log("[FORGOT PW DEBUG] Forgot password form submitted.");
        if (!forgotMessageElement || !forgotPasswordForm) return;
        forgotMessageElement.textContent = '';
        forgotMessageElement.className = 'message hidden';
        const emailInput = document.getElementById('forgot-email');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) { forgotMessageElement.textContent = 'Please enter a valid email address.'; forgotMessageElement.className = 'message error'; forgotMessageElement.classList.remove('hidden'); return; }
        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;
        console.log("[FORGOT PW DEBUG] Sending forgot password request...");
        try {
            const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
            const result = await response.json();
             console.log("[FORGOT PW DEBUG] Forgot password response:", response.status, result);
            forgotMessageElement.textContent = result.message || 'If an account exists for this email, a reset link has been sent.';
            forgotMessageElement.className = 'message success';
            forgotPasswordForm.reset();
        } catch (error) { console.error("[FORGOT PW DEBUG] Forgot password network error:", error); forgotMessageElement.textContent = 'Network error. Please try again.'; forgotMessageElement.className = 'message error'; }
        finally { if(submitButton) submitButton.disabled = false; forgotMessageElement.classList.remove('hidden'); }
     }

    /**
     * Shows the signup form and hides the login/forgot forms.
     */
    function showSignupForm(event) {
        if (event) event.preventDefault();
        console.log("[FORM TOGGLE DEBUG] showSignupForm called.");
        if (loginFormContainer && signupFormContainer && forgotPasswordFormContainer) {
            if(loginMessageElement) loginMessageElement.textContent = '';
            if(signupMessageElement) signupMessageElement.textContent = '';
			if(forgotMessageElement) forgotMessageElement.textContent = '';
            loginFormContainer.classList.add('hidden');
			forgotPasswordFormContainer.classList.add('hidden');
            signupFormContainer.classList.remove('hidden');
        } else { console.error("Form containers not found for toggling."); }
     }

    /**
	* Shows the login form and hides the signup/forgot forms.
     */
    function showLoginForm(event) {
        if (event) event.preventDefault();
         console.log("[FORM TOGGLE DEBUG] showLoginForm called.");
         if (loginFormContainer && signupFormContainer && forgotPasswordFormContainer) {
            if(loginMessageElement) loginMessageElement.textContent = '';
            if(signupMessageElement) signupMessageElement.textContent = '';
			if(forgotMessageElement) forgotMessageElement.textContent = '';
            signupFormContainer.classList.add('hidden');
			forgotPasswordFormContainer.classList.add('hidden');
            loginFormContainer.classList.remove('hidden');
        } else { console.error("Form containers not found for toggling."); }
     }

    /**
     * Checks the user's session status on page load.
     */
    async function checkSession() {
        console.log("[UI DEBUG] checkSession called.");
        try {
            const response = await fetch('/api/auth/status', { credentials: 'include' });
            if (!response.ok) {
                 console.error("Error checking session status:", response.status);
                 updateLoginUI(false); // Pass defaults
                 return;
            }
            const data = await response.json();
            console.log("[UI DEBUG] Status data received:", data);
            if (data.loggedIn) {
                console.log("[UI DEBUG] User logged in. Calling updateLoginUI...");
                // Pass all relevant data to updateLoginUI
                updateLoginUI(
                    true,
                    data.email || "",
                    data.lastVibeTimestamp,
                    data.currentStreak || 0,
                    data.badges || [],
                    data.nextBadgeName || '',
                    data.nextBadgeProgress || 0
                );
                 console.log("[UI DEBUG] updateLoginUI call finished.");
            } else {
                updateLoginUI(false); // Pass defaults
            }
        } catch (error) {
            console.error("Network error checking session:", error);
            updateLoginUI(false); // Pass defaults
        }
        console.log("[UI DEBUG] checkSession finished.");
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
    // This will call updateLoginUI if logged in, which then calls assignMainAppElements and addAppEventListeners
    checkSession();

}); // End DOMContentLoaded

console.log("[UI DEBUG] script.js: Script finished initial execution.");
