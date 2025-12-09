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
        // Sprawdzamy czy API jest dostępne, ale nie blokujemy jeśli brakuje Session (naprawimy to ręcznie)
        if (!window.WarsztatApi) {
            console.error('Brakuje modułu API');
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

                // --- POPRAWKA: BEZPOŚREDNI ZAPIS TOKENA DLA PANELU ---
                // To gwarantuje, że panel-warsztatu.html znajdzie token
                console.log("Logowanie udane, zapisuję token:", response.token);
                localStorage.setItem('token', response.token);
                sessionStorage.setItem('token', response.token);
                // -----------------------------------------------------

                // Opcjonalnie: stary sposób zapisu (dla kompatybilności wstecznej)
                if (window.WarsztatSession) {
                    window.WarsztatSession.save({
                        token: response.token,
                        role: response.role || 'workshop',
                        user: {
                            email: response.email || identifier,
                            workshopId: response.workshopId || null
                        }
                    });
                }

                setFeedback(feedback, 'Zalogowano pomyślnie. Przekierowuje...', 'success');

                // INTELIGENTNE PRZEKIEROWANIE
                // Czekamy chwilę, żeby token na pewno się zapisał w storage
                setTimeout(() => {
                    if (response.role === "admin" || response.isAdmin === true || (response.email && response.email.includes("admin"))) {
                        window.location.href = "panel.html";
                    } else {
                        window.location.href = "panel-warsztatu.html";
                    }
                }, 500);

            } catch (error) {
                console.error(error);
                const message = error.details?.message || error.message || 'Niepoprawny e-mail lub hasło.';
                setFeedback(feedback, message, 'error');
            } finally {
                submitBtn?.removeAttribute('disabled');
            }
        });
    });
})();