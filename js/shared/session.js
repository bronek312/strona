(function (window) {
    const SESSION_KEY = 'warsztat:session';
    const ADMIN_CREDENTIALS = { login: 'test', password: 'test' };

    const saveSession = (session) => {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    };

    const getSession = () => {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY));
        } catch (error) {
            return null;
        }
    };

    const clearSession = () => sessionStorage.removeItem(SESSION_KEY);

    window.WarsztatSession = {
        ADMIN_CREDENTIALS,
        save: saveSession,
        get: getSession,
        clear: clearSession
    };
})(window);
