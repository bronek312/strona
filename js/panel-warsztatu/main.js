// main.js - Mózg operacyjny aplikacji (Wersja dostosowana do data-section)
import { initDashboard } from './dashboard.js';
import { initReceptionModule } from './reception.js';
// import { initOrders } from './orders.js'; 
// import { initCatalog } from './catalog.js'; 

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 System Warsztat+ Startuje... (Tryb: Data-Attributes)');

    // --- 1. OBSŁUGA MENU BOCZNEGO (Automatyczna) ---
    // Pobieramy wszystkie przyciski, które mają klasę .nav-item
    const navButtons = document.querySelectorAll('.nav-item');

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Pobieramy nazwę sekcji z atrybutu HTML (np. data-section="dashboard")
            const sectionName = btn.dataset.section; 
            if (sectionName) {
                navigateTo(sectionName);
            }
        });
    });

    // --- 2. OBSŁUGA DUŻEGO PRZYCISKU "+ NOWE PRZYJĘCIE" ---
    // Upewnij się tylko, że ten DUŻY niebieski przycisk ma id="btn-new-reception"
    const btnNewReception = document.getElementById('btn-new-reception');
    if (btnNewReception) {
        btnNewReception.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('reception');
        });
    }

    // --- 3. FUNKCJA NAWIGACJI ---
    function navigateTo(viewId) {
        console.log(`➡️ Przełączanie na: ${viewId}`);

        // A. Ukryj wszystkie sekcje widoków
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        // B. Pokaż wybraną sekcję
        const targetSection = document.getElementById(`view-${viewId}`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        } else {
            console.error(`❌ Błąd: Nie znaleziono sekcji o id="view-${viewId}" w HTML`);
            return;
        }

        // C. Aktualizacja nagłówka strony (Pulpit CRM / Nowe Przyjęcie...)
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            const titles = {
                'dashboard': 'Pulpit CRM',
                'reception': 'Nowe Przyjęcie',
                'orders': 'Baza Zleceń',
                'catalog': 'Katalog Globalny'
            };
            pageTitle.textContent = titles[viewId] || 'Panel Warsztatu';
        }

        // D. Aktualizacja aktywnego przycisku w menu (Podświetlenie)
        navButtons.forEach(btn => {
            if (btn.dataset.section === viewId) {
                btn.classList.add('bg-slate-800', 'text-white'); // Styl aktywnego
                btn.classList.remove('text-slate-400', 'hover:bg-slate-800');
            } else {
                btn.classList.remove('bg-slate-800', 'text-white'); // Styl nieaktywnego
                btn.classList.add('text-slate-400', 'hover:bg-slate-800');
            }
        });

        // E. ZARZĄDZANIE PASKIEM RECEPCJI (Kluczowe!)
        const receptionBar = document.getElementById('reception-action-bar');
        
        if (viewId === 'reception') {
            // Wchodzimy w recepcję -> Pokaż pasek i odpal logikę
            initReceptionModule();
        } else {
            // Wychodzimy -> Ukryj pasek
            if (receptionBar) receptionBar.classList.add('hidden');
            
            // Odpal logikę innych modułów
            if (viewId === 'dashboard') initDashboard();
            // if (viewId === 'orders') initOrders();
        }
    }

    // --- 4. START APLIKACJI ---
    navigateTo('dashboard');
});