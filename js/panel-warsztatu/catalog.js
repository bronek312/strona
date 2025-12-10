export function initCatalog() {
    console.log('📦 Katalog: Start');

    // 1. Ukryj pasek recepcji
    const receptionBar = document.getElementById('reception-action-bar');
    if (receptionBar) {
        receptionBar.classList.add('hidden');
    }

    // Tu w przyszłości będzie wyszukiwarka części
}