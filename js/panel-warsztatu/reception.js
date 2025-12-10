export function initReceptionModule() {
    console.log('📝 Moduł Przyjęcia: Start (Real API)');

    // ---------------------------------------------------------
    // 1. ZARZĄDZANIE PASKIEM AKCJI (FIXED FOOTER)
    // ---------------------------------------------------------
    const actionBar = document.getElementById('reception-action-bar');
    
    if (actionBar) {
        // Pokaż pasek dopiero TERAZ, gdy wchodzimy do modułu
        actionBar.classList.remove('hidden');

        // Obsługa efektu "Szkła" (Glassmorphism) przy scrollowaniu
        // Definiujemy funkcję obsługi scrolla
        const handleScroll = () => {
            // Obliczamy czy użytkownik jest blisko dołu strony (np. 50px od końca)
            const isAtBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50;

            if (isAtBottom) {
                // Jesteśmy na dole - pełna biel
                actionBar.classList.remove('bg-white/70', 'backdrop-blur-md', 'border-white/40');
                actionBar.classList.add('bg-white', 'border-slate-200');
            } else {
                // Jesteśmy wyżej - efekt szkła
                actionBar.classList.add('bg-white/70', 'backdrop-blur-md', 'border-white/40');
                actionBar.classList.remove('bg-white', 'border-slate-200');
            }
        };

        // Dodajemy nasłuchiwacz scrolla
        window.addEventListener('scroll', handleScroll);
        
        // Wywołaj raz na starcie, żeby ustawić dobry stan
        handleScroll();
    } else {
        console.error('❌ Błąd: Nie znaleziono paska o ID "reception-action-bar" w HTML');
    }

    // ---------------------------------------------------------
    // 2. ELEMENTY FORMULARZA
    // ---------------------------------------------------------
    const elements = {
        vinInput: document.getElementById('input-vin'),
        vinError: document.getElementById('vin-error'),
        btnDecode: document.getElementById('btn-decode-vin'),
        
        brandInput: document.getElementById('input-brand'),
        modelInput: document.getElementById('input-model'),
        mileageInput: document.getElementById('input-mileage'),
        regDateInput: document.getElementById('input-reg-date'),
        
        damageZones: document.querySelectorAll('.damage-zone'),
        damageList: document.getElementById('damage-list'),
        btnClearDamage: document.getElementById('btn-clear-damage'),
        
        // WAŻNE: Ten przycisk jest teraz wewnątrz paska 'reception-action-bar'
        btnSave: document.getElementById('btn-save-reception'),
        
        descriptionInput: document.getElementById('input-description'),
        clientName: document.getElementById('input-client-name'),
        clientPhone: document.getElementById('input-client-phone'),
        serviceTags: document.querySelectorAll('.service-tag')
    };

    let selectedDamages = [];

    // ---------------------------------------------------------
    // 3. LOGIKA DEKODOWANIA VIN
    // ---------------------------------------------------------
    if (elements.btnDecode) {
        // Klonowanie przycisku aby usunąć stare listenery (zapobiega dublowaniu akcji)
        const newBtnDecode = elements.btnDecode.cloneNode(true);
        elements.btnDecode.parentNode.replaceChild(newBtnDecode, elements.btnDecode);
        elements.btnDecode = newBtnDecode; // Aktualizacja referencji

        elements.btnDecode.addEventListener('click', async () => {
            const vin = elements.vinInput.value.trim().toUpperCase();
            
            elements.vinError.classList.add('hidden');
            elements.vinError.textContent = '';
            
            if (vin.length !== 17) {
                elements.vinError.textContent = 'Numer VIN musi mieć dokładnie 17 znaków.';
                elements.vinError.classList.remove('hidden');
                return;
            }
            
            const originalBtnText = elements.btnDecode.innerText;
            elements.btnDecode.innerHTML = `<span class="animate-spin">↻</span> Pobieram...`;
            elements.btnDecode.disabled = true;

            try {
                // Fetch do Twojego backendu (jeśli masz proxy) lub bezpośrednio (jeśli testujesz)
                // Sugerowana zmiana na backend: /api/vin/${vin}
                const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
                const data = await response.json();

                if (data.Results) {
                    const make = data.Results.find(item => item.Variable === 'Make')?.Value;
                    const model = data.Results.find(item => item.Variable === 'Model')?.Value;
                    const year = data.Results.find(item => item.Variable === 'Model Year')?.Value;

                    if (make && model) {
                        elements.brandInput.value = make;
                        elements.modelInput.value = model + (year ? ` (${year})` : '');
                        
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
                elements.brandInput.removeAttribute('readonly');
                elements.modelInput.removeAttribute('readonly');
                elements.brandInput.focus();
            } finally {
                elements.btnDecode.innerText = originalBtnText;
                elements.btnDecode.disabled = false;
            }
        });
    }

    // ---------------------------------------------------------
    // 4. MAPA USZKODZEŃ
    // ---------------------------------------------------------
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

    if (elements.btnClearDamage) {
        elements.btnClearDamage.addEventListener('click', () => {
            selectedDamages = [];
            elements.damageZones.forEach(z => z.style.fill = '');
            updateDamageList();
        });
    }

    function updateDamageList() {
        if (!elements.damageList) return;
        
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

    // ---------------------------------------------------------
    // 5. ZAPISYWANIE ZLECENIA
    // ---------------------------------------------------------
    if (elements.btnSave) {
        // Klonowanie przycisku zapisu (aby nie dodawać wielu listenerów przy wielokrotnym wchodzeniu)
        const newBtnSave = elements.btnSave.cloneNode(true);
        elements.btnSave.parentNode.replaceChild(newBtnSave, elements.btnSave);
        elements.btnSave = newBtnSave;

        elements.btnSave.addEventListener('click', () => {
            const services = Array.from(elements.serviceTags).filter(cb => cb.checked).map(cb => cb.value);

            const data = {
                vin: elements.vinInput ? elements.vinInput.value : '',
                car: `${elements.brandInput ? elements.brandInput.value : ''} ${elements.modelInput ? elements.modelInput.value : ''}`,
                mileage: elements.mileageInput ? elements.mileageInput.value : '',
                client: elements.clientName ? elements.clientName.value : '',
                phone: elements.clientPhone ? elements.clientPhone.value : '',
                description: elements.descriptionInput ? elements.descriptionInput.value : '',
                services: services,
                damages: selectedDamages
            };

            if (!data.vin || !data.client || !data.description || !data.mileage) {
                alert('❗ Uzupełnij wymagane pola:\n- VIN\n- Przebieg\n- Klient\n- Opis usterki');
                return;
            }

            console.log('📦 ZAPISANO:', data);
            alert(`✅ ZLECENIE OTWARTE!\n\nPojazd: ${data.car}\nAPI VIN: OK\n\nPrzekazano na warsztat.`);
            
            // Opcjonalnie: Po zapisie ukryj pasek lub zresetuj formularz
            // actionBar.classList.add('hidden');
        });
    } else {
        console.error('❌ Nie znaleziono przycisku zapisu (btn-save-reception)');
    }
}