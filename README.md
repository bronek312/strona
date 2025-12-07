# Warsztat+

Landing page oraz panel administratora polaczone z backendem Express/SQLite (`server/`).
Frontend serwowany przez `lite-server` korzysta z API (`http://localhost:4000/api`) do logowania
oraz wyszukiwania raportow po numerze VIN.

## Struktura

```
├── index.html          # Landing page z formularzem VIN
├── login.html          # Logowanie administratora (JWT)
├── panel.html          # Panel zarzadzania raportami
├── css/                # Style wspolne/oraz widokowe
├── js/
│   ├── shared/api.js   # Klient HTTP + obsluga tokenu
│   ├── shared/session.js
│   ├── landing/vinForm.js
│   ├── auth/login.js
│   └── panel/dashboard.js
└── server/             # Backend Express + SQLite + multer
```

## Wymagania
- Node.js >= 18
- Dwa terminale (frontend + backend) podczas pracy deweloperskiej

## Backend (API)
1. `cd server`
2. `cp .env.example .env` i ustaw m.in. `ADMIN_EMAIL`, `ADMIN_PASSWORD`
3. `npm install`
4. `npm run dev` (API na `http://localhost:4000`)

### Endpointy warsztatow
- `GET /api/workshops` – lista wszystkich warsztatow (wymaga tokenu admina); rekord zawiera pole `loginEmail`
- `GET /api/workshops/public` – lista aktywnych warsztatow dostepna publicznie
- `GET /api/workshops/me` – profil zalogowanego warsztatu (token warsztatowy)
- `POST /api/workshops` – dodawanie nowego warsztatu wraz z kontem (`loginEmail`, `loginPassword` – min. 8 znakow)
- `PATCH /api/workshops/:id` – edycja danych/statusu oraz ewentualna zmiana e-maila lub reset hasla konta warsztatowego
- Przy pierwszym uruchomieniu backend zasila baze trzema przykladowymi warsztatami testowymi i tworzy dla nich loginy (haslo domyslne `warsztat123`)

### Endpointy raportow
- `GET /api/reports` – lista raportow dla administratora (filtracja i moderacja)
- `GET /api/reports/mine` – raporty przypisane do zalogowanego warsztatu
- `POST /api/reports/mine` – dodanie raportu przez warsztat (VIN, rejestracja, opis naprawy)
- `GET /api/reports/public/:vin` – publiczne wyszukiwanie po VIN
- `PATCH /api/reports/:id` – moderacja raportu przez administratora

## Frontend (SPA)
1. W katalogu glownym `npm install`
2. `npm start` (lite-server na `http://localhost:3000` z proxy na API)
3. Landing: `index.html`, logowanie: `login.html`, panel: `panel.html`

## Logowanie
- Administrator: uzyj kombinacji `ADMIN_EMAIL` + `ADMIN_PASSWORD` z pliku `server/.env`
- Warsztat: konto tworzy administrator podczas dodawania warsztatu (pole `E-mail logowania` + haslo). Po zalogowaniu warsztat otrzymuje widok z podsumowaniem danych, lista swoich raportow i formularzem dodawania nowych zgłoszen
- Token JWT zapisywany jest w `sessionStorage` i dolaczany automatycznie do zapytan panelu

## Funkcjonalnosci
- Wyszukiwanie raportow VIN (`GET /api/reports/public/:vin`) z walidacja po stronie backendu
- Panel admina: lista raportow, filtrowanie i moderacja (`PATCH /api/reports/:id`)
- Panel admina: zarzadzanie warsztatami wraz z kontami logowania (`GET/POST/PATCH /api/workshops`)
- Sekcje Ustawienia/Logi korzystaja z audit logow oraz centralnych konfiguracji
- Tryb warsztatowy: dedykowany dashboard z danymi warsztatu, przefiltrowana lista raportow oraz formularz do wprowadzania nowych napraw

## Kolejne kroki
- Obsluga zalacznikow media dla raportow warsztatowych (upload + galeria)
- Powiadomienia/podglad statusu VIN w panelu warsztatu
- Rozbudowa panelu admina o zarzadzanie newsami oraz plikami
