# Warsztat+ Backend

Serwer API zbudowany w oparciu o Express oraz SQLite (better-sqlite3). Na tym etapie dostarcza
moduły: autoryzacja administratora, newsy dla strony, formularz raportów VIN oraz galeria media.

## Wymagania
- Node.js >= 18
- npm

## Konfiguracja
1. Skopiuj plik `.env.example` do `.env` i uzupełnij wartości:
   ```bash
   cp .env.example .env
   ```
2. Zainstaluj zależności:
   ```bash
   npm install
   ```
3. Uruchom serwer w trybie deweloperskim:
   ```bash
   npm run dev
   ```
   Domyślnie API będzie dostępne pod `http://localhost:4000`.

## Kluczowe funkcje
- **Auth**: logowanie administratora (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) z JWT.
- **News**: lista publiczna + panel admina do dodawania/usuwania wpisów.
- **Raporty VIN**: publiczne składanie formularza + panel admina do moderacji, edycji i podglądu historii.
- **Media**: upload plików (multer) z limitami rozmiaru/liczby oraz serwowanie ich publicznie.
- **Health-check**: prosty endpoint `/health`.

## Struktura katalogów
```
server/
├── data/                # plik bazy SQLite (tworzy się automatycznie)
├── uploads/             # przechowywane media
├── src/
│   ├── middleware/      # auth, walidacja, obsługa błędów
│   ├── routes/          # definicje tras API
│   ├── services/        # logika domenowa + helpery
│   ├── app.js           # konfiguracja Expressa
│   ├── config.js        # ładowanie env
│   ├── db.js            # inicjalizacja SQLite
│   └── index.js         # punkt startowy
└── package.json
```

## Endpointy (skrót)
- `POST /api/auth/login`
- `GET /api/news`, `POST /api/news`, `DELETE /api/news/:id`
- `POST /api/reports` (publiczny formularz), `GET /api/reports` (admin, wymaga JWT), `PATCH /api/reports/:id`,
  `PATCH /api/reports/:id/status`
- `GET /api/reports/public/:vin` – publiczne wyszukiwanie zaakceptowanych raportów dla numeru VIN
- `GET /api/media`, `POST /api/media`, `DELETE /api/media/:id`, `GET /api/media/:id/download`
- `GET /health`
