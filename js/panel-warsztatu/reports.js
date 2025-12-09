import { api } from './api.js';

let reportsData = [];
let currentFilter = 'all';

export async function initReports() {
    await loadReports();
    setupFilters();
    setupSearch();
    setupForm();
    setupVinAutofill();
    setupPreviewModal();
}

async function loadReports() {
    try {
        reportsData = await api.get('/reports/mine');
        renderReports();
    } catch(e) { document.getElementById('reports-container').innerHTML = `<p>Błąd pobierania</p>`; }
}

function renderReports(q = "") {
    const container = document.getElementById('reports-container');
    q = q.toLowerCase();
    
    const filtered = reportsData.filter(r => {
        let statusMatch = true;
        if (currentFilter === 'approved') statusMatch = (r.status === 'approved' || r.approvalStatus === 'approved');
        else if (currentFilter === 'pending') statusMatch = (r.status === 'pending' || r.approvalStatus === 'pending' || !r.approvalStatus);
        else if (currentFilter === 'rejected') statusMatch = (r.status === 'rejected' || r.approvalStatus === 'rejected');
        return statusMatch && (r.vin?.toLowerCase().includes(q) || r.plate?.toLowerCase().includes(q));
    });

    if(!filtered.length) { container.innerHTML='<p style="text-align:center">Brak wyników.</p>'; return; }

    let html = `<table><thead><tr><th>Pojazd</th><th>VIN</th><th>Data</th><th>Status</th><th>Akcje</th></tr></thead><tbody>`;
    filtered.forEach(r => {
        let v = r.model || "Auto";
        if(r.summary && r.summary.match(/\[Pojazd: (.*?)\]/)) v = r.summary.match(/\[Pojazd: (.*?)\]/)[1];
        let badge='pending', txt='Oczekujący';
        if(r.status==='approved' || r.approvalStatus==='approved') { badge='approved'; txt='Zatwierdzony'; }
        else if(r.status==='rejected' || r.approvalStatus==='rejected') { badge='rejected'; txt='Do poprawy'; }
        
        // Dodajemy ID do przycisków, aby obsłużyć je event listenerami
        html += `<tr><td>${v}</td><td>${r.vin}</td><td>${new Date(r.createdAt || r.date).toLocaleDateString()}</td><td><span class="badge ${badge}">${txt}</span></td><td>
            <button class="btn-small view-report-btn" data-id="${r.id}" style="background:#6b7280"><i class="fas fa-eye"></i></button> 
            <button class="btn-small edit-report-btn" data-id="${r.id}" style="background:var(--p)"><i class="fas fa-pen"></i></button>
        </td></tr>`;
    });
    container.innerHTML = html + '</tbody></table>';

    // Podpinanie eventów po wyrenderowaniu HTML
    document.querySelectorAll('.view-report-btn').forEach(b => b.onclick = () => viewReport(b.dataset.id));
    document.querySelectorAll('.edit-report-btn').forEach(b => b.onclick = () => startEdit(b.dataset.id));
}

function setupFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderReports();
        });
    });
}

function setupSearch() {
    document.getElementById('search-reports').addEventListener('input', (e) => renderReports(e.target.value));
}

function setupForm() {
    const form = document.getElementById('report-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            vin: document.getElementById('vin').value,
            plate: document.getElementById('plate').value,
            make: document.getElementById('make').value,
            model: document.getElementById('model').value,
            mileage: document.getElementById('mileage').value,
            firstRegistrationDate: document.getElementById('first-reg-date').value || null,
            description: document.getElementById('description').value
        };
        const editId = document.getElementById('edit-report-id').value;
        try {
            if (editId) await api.patch(`/reports/mine/${editId}`, payload);
            else await api.post('/reports/mine', payload);
            
            alert(editId ? "Zaktualizowano!" : "Dodano nowy raport!");
            if(!editId) { 
                form.reset(); 
                toggleLock(false);
                document.getElementById('auto-fill-banner').style.display='none';
            }
            await loadReports();
            if(!editId) document.querySelector('[data-target="moje"]').click();
        } catch(err) { alert("Błąd: " + (err.message || "Sprawdź dane")); }
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        form.reset();
        document.getElementById('edit-report-id').value = "";
        document.getElementById('form-title').textContent = "Nowy raport serwisowy";
        document.getElementById('cancel-edit-btn').style.display = 'none';
        toggleLock(false);
        document.getElementById('auto-fill-banner').style.display='none';
    });
}

