# Warsztat+

Landing page oraz panel logowania dla platformy wspierajacej warsztaty samochodowe. Celem aplikacji jest przyspieszenie raportowania napraw i udostepnienie historii VIN klientom.

## Struktura

```
warsztat
├── index.html             # Landing z formularzem VIN
├── login.html             # Jednolity formularz logowania
├── panel.html             # Docelowy panel admina/warsztatu
├── css
│   ├── base/core.css      # Zasady wspolne
│   ├── landing/page.css   # Styl strony glownej
│   ├── auth/page.css      # Styl logowania
│   └── panel/page.css     # Styl panelu
├── js
│   ├── shared/reports.js  # Zarzadzanie raportami VIN
│   ├── shared/workshops.js# Zarzadzanie kontami warsztatow
│   ├── shared/session.js  # Sesja i role
│   ├── landing/vinForm.js # Logika formularza VIN
│   ├── auth/login.js      # Logowanie i przekierowanie
│   └── panel/dashboard.js # Panel po zalogowaniu
├── package.json
└── README.md
```

## Uruchomienie

1. `npm install`
2. `npm start` (lite-server pod `http://localhost:3000`)
3. `index.html` to landing, `login.html` to formularz logowania (link w stopce), `panel.html` wczytuje sie po udanym logowaniu

## Logowanie testowe

- Administrator: login `test`, haslo `test`
- Po zalogowaniu administrator trafia do `panel.html`, gdzie zaklada konta warsztatow (nazwa, e-mail, dane firmy, haslo tymczasowe). Dane przechowywane sa lokalnie w `localStorage`.
- Warsztat loguje sie swoim e-mailem oraz haslem. Po sukcesie widzi sekcje warsztatowa w `panel.html`.

## Formularz VIN

Na stronie glownej znajduje sie formularz sprawdzania historii VIN. Na potrzeby demo zapisywane sa dwa przykladowe raporty w `localStorage`. Docelowy modul raportowania zostanie podlaczony w kolejnych iteracjach.