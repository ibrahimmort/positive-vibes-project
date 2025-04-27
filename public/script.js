// Log right at the start to confirm the script file is executing
console.log("[MAIN SCRIPT] script.js: Script start.");

document.addEventListener('DOMContentLoaded', () => {
    // Log when the DOM is ready
    console.log("[MAIN SCRIPT] script.js: DOMContentLoaded event fired.");

    // --- Global Variables & Elements ---
    console.log("[MAIN SCRIPT] Getting account area elements...");
    const mainAppContent = document.getElementById('main-app-content');
    const accountAreaWrapper = document.getElementById('account-area');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form'); // Get login form reference here
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
    let isMapInitialized = false;

    // Timer variable
    let countdownIntervalId = null;

    // --- Helper Functions ---
    function getStartOfWeekUTC(date) { /* ... */ }
    function getNextWeekStartUTC(date) { /* ... */ }

    // --- Assign Main App Elements Function ---
    function assignMainAppElements() { /* ... */ }

    // --- Data Fetching Functions ---
    async function fetchStatusData() { /* ... */ }
    async function fetchThemeData() { /* ... */ }
    async function fetchStatsData() { /* ... */ }
    async function fetchMapData() { /* ... */ }
    async function geocodeLocation(locationString) { /* ... */ }

    // --- UI Update Functions ---
    function updateThemeUI(themeData) { /* ... */ }
    function updateStatsUI(statsData) { /* ... */ }
    function updateGamificationUI(streak = 0, badges = [], nextBadgeName = '', nextBadgeProgress = 0) { /* ... */ }
    async function updateMapUI(mapData) { /* ... */ }
    function setButtonStyleActive(button) { /* ... */ }
    function setButtonStyleCountdown(button) { /* ... */ }
    function updateVibeButtonState(timestampISO) { /* ... */ }
    function startCountdown(targetDate) { /* ... */ }

    // --- Map Initialization ---
    function initializeMap() { /* ... */ }

    // --- Event Handlers ---
    async function handleVibeButtonClick() { /* ... */ }
    async function handleContactFormSubmit(event) { /* ... */ }
    async function handleSignupSubmit(event) { /* ... */ }

    /**
     * Handles the login form submission. (SIMPLIFIED FOR DEBUGGING)
     */
    async function handleLoginSubmit(event) {
        // *** Prevent default FIRST ***
        event.preventDefault();
        console.log("[LOGIN DEBUG] Login form submitted. preventDefault called.");
        alert("Login submit handler fired! Check console."); // Add alert for obvious feedback

        // --- Temporarily comment out the rest of the logic ---
        /*
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
                await checkSession(); // Fetches status including streak
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
        */
    }

    function handleLogout() { /* ... */ }
    function handleForgotPassword(event) { /* ... */ }
    async function handleForgotPasswordSubmit(event) { /* ... */ }
    function showSignupForm(event) { /* ... */ }
    function showLoginForm(event) { /* ... */ }

    /** Adds event listeners to the main application elements (called after login). */
    function addAppEventListeners() { /* ... */ }
    /** Main function to load all app data after login and update the UI. */
    async function loadAppData(statusData) { /* ... */ }
    /** Updates the overall UI state based on login status. */
    function updateLoginUI(isLoggedIn, email = '', lastVibeTimestampISO = null, streak = 0, badges = [], nextBadgeName = '', nextBadgeProgress = 0) { /* ... */ }
    /** Checks the user's session status on page load and updates UI. */
    async function checkSession() { /* ... */ }


    // --- Initialization ---
    // Add event listeners for account forms/links FIRST
    console.log("[MAIN SCRIPT DEBUG] Attaching account form/link listeners...");
    if (signupForm) { signupForm.addEventListener('submit', handleSignupSubmit); console.log("[MAIN SCRIPT DEBUG] Signup form listener attached."); }
    else { console.error("[MAIN SCRIPT DEBUG] Signup form not found for listener."); }

    // *** Attach the simplified login listener ***
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
        console.log("[MAIN SCRIPT DEBUG] Login form listener attached.");
    } else { console.error("[MAIN SCRIPT DEBUG] Login form not found for listener."); }

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

// --- Make Helper Functions Globally Accessible (if needed by inline handlers, though none currently use them) ---
// window.handleResetClick = handleResetClick; // Example if you had inline handlers