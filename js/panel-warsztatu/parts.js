import { api } from './api.js';

export function initParts() {
    const btn = document.getElementById('btn-search-parts');
    if(btn) {
        btn.onclick = async () => {
            const query = document.getElementById('parts-search-input').value;
            const container = document.getElementById('parts-results-container');
            if (!query) return;
            
            container.innerHTML = "<p>Szukam...</p>";
            try {
                const parts = await api.get(`/parts/search?q=${encodeURIComponent(query)}`);
                if (!parts || !parts.length) { container.innerHTML = "<p>Brak wyników.</p>"; return; }

                let html = "<table><thead><tr><th>Nazwa</th><th>Cena</th><th>Akcja</th></tr></thead><tbody>";
                parts.forEach(p => {
                    html += `<tr><td><strong>${p.name}</strong><br><small>${p.index}</small></td><td style="color:green;font-weight:bold">${p.price} PLN</td><td><button class="btn-small order-part-btn" data-id="${p.id}" data-name="${p.name}">ZAMÓW</button></td></tr>`;
                });
                container.innerHTML = html + "</tbody></table>";
                
                // Eventy dla przycisków zamów
                document.querySelectorAll('.order-part-btn').forEach(b => {
                    b.onclick = () => orderPart(b.dataset.id, b.dataset.name);
                });
            } catch (e) {
                container.innerHTML = "<p style='color:red'>Błąd serwera części.</p>";
            }
        };
    }
}

async function orderPart(id, name) {
    if(confirm(`Zamówić: ${name}?`)) {
        try { await api.post("/parts/order", { partId: id, partName: name, quantity: 1 }); alert("Zamówiono!"); }
        catch(e) { alert("Błąd zamówienia"); }
    }
}