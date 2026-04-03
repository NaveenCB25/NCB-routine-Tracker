// Base URL for API
const API_URL = 'http://localhost:5000/api/auth';

// Utility element selectors
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const messageBox = document.getElementById('messageBox');

// Utility function to show messages
function showMessage(msg, isError = false) {
    messageBox.textContent = msg;
    messageBox.style.display = 'block';
    messageBox.className = 'message-box';
    messageBox.classList.add(isError ? 'msg-error' : 'msg-success');
}

// ── REGISTER FUNCTIONALITY ──
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message || 'Registration failed', true);
            } else {
                showMessage('Registration successful! Redirecting...', false);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        } catch (err) {
            console.error(err);
            showMessage('Server connection error.', true);
        }
    });
}

// ── LOGIN FUNCTIONALITY ──
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message || 'Login failed', true);
            } else {
                showMessage('Login successful! Redirecting...', false);
                
                // Store JWT token permanently
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_name', data.user.name);
                localStorage.setItem('user_email', data.user.email);

                // For testing purposes, we simply alert the user and they can view localStorage.
                // In a real app, we'd redirect to the React app or dashboard.
                setTimeout(() => {
                    alert(`Welcome, ${data.user.name}!\nYour token is saved: ${data.token.substring(0, 15)}...`);
                    // window.location.href = 'http://localhost:3000'; // Target the React app URL here typically
                }, 1000);
            }
        } catch (err) {
            console.error(err);
            showMessage('Server connection error.', true);
        }
    });
}
