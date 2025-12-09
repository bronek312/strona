import { getToken } from './api.js';

export function checkAuth() {
    const token = getToken();
    if (!token) {
        document.getElementById('auth-error').style.display = 'block';
        return false;
    }
    return true;
}

export function setupLogout() {
    // Ponieważ w HTML usuniemy onclick="logout()", dodajemy listener tutaj
    const btn = document.getElementById('logout-btn');
    if(btn) {
        btn.addEventListener('click', () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "login.html";
        });
    }
}