import { api } from './api.js';

let invoiceItems = [];

export async function initInvoices() {
    await loadInvoices();
    setupInvoiceForm();
    setupInvoiceButton();
}

async function loadInvoices() {
    try {
        const list = await api.get('/invoices');
        const c = document.getElementById('invoices-list');
        if(!list.length) { c.innerHTML='<p>Brak faktur.</p>'; return; }
        
        let h = '<table><thead><tr><th>Nr</th><th>Klient</th><th>Kwota</th><th>Opcje</th></tr></thead><tbody>';
        let net=0, gross=0; const m = new Date().getMonth();
        list.forEach(i => {
            if(new Date(i.created_at).getMonth()===m) { net+=i.total_net; gross+=i.total_gross; }
            h += `<tr><td>${i.number}</td><td>${i.client_name}</td><td>${i.total_gross.toFixed(2)}</td><td><button class="btn-small print-inv-btn" style="background:#6b7280"><i class="fas fa-print"></i></button></td></tr>`;
        });
        c.innerHTML = h+'</tbody></table>';
        document.getElementById('stats-netto').textContent = net.toFixed(2)+' PLN';
        document.getElementById('stats-brutto').textContent = gross.toFixed(2)+' PLN';
    } catch(e){}
}

function setupInvoiceButton() {
    // Podpięcie przycisku "Nowa Faktura"
    const btn = document.querySelector('#finanse .btn-big'); // Znajdujemy przycisk w sekcji finanse
    if(btn) btn.onclick = openInvoiceModal;
    
    // Podpięcie przycisków w modalu
    document.getElementById('add-inv-item-btn').onclick = addInvoiceItem;
    document.querySelector('#invoice-modal button[onclick*="none"]').onclick = () => document.getElementById('invoice-modal').style.display='none'; // Zamknij
}

async function openInvoiceModal() {
    document.getElementById('invoice-modal').style.display = 'flex';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inv-date').value = today;
    const due = new Date(); due.setDate(due.getDate() + 7);
    document.getElementById('inv-due').value = due.toISOString().split('T')[0];

    try {
        const res = await api.get('/invoices/next-number');
        document.getElementById('inv-number').value = res.number;
        const me = await api.get('/workshops/me');
        document.getElementById('inv-seller-name').value = me.name || '';
        document.getElementById('inv-seller-address').value = me.address || '';
    } catch(e) {}
    
    invoiceItems = [{name: 'Usługa serwisowa', qty: 1, net: 100, vat: 23}];
    renderInvoiceItems();
}

function renderInvoiceItems() {
    const tbody = document.getElementById('inv-items-body');
    tbody.innerHTML = '';
    let sumNet = 0, sumVat = 0, sumGross = 0;
    invoiceItems.forEach((item, index) => {
        const gross = item.net * item.qty * (1 + item.vat/100);
        sumNet += item.net * item.qty; sumVat += (item.net * item.qty * item.vat/100); sumGross += gross;
        
        // Tworzymy wiersz
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="full-input name-input" value="${item.name}"></td>
            <td><input type="number" class="full-input qty-input" value="${item.qty}"></td>
            <td><input type="number" class="full-input net-input" value="${item.net}"></td>
            <td><input type="number" class="full-input vat-input" value="${item.vat}"></td>
            <td style="text-align:right;padding-top:15px;">${gross.toFixed(2)}</td>
            <td><button type="button" class="del-btn" style="color:red;border:none;">&times;</button></td>
        `;
        
        // Event listenery dla inputów
        tr.querySelector('.name-input').onchange = (e) => updateInvItem(index, 'name', e.target.value);
        tr.querySelector('.qty-input').onchange = (e) => updateInvItem(index, 'qty', e.target.value);
        tr.querySelector('.net-input').onchange = (e) => updateInvItem(index, 'net', e.target.value);
        tr.querySelector('.vat-input').onchange = (e) => updateInvItem(index, 'vat', e.target.value);
        tr.querySelector('.del-btn').onclick = () => removeInvItem(index);
        
        tbody.appendChild(tr);
    });
    document.getElementById('inv-sum-net').textContent = sumNet.toFixed(2);
    document.getElementById('inv-sum-vat').textContent = sumVat.toFixed(2);
    document.getElementById('inv-sum-gross').textContent = sumGross.toFixed(2);
}

function updateInvItem(i, f, v) { if(f!=='name') v=parseFloat(v); invoiceItems[i][f]=v; renderInvoiceItems(); }
function addInvoiceItem() { invoiceItems.push({name:'', qty:1, net:0, vat:23}); renderInvoiceItems(); }
function removeInvItem(i) { invoiceItems.splice(i, 1); renderInvoiceItems(); }

function setupInvoiceForm() {
    document.getElementById('invoice-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            number: document.getElementById('inv-number').value,
            dateIssued: document.getElementById('inv-date').value,
            dateDue: document.getElementById('inv-due').value,
            clientName: document.getElementById('inv-client-name').value,
            clientNip: document.getElementById('inv-client-nip').value,
            clientAddress: document.getElementById('inv-client-address').value,
            items: invoiceItems,
            totalNet: parseFloat(document.getElementById('inv-sum-net').textContent),
            totalVat: parseFloat(document.getElementById('inv-sum-vat').textContent),
            totalGross: parseFloat(document.getElementById('inv-sum-gross').textContent),
        };
        try {
            await api.post('/invoices', data);
            alert("Faktura zapisana!");
            document.getElementById('invoice-modal').style.display='none';
            loadInvoices();
            generatePDF(data, {
                name: document.getElementById('inv-seller-name').value,
                nip: document.getElementById('inv-seller-nip').value,
                address: document.getElementById('inv-seller-address').value
            });
        } catch(err) { alert("Błąd: " + err.message); }
    });
}

function generatePDF(inv, seller) {
    document.getElementById('pdf-number').textContent = inv.number;
    document.getElementById('pdf-seller-name').textContent = seller.name;
    document.getElementById('pdf-client-name').textContent = inv.clientName;
    document.getElementById('pdf-sum-gross').textContent = inv.totalGross.toFixed(2);
    const b = document.getElementById('pdf-items'); b.innerHTML='';
    inv.items.forEach((x,i)=> b.innerHTML+=`<tr><td>${x.name}</td><td style="text-align:right">${x.qty}</td><td style="text-align:right">${x.net}</td><td style="text-align:right">${x.vat}%</td><td style="text-align:right">${(x.net*x.qty*(1+x.vat/100)).toFixed(2)}</td></tr>`);
    const el = document.getElementById('invoice-template'); el.style.display='block';
    html2pdf().from(el).save(`Faktura_${inv.number.replace(/\//g,'-')}.pdf`).then(()=>el.style.display='none');
}