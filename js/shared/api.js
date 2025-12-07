(function (window) {
    const guessBaseUrl = () => {
        if (window.__WARSZTAT_API_BASE__) {
            return window.__WARSZTAT_API_BASE__;
        }
        const origin = window.location.origin;
        const devMatch = origin.match(/:(3\d{3})$/);
        if (devMatch) {
            return origin.replace(/:(3\d{3})$/, ':4000') + '/api';
        }
        return `${origin}/api`;
    };

    let baseUrl = guessBaseUrl().replace(/\/$/, '');
    let authToken = null;

    const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData;

    async function request(path, options = {}) {
        const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const headers = { ...(options.headers || {}) };
        let body = options.body;

        if (body && !isFormData(body)) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(body);
        }

        const requiresAuth = options.auth !== false;
        if (requiresAuth && authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body
        });

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (!response.ok) {
            const errorPayload = isJson ? await response.json().catch(() => null) : null;
            const error = new Error(errorPayload?.message || 'Request failed');
            error.status = response.status;
            error.details = errorPayload;
            throw error;
        }

        if (response.status === 204) {
            return null;
        }

        return isJson ? response.json() : response.text();
    }

    window.WarsztatApi = {
        getBaseUrl: () => baseUrl,
        setBaseUrl: (url) => {
            baseUrl = (url || '').replace(/\/$/, '');
        },
        setToken: (token) => {
            authToken = token;
        },
        clearToken: () => {
            authToken = null;
        },
        getToken: () => authToken,
        request,
        get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
        post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
        patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
        delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' })
    };
})(window);
