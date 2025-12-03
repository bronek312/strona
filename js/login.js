(function () {
    const ADMIN_CREDENTIALS = { login: 'test', password: 'test' };
    const STORAGE_KEY = 'warsztat:workshops';

    const state = {
        adminAuthenticated: false
    };

    const readWorkshops = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (error) {
            console.warn('Blad podczas odczytu warsztatow', error);
            return [];
        }
    };

    const saveWorkshops = (items) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    };

    const setFeedback = (element, message, type) => {
        if (!element) {
            return;
        }
        element.textContent = message;
        element.classList.remove('is-error', 'is-success');
        if (type) {
            element.classList.add(type === 'error' ? 'is-error' : 'is-success');
        }
    };

    const renderWorkshopList = (container) => {
        if (!container) {
            return;
        }
        const items = readWorkshops();
        if (!items.length) {
            container.innerHTML = '<li>Brak aktywnych kont. Utworz pierwsze konto.</li>';
            return;
        }
        container.innerHTML = items
            .map((item) => `
                <li>
                    <strong>${item.name}</strong><br>
                    <span>${item.email}</span> | <span>${item.registration}</span>
                </li>
            `)
            .join('');
    };

    document.addEventListener('DOMContentLoaded', () => {
        const adminLoginForm = document.getElementById('admin-login-form');
        const adminFeedback = document.querySelector('[data-feedback="admin"]');
        const adminTools = document.getElementById('admin-tools');
        const createWorkshopForm = document.getElementById('create-workshop-form');
        const workshopList = document.getElementById('workshop-list');
        const workshopLoginForm = document.getElementById('workshop-login-form');
        const workshopFeedback = document.querySelector('[data-feedback="workshop"]');
        const workshopSuccess = document.getElementById('workshop-success');

        renderWorkshopList(workshopList);

        adminLoginForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(adminLoginForm);
            const login = String(formData.get('login') || '').trim();
            const password = String(formData.get('password') || '').trim();

            if (login === ADMIN_CREDENTIALS.login && password === ADMIN_CREDENTIALS.password) {
                state.adminAuthenticated = true;
                adminTools?.classList.remove('is-hidden');
                setFeedback(adminFeedback, 'Zalogowano poprawnie. Mozesz tworzyc konta warsztatow.', 'success');
                adminLoginForm.reset();
            } else {
                setFeedback(adminFeedback, 'Niepoprawne dane logowania administratora.', 'error');
            }
        });

        createWorkshopForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!state.adminAuthenticated) {
                setFeedback(adminFeedback, 'Najpierw zaloguj administratora.', 'error');
                return;
            }

            const formData = new FormData(createWorkshopForm);
            const name = String(formData.get('name') || '').trim();
            const email = String(formData.get('email') || '').trim().toLowerCase();
            const registration = String(formData.get('registration') || '').trim();
            const tempPassword = String(formData.get('tempPassword') || '').trim();

            if (!name || !email || !registration || !tempPassword) {
                setFeedback(adminFeedback, 'Uzupelnij wszystkie pola formularza.', 'error');
                return;
            }

            const workshops = readWorkshops();
            if (workshops.some((item) => item.email === email)) {
                setFeedback(adminFeedback, 'Warsztat z tym adresem e-mail juz istnieje.', 'error');
                return;
            }

            workshops.push({
                id: Date.now(),
                name,
                email,
                registration,
                password: tempPassword
            });
            saveWorkshops(workshops);
            renderWorkshopList(workshopList);
            createWorkshopForm.reset();
            setFeedback(adminFeedback, 'Nowe konto warsztatu zostalo utworzone.', 'success');
        });

        workshopLoginForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(workshopLoginForm);
            const email = String(formData.get('email') || '').trim().toLowerCase();
            const password = String(formData.get('password') || '').trim();

            const match = readWorkshops().find((item) => item.email === email && item.password === password);

            if (match) {
                setFeedback(workshopFeedback, `Zalogowano jako ${match.name}.`, 'success');
                workshopSuccess?.classList.remove('is-hidden');
                workshopSuccess.querySelector('h3').textContent = `Witaj, ${match.name}!`;
                workshopLoginForm.reset();
            } else {
                setFeedback(workshopFeedback, 'Niepoprawne dane logowania warsztatu.', 'error');
            }
        });
    });
})();
