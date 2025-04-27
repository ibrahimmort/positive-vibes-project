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
                 console.error("[MAIN SCRIPT] Failed to find one or more essential main app elements!");
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
    async function fetchStatusData() { /* ... same as before ... */ }
    async function fetchThemeData() { /* ... same as before ... */ }
    async function fetchStatsData() { /* ... same as before ... */ }
    async function fetchMapData() { /* ... same as before ... */ }
    async function geocodeLocation(locationString) { /* ... same as before ... */ }


    // --- UI Update Functions ---
    function updateThemeUI(themeData) { /* ... same as before ... */ }
    function updateStatsUI(statsData) { /* ... same as before ... */ }
    function updateGamificationUI(streak = 0, badges = [], nextBadgeName = '', nextBadgeProgress = 0) { /* ... same as before ... */ }
    async function updateMapUI(mapData) { /* ... same as before ... */ }
    function setButtonStyleActive(button) { /* ... same as before ... */ }
    function setButtonStyleCountdown(button) { /* ... same as before ... */ }
    function updateVibeButtonState(timestampISO) { /* ... same as before ... */ }
    function startCountdown(targetDate) { /* ... same as before ... */ }


    // --- Map Initialization ---
    function initializeMap() {
        if (isMapInitialized) { console.log("[MAP DEBUG] Map already initialized."); return; }
        isMapInitialized = true;
        console.log("[MAP DEBUG] Initializing map...");
        const mapElement = document.getElementById('map');
        if (!mapElement) { console.error("[MAP DEBUG] Map container element (#map) not found."); isMapInitialized = false; return; }
        try {
            if (!mapInstance) {
                 mapInstance = L.map('map').setView([20, 0], 2);
                 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(mapInstance);
                 mapMarkersLayer = L.layerGroup().addTo(mapInstance);
                 console.log("[MAP DEBUG] Leaflet map instance created.");
            } else { console.log("[MAP DEBUG] Map instance already exists."); }
            fetchAndDisplayMapData(); // Fetch data
        } catch (error) { console.error("[MAP DEBUG] Error initializing Leaflet map:", error); if(mapElement) mapElement.innerHTML = "<p>Error loading map.</p>"; isMapInitialized = false; mapInstance = null; mapMarkersLayer = null; }
    }

    // --- Event Handlers ---
    async function handleVibeButtonClick() { /* ... same as before ... */ }
    async function handleContactFormSubmit(event) { /* ... same as before ... */ }
    async function handleSignupSubmit(event) { /* ... same as before ... */ }
    async function handleLoginSubmit(event) { /* ... same as before ... */ }
    function handleLogout() { /* ... same as before ... */ }
    function handleForgotPassword(event) { /* ... same as before ... */ }
    async function handleForgotPasswordSubmit(event) { /* ... same as before ... */ }
    function showSignupForm(event) { /* ... same as before ... */ }
    function showLoginForm(event) { /* ... same as before ... */ }


    /**
     * Adds event listeners to the main application elements (called after login).
     */
    function addAppEventListeners() {
        console.log("[MAIN SCRIPT] Adding app event listeners (post-login)...");
        try {
            // Re-get elements just before adding listeners for safety
            const vibeBtn = document.getElementById('vibe-button');
            const logoutBtn = document.getElementById('logout-button');
            const contactFrm = document.getElementById('contact-form');

            if (vibeBtn) { vibeBtn.removeEventListener('click', handleVibeButtonClick); vibeBtn.addEventListener('click', handleVibeButtonClick); console.log("[MAIN SCRIPT] Vibe button listener attached."); }
            else { console.error("[MAIN SCRIPT] Vibe button not found for listener."); }

            if (logoutBtn) { logoutBtn.removeEventListener('click', handleLogout); logoutBtn.addEventListener('click', handleLogout); console.log("[MAIN SCRIPT] Logout button listener attached."); }
            else { console.error("[MAIN SCRIPT] Logout button not found for listener."); }

            if (contactFrm) { contactFrm.removeEventListener('submit', handleContactFormSubmit); contactFrm.addEventListener('submit', handleContactFormSubmit); console.log("[MAIN SCRIPT] Contact form listener attached."); }
            else { console.warn("[MAIN SCRIPT] Contact form not found for listener."); } // Warn instead of error
            console.log("[MAIN SCRIPT] Finished adding app event listeners.");
        } catch (error) { console.error("[MAIN SCRIPT] Error during addAppEventListeners:", error); }
    }


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
        if (!assignMainAppElements()) { console.error("[MAIN SCRIPT] Failed to assign main app elements in loadAppData."); /* Optionally show error */ return; }

        // Add listeners for the main app elements
        addAppEventListeners();
        // Initialize map
        initializeMap();

        // Update static elements immediately from status data
        if (userStatusElement) userStatusElement.classList.remove('hidden');
        if (userEmailDisplay) userEmailDisplay.textContent = statusData.email || '';

        // Update gamification immediately from status data
        updateGamificationUI(statusData.currentStreak, statusData.badges, statusData.nextBadgeName, statusData.nextBadgeProgress);

        // Set initial loading states for dynamic data & button state
        updateThemeUI(null);
        updateStatsUI(null);
        updateVibeButtonState(statusData.lastVibeTimestamp);

        // Fetch dynamic data concurrently
        console.log("[MAIN SCRIPT] Fetching theme, stats, map data concurrently...");
        const [themeResult, statsResult, mapResult] = await Promise.allSettled([
            fetchThemeData(),
            fetchStatsData(),
            fetchMapData()
        ]);
        console.log("[MAIN SCRIPT] Theme, stats, map fetches completed.");

        // Update UI with fetched data
        updateThemeUI(themeResult.status === 'fulfilled' ? themeResult.value : null);
        updateStatsUI(statsResult.status === 'fulfilled' ? statsResult.value : null);
        updateMapUI(mapResult.status === 'fulfilled' ? mapResult.value : []);

        console.log("[MAIN SCRIPT] loadAppData finished.");
    }

    /**
     * Updates the overall UI state based on login status.
     */
    function updateLoginUI(isLoggedIn, email = '', lastVibeTimestampISO = null, streak = 0, badges = [], nextBadgeName = '', nextBadgeProgress = 0) {
        console.log(`[UI DEBUG] updateLoginUI called. isLoggedIn: ${isLoggedIn}, email: ${email}, streak: ${streak}`);
        if (isLoggedIn) {
            // Call loadAppData to handle showing UI and fetching data
            // Pass the initial status data we already have
             const initialStatusData = { loggedIn: true, email, lastVibeTimestamp: lastVibeTimestampISO, currentStreak: streak, badges, nextBadgeName, nextBadgeProgress };
             loadAppData(initialStatusData);
        } else {
            // --- Logout Cleanup ---
            console.log("[UI DEBUG] Handling logout state.");
            if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
            if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarkersLayer = null; isMapInitialized = false; }

            if(mainAppContent) mainAppContent.classList.add('hidden');
            if(accountAreaWrapper) accountAreaWrapper.classList.remove('hidden');

            if (loginFormContainer) loginFormContainer.classList.remove('hidden'); // Show login by default
            if (signupFormContainer) signupFormContainer.classList.add('hidden');
            if (forgotPasswordFormContainer) forgotPasswordFormContainer.classList.add('hidden');

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