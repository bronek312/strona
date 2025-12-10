// Importy modułów (na razie puste, ale gotowe do pracy)
 import { initDashboard } from './dashboard.js';
 import { initReception } from './reception.js';
// import { initCatalog } from './catalog.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Warsztat+ Enterprise: System Start');

    const navButtons = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');

    // Obsługa Nawigacji
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 1. Aktywne menu
            navButtons.forEach(b => b.classList.remove('active', 'bg-blue-600', 'text-white'));
            navButtons.forEach(b => b.classList.add('text-slate-400'));
            
            btn.classList.add('active'); // Style CSS załatwią kolor (zdefiniowane w HTML)
            btn.classList.remove('text-slate-400');

            // 2. Przełączanie widoku
            const sectionId = btn.dataset.section;
            switchView(sectionId);
            
            // 3. Zmiana tytułu
            const titleText = btn.querySelector('span').innerText;
            pageTitle.textContent = titleText;
        });
    });

       function switchView(sectionId) {
        views.forEach(v => v.classList.add('hidden'));
        
        const activeView = document.getElementById(`view-${sectionId}`);
        if (activeView) {
            activeView.classList.remove('hidden');

            // Lazy Loading modułów
            if (sectionId === 'reception') initReception();
            // if (sectionId === 'dashboard') initDashboard();
        }
    }
});