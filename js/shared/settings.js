(function (window) {
    const SETTINGS_KEY = 'warsztat:settings';
    const DEFAULTS = {
        licenseMonths: 12,
        statusOptions: ['Przyjeta', 'W trakcie', 'Zakonczona']
    };

    const safeParse = (value) => {
        try {
            return JSON.parse(value) || {};
        } catch (error) {
            console.warn('Blad podczas odczytu ustawien', error);
            return {};
        }
    };

    const mergeObjects = (base = {}, patch = {}) => {
        const result = { ...base };
        Object.keys(patch).forEach((key) => {
            const value = patch[key];
            if (Array.isArray(value)) {
                result[key] = [...value];
                return;
            }
            if (value && typeof value === 'object') {
                result[key] = mergeObjects(base[key] || {}, value);
                return;
            }
            result[key] = value;
        });
        return result;
    };

    const getSettings = () => mergeObjects(DEFAULTS, safeParse(localStorage.getItem(SETTINGS_KEY)));

    const saveSettings = (settings) => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    };

    const updateSettings = (partial) => {
        const merged = mergeObjects(getSettings(), partial);
        saveSettings(merged);
        return merged;
    };

    window.WarsztatSettings = {
        get: getSettings,
        save: saveSettings,
        update: updateSettings,
        DEFAULTS
    };
})(window);
