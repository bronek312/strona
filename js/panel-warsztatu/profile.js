import { api } from './api.js';

export async function initProfile() {
    try {
        const me = await api.get('/workshops/me');
        const workshopNameEl = document.getElementById('workshop-name');
        if(workshopNameEl) workshopNameEl.textContent = me.name || me.email;
        
        const wName = document.getElementById('w-name');
        if(wName) wName.textContent = me.name;
        
        const wEmail = document.getElementById('w-email');
        if(wEmail) wEmail.textContent = me.email;
    } catch(e) { console.error("Profil error", e); }
}