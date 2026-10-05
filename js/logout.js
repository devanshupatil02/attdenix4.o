// ============================================================
// ATTENDIX - UNIVERSAL LOGOUT
// Works for Admin, Teacher and Student pages.
// Uses the existing Firebase Auth instance from firebase-config.js.
// ============================================================

import { auth } from './firebase-config.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

let logoutInProgress = false;

function getLoginPage() {
    return window.location.pathname.includes('/pages/')
        ? '../index.html'
        : 'index.html';
}

async function logout() {
    if (logoutInProgress) return;
    logoutInProgress = true;

    try {
        await signOut(auth);
        console.log('ATTENDIX: Logout successful.');
    } catch (error) {
        console.error('ATTENDIX Logout Error:', error);
    } finally {
        window.location.replace(getLoginPage());
    }
}

// Keep compatibility with any existing inline onclick="logout()" code.
window.logout = logout;

function bindLogoutButtons() {
    const selectors = [
        '#logoutBtn',
        '#logoutButton',
        '[data-logout]',
        '.logout-btn',
        '.logout',
        '.sidebar-footer button'
    ];

    const buttons = document.querySelectorAll(selectors.join(','));

    buttons.forEach((button) => {
        if (button.dataset.attendixLogoutBound === 'true') return;
        button.dataset.attendixLogoutBound = 'true';

        button.addEventListener('click', (event) => {
            event.preventDefault();
            logout();
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLogoutButtons);
} else {
    bindLogoutButtons();
}
