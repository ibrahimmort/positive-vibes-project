document.addEventListener('DOMContentLoaded', () => {
    // Get references to the necessary DOM elements
    const resetPasswordForm = document.getElementById('reset-password-form');
    const resetPasswordFormContainer = document.getElementById('reset-password-form-container');
    const invalidTokenContainer = document.getElementById('invalid-token-container');
    const invalidTokenMessage = document.getElementById('invalid-token-message');
    const tokenInput = document.getElementById('reset-token');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const resetMessageElement = document.getElementById('reset-message');

    // --- Get Token from URL ---
    // Extract the 'token' query parameter from the current page's URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // --- Initial Check ---
    // Check if a token was found in the URL
    if (!token) {
        // No token found, hide the password form and show the invalid link message
        console.error("Reset token missing from URL.");
        if (resetPasswordFormContainer) resetPasswordFormContainer.classList.add('hidden');
        if (invalidTokenContainer) invalidTokenContainer.classList.remove('hidden');
        if (invalidTokenMessage) invalidTokenMessage.textContent = "Password reset link is missing required information.";
    } else {
        // Token found, store it in the hidden input field within the form
        console.log("Reset token found in URL:", token);
        if (tokenInput) tokenInput.value = token;
        // Ensure the password form is visible and the invalid token message is hidden
        if (resetPasswordFormContainer) resetPasswordFormContainer.classList.remove('hidden');
        if (invalidTokenContainer) invalidTokenContainer.classList.add('hidden');
    }

    // --- Form Submission Handler ---
    // Add an event listener only if the form exists
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent the default form submission (page reload)

            // Double-check that all required form elements are accessible
            if (!newPasswordInput || !confirmPasswordInput || !tokenInput || !resetMessageElement) {
                console.error("Reset form elements not found during submit.");
                return;
            }

            // Get values from the form
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const currentToken = tokenInput.value; // Get token from hidden input

            // Clear any previous messages and reset styling
            resetMessageElement.textContent = '';
            resetMessageElement.className = 'message hidden'; // Start hidden

            // --- Input Validation ---
            if (!currentToken) {
                resetMessageElement.textContent = 'Invalid reset link (no token). Please request a new link.';
                resetMessageElement.className = 'message error'; // Show error
                resetMessageElement.classList.remove('hidden'); // Make sure message is visible
                return;
            }
            if (newPassword.length < 6) {
                resetMessageElement.textContent = 'Password must be at least 6 characters long.';
                resetMessageElement.className = 'message error';
                resetMessageElement.classList.remove('hidden'); // Make sure message is visible
                return;
            }
            if (newPassword !== confirmPassword) {
                resetMessageElement.textContent = 'Passwords do not match.';
                resetMessageElement.className = 'message error';
                resetMessageElement.classList.remove('hidden'); // Make sure message is visible
                return;
            }

            // Disable the submit button to prevent multiple submissions
            const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;

            // --- API Call ---
            try {
                // Send the token and new password to the backend endpoint
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: currentToken, password: newPassword })
                });

                // Attempt to parse the JSON response from the server
                const result = await response.json();

                // Check if the server responded with success (HTTP status 2xx)
                if (response.ok) {
                    resetMessageElement.textContent = result.message || 'Password has been reset successfully! You can now log in.';
                    resetMessageElement.className = 'message success';
                    resetPasswordForm.reset(); // Clear the password fields
                    // Optionally redirect to the login page after a delay
                    setTimeout(() => { window.location.href = '/'; }, 3000); // Redirect to homepage (login)
                } else {
                    // Handle errors reported by the server (e.g., invalid token, expired token)
                    resetMessageElement.textContent = result.message || 'Failed to reset password. The link may be invalid or expired.';
                    resetMessageElement.className = 'message error';
                    // If the error specifically indicates an invalid/expired token (e.g., status 400/401)
                    // hide the form and show the dedicated invalid token message area.
                    if (response.status === 400 || response.status === 401) {
                        if (resetPasswordFormContainer) resetPasswordFormContainer.classList.add('hidden');
                        if (invalidTokenContainer) invalidTokenContainer.classList.remove('hidden');
                        if (invalidTokenMessage) invalidTokenMessage.textContent = result.message || 'This password reset link is invalid or has expired. Please request a new one.';
                    }
                }

            } catch (error) {
                // Handle network errors (e.g., server unreachable)
                console.error("Reset password network error:", error);
                resetMessageElement.textContent = 'Network error. Please try again.';
                resetMessageElement.className = 'message error';
            } finally {
                // Re-enable the submit button regardless of success or failure
                if (submitButton) submitButton.disabled = false;
                // Make sure the message area is visible
                resetMessageElement.classList.remove('hidden');
            }
        });
    } else {
        // Log an error if the main form element wasn't found on the page
        console.error("Reset password form (#reset-password-form) not found.");
    }
});
