(function () {
    const PANEL_URL = 'panel.html';

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

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.WarsztatSession || !window.WarsztatWorkshops) {
            console.error('Brakuje modulow sesji lub warsztatow');
            return;
        }

        const form = document.getElementById('unified-login-form');
        const feedback = document.querySelector('[data-feedback="login"]');
        const { ADMIN_CREDENTIALS } = window.WarsztatSession;

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const identifier = String(formData.get('identifier') || '').trim();
            const password = String(formData.get('password') || '').trim();

            if (!identifier || !password) {
                setFeedback(feedback, 'Uzupelnij oba pola logowania.', 'error');
                return;
            }

            const lowerIdentifier = identifier.toLowerCase();
            const isAdminLogin = lowerIdentifier === ADMIN_CREDENTIALS.login.toLowerCase();

            if (isAdminLogin) {
                if (password === ADMIN_CREDENTIALS.password) {
                    window.WarsztatSession.save({
                        role: 'admin',
                        user: { name: 'Administrator', email: 'admin@warsztat.plus' }
                    });
                    setFeedback(feedback, 'Logowanie udane. Przekierowuje...', 'success');
                    window.location.href = PANEL_URL;
                } else {
                    setFeedback(feedback, 'Niepoprawne haslo administratora.', 'error');
                }
                return;
            }

            const match = window.WarsztatWorkshops.findByCredentials(lowerIdentifier, password);

            if (match) {
                window.WarsztatSession.save({
                    role: 'workshop',
                    user: match
                });
                setFeedback(feedback, `Witaj ponownie, ${match.name}.`, 'success');
                window.location.href = PANEL_URL;
            } else {
                setFeedback(feedback, 'Niepoprawny e-mail lub haslo warsztatu.', 'error');
            }
        });
    });
})();
