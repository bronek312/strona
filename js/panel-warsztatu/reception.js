export function initReception() {
    console.log('📝 Moduł Przyjęcia: Start (Real API)');

    const elements = {
        vinInput: document.getElementById('input-vin'),
        vinError: document.getElementById('vin-error'),
        btnDecode: document.getElementById('btn-decode-vin'),
        
        brandInput: document.getElementById('input-brand'),
        modelInput: document.getElementById('input-model'),
        mileageInput: document.getElementById('input-mileage'),
        regDateInput: document.getElementById('input-reg-date'),
        
        // Elementy formularza (reszta bez zmian)
        damageZones: document.querySelectorAll('.damage-zone'),
        damageList: document.getElementById('damage-list'),
        btnClearDamage: document.getElementById('btn-clear-damage'),
        btnSave: document.getElementById('btn-save-reception'),
        descriptionInput: document.getElementById('input-description'),
        clientName: document.getElementById('input-client-name'),
        clientPhone: document.getElementById('input-client-phone'),
        serviceTags: document.querySelectorAll('.service-tag')
    };

    let selectedDamages = [];

    // --- 1. PRAWDZIWE DEKODOWANIE VIN (NHTSA API) ---
    elements.btnDecode.addEventListener('click', async () => {
        const vin = elements.vinInput.value.trim().toUpperCase();
        
        // Reset błędów
        elements.vinError.classList.add('hidden');
        elements.vinError.textContent = '';
        
        if (vin.length !== 17) {
            elements.vinError.textContent = 'Numer VIN musi mieć dokładnie 17 znaków.';
            elements.vinError.classList.remove('hidden');
            return;
        }
        
        // UI Loading
        const originalBtnText = elements.btnDecode.innerText;
        elements.btnDecode.innerHTML = `<span class="animate-spin">↻</span> Pobieram...`;
        elements.btnDecode.disabled = true;

        try {
            // Strzał do darmowego, publicznego API
            const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
            const data = await response.json();

            if (data.Results) {
                // API zwraca tablicę zmiennych, musimy znaleźć te odpowiednie
                const make = data.Results.find(item => item.Variable === 'Make')?.Value;
                const model = data.Results.find(item => item.Variable === 'Model')?.Value;
                const year = data.Results.find(item => item.Variable === 'Model Year')?.Value;

                if (make && model) {
                    elements.brandInput.value = make;
                    elements.modelInput.value = model + (year ? ` (${year})` : '');
                    
                    // Opcjonalnie: Ustawienie przybliżonej daty rejestracji na styczeń roku produkcji
                    if (year && !elements.regDateInput.value) {
                        elements.regDateInput.value = `${year}-01-01`;
                    }
                } else {
                    throw new Error('Nie rozpoznano marki/modelu w bazie globalnej.');
                }
            } else {
                throw new Error('Błąd API.');
            }

        } catch (error) {
            console.error(error);
            elements.vinError.textContent = 'Nie udało się pobrać danych (Spróbuj ręcznie).';
            elements.vinError.classList.remove('hidden');
            // Odblokuj pola do wpisania ręcznego
            elements.brandInput.removeAttribute('readonly');
            elements.modelInput.removeAttribute('readonly');
            elements.brandInput.focus();
        } finally {
            elements.btnDecode.innerText = originalBtnText;
            elements.btnDecode.disabled = false;
        }
    });

    // --- 2. MAPA USZKODZEŃ ---
    elements.damageZones.forEach(zone => {
        zone.addEventListener('click', function() {
            const partName = this.dataset.part;
            if (selectedDamages.includes(partName)) {
                selectedDamages = selectedDamages.filter(d => d !== partName);
                this.style.fill = '';
            } else {
                selectedDamages.push(partName);
                this.style.fill = '#fca5a5';
            }
            updateDamageList();
        });
    });

    elements.btnClearDamage.addEventListener('click', () => {
        selectedDamages = [];
        elements.damageZones.forEach(z => z.style.fill = '');
        updateDamageList();
    });

    function updateDamageList() {
        if (selectedDamages.length === 0) {
            elements.damageList.innerHTML = '<li class="italic text-slate-400">Pojazd bez zastrzeżeń</li>';
            return;
        }
        elements.damageList.innerHTML = selectedDamages.map(dmg => `
            <li class="flex items-center gap-2 text-slate-700 font-medium bg-white p-1 rounded border border-slate-100">
                <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                ${dmg}
            </li>
        `).join('');
    }

    // --- 3. ZAPISYWANIE ---
    elements.btnSave.addEventListener('click', () => {
        const services = Array.from(elements.serviceTags).filter(cb => cb.checked).map(cb => cb.value);

        const data = {
            vin: elements.vinInput.value,
            car: `${elements.brandInput.value} ${elements.modelInput.value}`,
            mileage: elements.mileageInput.value,
            client: elements.clientName.value,
            phone: elements.clientPhone.value,
            description: elements.descriptionInput.value,
            services: services,
            damages: selectedDamages
        };

        if (!data.vin || !data.client || !data.description || !data.mileage) {
            alert('❗ Uzupełnij wymagane pola:\n- VIN\n- Przebieg\n- Klient\n- Opis usterki');
            return;
        }

        console.log('📦 ZAPISANO:', data);
        alert(`✅ ZLECENIE OTWARTE!\n\nPojazd: ${data.car}\nAPI VIN: OK\n\nPrzekazano na warsztat.`);
    });
}