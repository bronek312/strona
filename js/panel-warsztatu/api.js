const API_URL = 'http://localhost:4000/api';

export function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export const api = {
    get: async (end) => { 
        const r = await fetch(`${API_URL}${end}`, { headers: {'Authorization': `Bearer ${getToken()}`} }); 
        if(!r.ok) throw await r.json(); return r.json(); 
    },
    post: async (end, d) => { 
        const r = await fetch(`${API_URL}${end}`, { method:'POST', headers:{'Content-Type':'application/json', 'Authorization': `Bearer ${getToken()}`}, body:JSON.stringify(d)}); 
        if(!r.ok) throw await r.json(); return r.json(); 
    },
    patch: async (end, d) => { 
        const r = await fetch(`${API_URL}${end}`, { method:'PATCH', headers:{'Content-Type':'application/json', 'Authorization': `Bearer ${getToken()}`}, body:JSON.stringify(d)}); 
        if(!r.ok) throw await r.json(); return r.json(); 
    }
};