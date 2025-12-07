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
        if (!window.WarsztatApi || !window.WarsztatSession) {
            console.error('Brakuje modulu API lub sesji');
            return;
        }

        const form = document.getElementById('unified-login-form');
        const feedback = document.querySelector('[data-feedback="login"]');
        const submitBtn = form?.querySelector('button[type="submit"]');

        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const identifier = String(formData.get('identifier') || '').trim();
            const password = String(formData.get('password') || '').trim();

            if (!identifier || !password) {
                setFeedback(feedback, 'Uzupelnij oba pola logowania.', 'error');
                return;
            }

            submitBtn?.setAttribute('disabled', 'true');
            setFeedback(feedback, 'Logowanie...', null);

            try {
                const payload = { email: identifier.toLowerCase(), password };
                const response = await window.WarsztatApi.post('/auth/login', payload, { auth: false });
                const userRole = response.role || 'admin';
                window.WarsztatSession.save({
                    token: response.token,
                    role: userRole,
                    user: {
                        email: response.email || identifier,
                        workshopId: response.workshopId || null
                    }
                });
                setFeedback(feedback, 'Zalogowano pomyslnie. Przekierowuje...', 'success');
                window.location.href = PANEL_URL;
            } catch (error) {
                const message = error.details?.message || 'Niepoprawny e-mail lub haslo.';
                setFeedback(feedback, message, 'error');
            } finally {
                submitBtn?.removeAttribute('disabled');
            }
        });
    });
})();
