import { api } from './api.js';

export function initDashboard() {
    console.log('🖥️ Pulpit: Start (Kanban Ready)');

    // Mock Data - symulacja aut na warsztacie
    // W przyszłości pobierzemy to przez: const orders = await api.get('/orders');
    const mockOrders = [
        { id: 101, car: 'Audi A4 B8', plate: 'WPR 12345', client: 'Jan Kowalski', task: 'Olej + Filtry', status: 'pending', urgent: false },
        { id: 102, car: 'BMW X5', plate: 'WA 99887', client: 'Firma XYZ', task: 'Wymiana rozrządu', status: 'progress', urgent: true },
        { id: 103, car: 'Toyota Yaris', plate: 'DW 33221', client: 'Anna Nowak', task: 'Klocki przód', status: 'done', urgent: false },
        { id: 104, car: 'VW Passat', plate: 'LU 55443', client: 'Piotr Wiśniewski', task: 'Diagnostyka silnika', status: 'pending', urgent: false },
    ];

    renderKanban(mockOrders);
    initDragAndDrop();
}

function renderKanban(orders) {
    // Czyścimy kolumny
    document.getElementById('col-pending').innerHTML = '';
    document.getElementById('col-progress').innerHTML = '';
    document.getElementById('col-done').innerHTML = '';

    // Liczniki
    const counts = { pending: 0, progress: 0, done: 0 };

    orders.forEach(order => {
        counts[order.status]++;
        const card = createCard(order);
        document.getElementById(`col-${order.status}`).appendChild(card);
    });

    updateCounts(counts);
}

function createCard(order) {
    const card = document.createElement('div');
    card.className = `kanban-card bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition group relative`;
    card.draggable = true;
    card.dataset.id = order.id;

    // Stylizacja priorytetu
    const borderClass = order.urgent ? 'border-l-4 border-l-red-500 pl-3' : '';
    
    card.innerHTML = `
        <div class="${borderClass}">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">${order.plate}</span>
                ${order.urgent ? '<span class="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">PILNE</span>' : ''}
            </div>
            <h4 class="font-bold text-slate-800 text-base leading-tight group-hover:text-blue-600 transition">${order.car}</h4>
            <p class="text-xs text-slate-500 mt-1 mb-3 truncate">${order.task}</p>
            
            <div class="flex items-center justify-between border-t border-slate-50 pt-2 mt-2">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        ${order.client.charAt(0)}
                    </div>
                    <span class="text-xs text-slate-400 truncate max-w-[80px]">${order.client}</span>
                </div>
                <button class="text-slate-300 hover:text-blue-600 transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
            </div>
        </div>
    `;

    // Eventy Drag & Drop dla Karty
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', order.id);
        card.classList.add('opacity-50', 'rotate-2'); // Efekt podniesienia
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('opacity-50', 'rotate-2');
    });

    return card;
}

function initDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault(); // Pozwól na upuszczenie
            col.classList.add('bg-blue-50/30'); // Podświetlenie kolumny
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('bg-blue-50/30');
        });

        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('bg-blue-50/30');
            
            const cardId = e.dataTransfer.getData('text/plain');
            const card = document.querySelector(`[data-id="${cardId}"]`);
            
            if (card) {
                // Przenieś kartę wizualnie
                col.appendChild(card);
                
                // Aktualizuj logikę (W przyszłości: api.put(`/orders/${id}`, {status: newStatus}))
                const newStatus = col.dataset.status;
                console.log(`📦 Zmiana statusu zlecenia #${cardId} -> ${newStatus.toUpperCase()}`);
                
                // Przelicz liczniki
                updateCountsFromDOM();
            }
        });
    });
}

function updateCounts(counts) {
    document.getElementById('count-pending').textContent = counts.pending;
    document.getElementById('count-progress').textContent = counts.progress;
    document.getElementById('count-done').textContent = counts.done;
}

function updateCountsFromDOM() {
    const counts = {
        pending: document.getElementById('col-pending').children.length,
        progress: document.getElementById('col-progress').children.length,
        done: document.getElementById('col-done').children.length
    };
    updateCounts(counts);
}