function setupVinAutofill() {
    const vinInput = document.getElementById('vin');
    vinInput.addEventListener('blur', async () => {
        const vin = vinInput.value.toUpperCase().trim();
        if(vin.length === 17) {
            try {
                const history = await api.get(`/reports/public/${vin}`);
                if (history && history.length > 0) {
                    const lastReport = history[0]; 
                    let make = "Nieznana", model = "Nieznany";
                    const match = (lastReport.summary || "").match(/\[Pojazd: (.*?) (.*?)\]/);
                    if (match) { make = match[1]; model = match[2]; } else if (lastReport.model) { model = lastReport.model; }

                    document.getElementById('make').value = make;
                    document.getElementById('model').value = model;
                    if(lastReport.firstRegistrationDate) document.getElementById('first-reg-date').value = lastReport.firstRegistrationDate.split('T')[0];
                    
                    toggleLock(true);
                    document.getElementById('auto-fill-banner').style.display = 'flex';
                } else {
                    toggleLock(false);
                    document.getElementById('auto-fill-banner').style.display = 'none';
                }
            } catch(e) {}
        }
    });
}

function toggleLock(lock) {
    ['make', 'model', 'first-reg-date'].forEach(id => {
        const el = document.getElementById(id);
        el.readOnly = lock;
        if(lock) {
            el.classList.add('locked', 'animate-fill');
            el.parentElement.querySelector('.lock').style.display = 'block';
            el.parentElement.parentElement.querySelector('.info-tooltip').style.display = 'block';
            setTimeout(()=>el.classList.remove('animate-fill'), 1500);
        } else {
            el.value = '';
            el.classList.remove('locked');
            el.parentElement.querySelector('.lock').style.display = 'none';
            el.parentElement.parentElement.querySelector('.info-tooltip').style.display = 'none';
        }
    });
}

function viewReport(id) {
    const r = reportsData.find(x => x.id == id);
    let v = r.model; if(r.summary && r.summary.match(/\[Pojazd: (.*?)\]/)) v = r.summary.match(/\[Pojazd: (.*?)\]/)[1];
    document.getElementById('preview-content').innerHTML = `<p><strong>${v}</strong><br>VIN: ${r.vin}</p><p>${r.summary || r.description}</p>`;
    document.getElementById('preview-modal').style.display='flex';
}

function startEdit(id) {
    const r = reportsData.find(x => x.id == id);
    document.querySelector('[data-target="dodaj"]').click();
    document.getElementById('edit-report-id').value = r.id;
    document.getElementById('vin').value = r.vin;
    document.getElementById('plate').value = r.registrationNumber || r.plate;
    document.getElementById('mileage').value = r.mileageKm || r.mileage;
    if(r.firstRegistrationDate) document.getElementById('first-reg-date').value = r.firstRegistrationDate.split('T')[0];
    
    let summary = r.summary || "";
    const match = summary.match(/\[Pojazd: (.*?) (.*?)\] (.*)/s);
    if (match) { 
        document.getElementById('make').value = match[1]; 
        document.getElementById('model').value = match[2]; 
        document.getElementById('description').value = match[3]; 
    } else { 
        document.getElementById('description').value = summary; 
    }
    
    document.getElementById('form-title').textContent = "Edycja raportu";
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
}

function setupPreviewModal() {
    // Podpinanie przycisku zamknij w modalu podglądu
    const closeBtn = document.querySelector('#preview-modal button');
    if(closeBtn) closeBtn.onclick = () => document.getElementById('preview-modal').style.display='none';
}