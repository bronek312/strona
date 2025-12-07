(function (window) {
    const SESSION_KEY = 'warsztat:session';

    const readSession = () => {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY));
        } catch (error) {
            return null;
        }
    };

    const persistSession = (session) => {
        if (!session) {
            sessionStorage.removeItem(SESSION_KEY);
            return;
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    };

    const syncApiToken = (token) => {
        if (!window.WarsztatApi) {
            return;
        }
        if (token) {
            window.WarsztatApi.setToken(token);
        } else {
            window.WarsztatApi.clearToken();
        }
    };

    const current = readSession();
    if (current?.token) {
        syncApiToken(current.token);
    }

    window.WarsztatSession = {
        save: (session) => {
            persistSession(session);
            syncApiToken(session?.token);
        },
        get: readSession,
        clear: () => {
            persistSession(null);
            syncApiToken(null);
        },
        getToken: () => readSession()?.token || null
    };
})(window);
