(function () {
    const setFeedback = (element, message, type) => {
        if (!element) return;
        element.textContent = message;
        element.classList.remove('is-error', 'is-success');
        if (type) {
            element.classList.add(type === 'error' ? 'is-error' : 'is-success');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.WarsztatApi || !window.WarsztatSession) {
            console.error('Brakuje modułu API lub sesji');
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
                setFeedback(feedback, 'Uzupełnij oba pola logowania.', 'error');
                return;
            }

            submitBtn?.setAttribute('disabled', 'true');
            setFeedback(feedback, 'Logowanie...', null);

            try {
                const payload = { email: identifier.toLowerCase(), password };
                const response = await window.WarsztatApi.post('/auth/login', payload, { auth: false });

                // Zapis sesji
                window.WarsztatSession.save({
                    token: response.token,
                    role: response.role || 'workshop',
                    user: {
                        email: response.email || identifier,
                        workshopId: response.workshopId || null
                    }
                });

                setFeedback(feedback, 'Zalogowano pomyślnie. Przekierowuje...', 'success');
                if (response.role === "admin" || (response.email && response.email.toLowerCase().includes("admin"))) {
                    window.location.href = "panel.html";
                } else {
                    window.location.href = "panel-warsztatu.html";
                }

                // INTELIGENTNE PRZEKIEROWANIE
                if (response.role === "admin" || response.isAdmin === true) {
                    window.location.href = "panel.html";
                }
                else if (response.email && response.email.toLowerCase().includes("admin")) {
                    window.location.href = "panel.html";
                }
                else {
                    window.location.href = "panel-warsztatu.html";
                }

            } catch (error) {
                const message = error.details?.message || 'Niepoprawny e-mail lub hasło.';
                setFeedback(feedback, message, 'error');
            } finally {
                submitBtn?.removeAttribute('disabled');
            }
        });
    });
})();