// js/panel-warsztatu/main.js

// Importujemy z tego samego folderu, więc używamy "./"
import { checkAuth, setupLogout } from './auth.js';
import { initNavigation } from './navigation.js';
import { initProfile } from './profile.js';
import { initReports } from './reports.js';
import { initInvoices } from './invoices.js';
import { initParts } from './parts.js';

document.addEventListener('DOMContentLoaded', () => {
    // Najpierw sprawdzamy czy user jest zalogowany
    if (!checkAuth()) return;

    // Uruchamiamy moduły
    setupLogout();
    initNavigation();
    initProfile();
    initReports();
    initInvoices();
    initParts();
});