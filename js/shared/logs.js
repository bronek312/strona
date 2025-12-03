(function (window) {
    const LOGS_KEY = 'warsztat:logs';

    const safeParse = (value) => {
        try {
            return JSON.parse(value) || [];
        } catch (error) {
            console.warn('Blad podczas odczytu logow', error);
            return [];
        }
    };

    const readLogs = () => safeParse(localStorage.getItem(LOGS_KEY));

    const saveLogs = (items) => {
        localStorage.setItem(LOGS_KEY, JSON.stringify(items));
    };

    const addLog = (entry) => {
        const logs = readLogs();
        logs.unshift({ id: Date.now(), timestamp: new Date().toISOString(), ...entry });
        saveLogs(logs.slice(0, 200));
        return logs;
    };

    window.WarsztatLogs = {
        getAll: readLogs,
        add: addLog,
        clear: () => saveLogs([])
    };
})(window);
