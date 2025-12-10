export function initOrders() {
    console.log('📂 Baza Zleceń: Start');

    // 1. Ukryj pasek recepcji (jeśli jest widoczny)
    const receptionBar = document.getElementById('reception-action-bar');
    if (receptionBar) {
        receptionBar.classList.add('hidden');
    }

    // Tu w przyszłości będzie tabela zleceń
    // document.getElementById('view-content').innerHTML = '<h1>Lista Zleceń</h1>...';
}