// 📁 js/panel/dashboard.js (na końcu pliku)

const btnSearch = document.getElementById('btn-search-parts');
const partsContainer = document.getElementById('parts-results-container');

if (btnSearch) {
    btnSearch.addEventListener('click', async () => {
        const model = document.getElementById('parts-search-input').value;
        
        partsContainer.innerHTML = '<p>Szukam...</p>';

        try {
            // Pobieramy token z sessionStorage (zakładam, że tak go przechowujesz w auth/login.js)
            const token = sessionStorage.getItem('token'); 

            const response = await fetch(`/api/parts/search?model=${model}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const parts = await response.json();

            if (parts.length === 0) {
                partsContainer.innerHTML = '<p>Brak części.</p>';
                return;
            }

            let html = '<table class="w-full text-left mt-2"><thead><tr class="bg-gray-100"><th>Nazwa</th><th>Cena</th><th>Akcja</th></tr></thead><tbody>';
            
            parts.forEach(part => {
                html += `
                    <tr class="border-b">
                        <td class="p-2">${part.name} <br><span class="text-xs text-gray-500">${part.id}</span></td>
                        <td class="p-2 font-bold text-green-600">${part.price} PLN</td>
                        <td class="p-2">
                            <button onclick="orderPart('${part.id}')" class="bg-yellow-400 px-3 py-1 rounded text-sm hover:bg-yellow-500">Zamów</button>
                        </td>
                    </tr>`;
            });
            
            html += '</tbody></table>';
            partsContainer.innerHTML = html;

        } catch (error) {
            console.error(error);
            partsContainer.innerHTML = '<p class="text-red-500">Błąd połączenia.</p>';
        }
    });
}

// Funkcja globalna do zamawiania
window.orderPart = async (partId) => {
    if(!confirm('Zamówić część?')) return;
    
    const token = sessionStorage.getItem('token');
    await fetch('/api/parts/order', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ partId })
    });
    alert('Zamówienie wysłane!');
};