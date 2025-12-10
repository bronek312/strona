const API_URL = 'http://localhost:4000/api';

export const api = {
    async get(endpoint) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/login.html';
            throw new Error('Brak dostępu');
        }
        return res.json();
    },

    async post(endpoint, data) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return res.json();
    }
};