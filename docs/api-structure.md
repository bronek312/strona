# Backend API Blueprint

Proponowane API obejmuje wszystkie obszary zarzadzane obecnie w localStorage (warsztaty, raporty, ustawienia, logi, sesje) oraz nowe wymagania (przebieg, pierwsza rejestracja, upload mediow). Wszystkie sciezki sa zagnieżdzone pod wersjonowanym prefiksem `/api/v1`.

## Role i uwierzytelnianie

- Role: `admin`, `workshop`.
- Logowanie zwraca token JWT (HS256) lub sesje podpisana po stronie serwera. Token trafia w naglowek `Authorization: Bearer <token>`.
- Uprawnienia:
  - Administrator ma pelny dostep do wszystkich zasobow.
  - Warsztat moze zarzadzac tylko wlasnymi raportami oraz odczytac wlasne konto/kontrakt.
- Opcjonalny refresh token (`/auth/refresh`) pozwala utrzymac sesje bez ponownego logowania.

## Przeglad zasobow i endpointow

### Auth

| Metoda | Sciezka | Opis | Dostep |
|--------|--------|------|--------|
| POST | `/auth/login` | Logowanie jako admin lub warsztat (na podstawie pola `role`) | Public |
| POST | `/auth/logout` | Uniewaznienie refresh tokenu / wyczyszczenie sesji | Zalogowany |
| GET | `/auth/me` | Zwraca profil bieżącego uzytkownika wraz z rola | Zalogowany |
| POST | `/auth/refresh` | Wydanie nowego tokenu dostepowego | Zalogowany |

### Warsztaty (`/workshops`)

| Metoda | Sciezka | Opis | Rola |
|--------|--------|------|------|
| GET | `/workshops` | Lista warsztatow + filtry (`query`, `status`, `contractStatus`, `active`) | admin |
| POST | `/workshops` | Rejestracja nowego warsztatu (nazwa, e-mail, billing, haslo tymczasowe) | admin |
| GET | `/workshops/{id}` | Szczegoly warsztatu wraz z kontraktem i licencja | admin / wlasciciel |
| PATCH | `/workshops/{id}` | Edycja danych (np. billingAmount) | admin |
| POST | `/workshops/{id}/activate` | Aktywacja konta | admin |
| POST | `/workshops/{id}/deactivate` | Dezaktywacja konta | admin |
| POST | `/workshops/{id}/license/extend` | Przedluzenie licencji (`months`) | admin |
| POST | `/workshops/{id}/termination` | Rozpoczecie wypowiedzenia umowy bezterminowej (opcjonalny `noticeDate`) | admin |
| DELETE | `/workshops/{id}/termination` | Anulowanie wypowiedzenia | admin |
| POST | `/workshops/{id}/password/reset` | Ustawienie nowego hasla (wysylka na e-mail) | admin |

### Raporty (`/reports`)

| Metoda | Sciezka | Opis | Rola |
|--------|--------|------|------|
| GET | `/reports` | Lista raportow z filtrami (`vin`, `registration`, `approval`, `workshopId`, `updatedFrom`, `updatedTo`) | admin |
| GET | `/reports/{id}` | Detal raportu (wlacznie z mediami i notatkami moderacji) | admin / wlasciciel |
| POST | `/reports` | Utworzenie raportu przez warsztat (VIN, rejestracja, przebieg, pierwsza rejestracja, opis, media) | workshop |
| PATCH | `/reports/{id}` | Edycja danych przez warsztat dopoki raport w stanie `pending` | workshop (wlasciciel) |
| POST | `/reports/{id}/moderate` | Akceptacja lub odrzucenie raportu (`approvalStatus`, `moderationNote`) | admin |
| GET | `/reports/vin/{vin}` | Publiczny podglad raportow zatwierdzonych dla VIN (uzywany przez landing) | public |

### Ustawienia (`/settings`)

| Metoda | Sciezka | Opis | Rola |
|--------|--------|------|------|
| GET | `/settings` | Pobiera biezace ustawienia (np. `licenseMonths`, statusy raportow) | admin |
| PATCH | `/settings` | Aktualizuje ustawienia globalne | admin |

### Logi i audyt (`/logs`)

| Metoda | Sciezka | Opis | Rola |
|--------|--------|------|------|
| GET | `/logs` | Paginated log entries (`page`, `limit`, `actor`, `action`) | admin |
| DELETE | `/logs` | Czysci logi (opcjonalnie zakres dat) | admin |

### Media (`/media`)

| Metoda | Sciezka | Opis | Rola |
|--------|--------|------|------|
| POST | `/media` | Upload zdjec/wideo przez warsztat (multipart, zwraca `mediaId`, `url`, `checksum`) | workshop |
| GET | `/media/{id}` | Serwowanie pliku (kontrola dostepu: warsztat wlasciciel lub admin) | admin / wlasciciel |
| DELETE | `/media/{id}` | Usuniecie pliku (np. po odrzuceniu raportu) | admin |

### Diagnostyka

| Metoda | Sciezka | Opis |
|--------|--------|------|
| GET | `/health` | Status aplikacji (uptime, stan polaczenia do dysku/bazy) |
| GET | `/health/storage` | Dodatkowa diagnostyka systemu plikow (rozmiar danych, uprawnienia) |

## Modele danych (JSON)

### Workshop

```json
{
  "id": "wrk_1712051234000",
  "name": "Auto Serwis 24",
  "email": "biuro@autos24.pl",
  "registration": "123456789",
  "billingAmount": 750.00,
  "active": true,
  "licenseStart": "2024-10-01T00:00:00.000Z",
  "licenseEnd": "2025-10-01T00:00:00.000Z",
  "contractFixedEnd": "2025-10-01T00:00:00.000Z",
  "contractIndefiniteSince": null,
  "terminationNoticeDate": null,
  "terminationEndDate": null,
  "contractStatus": "fixed",
  "terminatedAt": null,
  "createdAt": "2024-10-01T00:00:00.000Z",
  "updatedAt": "2024-12-10T12:00:00.000Z"
}
```

- Hasla przechowywane jako hash (BCrypt). Reset hasla przez endpoint `/password/reset` lub mechanizm "forgot password".

### Report

```json
{
  "id": "rep_1712054567000",
  "vin": "WAUZZZ8V9JA123456",
  "registrationNumber": "WX1234K",
  "mileageKm": 183500,
  "firstRegistrationDate": "2018-05-12",
  "workshopId": "wrk_1712051234000",
  "workshopName": "Auto Serwis 24",
  "status": "Zakonczona",
  "summary": "Wymiana rozrzadu oraz oleju.",
  "media": [
    { "mediaId": "med_a1", "type": "image/jpeg", "url": "/media/med_a1", "description": "Przed naprawa" }
  ],
  "approvalStatus": "pending",
  "moderationNote": "",
  "moderatedBy": null,
  "moderatedAt": null,
  "createdAt": "2024-12-02T10:00:00.000Z",
  "updatedAt": "2024-12-02T10:00:00.000Z"
}
```

### Settings

```json
{
  "licenseMonths": 12,
  "statusOptions": ["Przyjeta", "W trakcie", "Zakonczona"],
  "requireApproval": true,
  "maxMediaPerReport": 10,
  "mediaMaxSizeMb": 15
}
```

### Log entry

```json
{
  "id": "log_1712057788000",
  "timestamp": "2024-12-02T11:45:00.000Z",
  "actor": "admin@test.pl",
  "action": "report.moderate",
  "message": "Raport rep_1712054567000 zatwierdzony",
  "context": { "reportId": "rep_1712054567000", "approvalStatus": "approved" }
}
```

### Media asset

```json
{
  "id": "med_a1",
  "ownerType": "report",
  "ownerId": "rep_1712054567000",
  "filename": "rozrzad-przed.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 524288,
  "checksum": "sha256:...",
  "storagePath": "uploads/2024/12/med_a1.jpg",
  "createdAt": "2024-12-02T10:01:00.000Z"
}
```

## Warstwa persystencji ("zapis na dysk")

Minimalny wariant backendu Node.js moze trzymac dane w katalogu `data/`:

```
data/
├── workshops.json
├── reports.json
├── settings.json
├── logs.json
└── media/
    ├── manifest.json
    └── <uuid>.bin
```

Zasady zapisu:
- Operacje zapisu atomowego przez `fs.promises.writeFile` + plik tymczasowy (`.tmp`) i `rename`.
- Backup rotacyjny (np. kopiowanie pliku po kazdym 100. zapisie do `data/backups/2025-12-03/`).
- Przy starcie backend waliduje strukture danych i seeduje wartosci domyslne jak obecne moduly JS.
- W przyszlosci mozna zastapic JSON relacyjna baza (Postgres) bez zmiany interfejsu API.

## Integracja frontendu

1. Stworz adaptery `WarsztatApi.reports`, `WarsztatApi.workshops` itd., ktore uzywaja `fetch` zamiast localStorage.
2. Funkcje istniejących modulow (np. `WarsztatReports.create`) deleguja do adaptera i zwracaja te same dane, dzieki czemu UI nie wymaga natychmiastowych zmian.
3. Landing (`index.html`) korzysta z `GET /reports/vin/{vin}` aby wyswietlac tylko zatwierdzone raporty.
4. Formularz warsztatu w `panel.html` wysyla `POST /reports` + upload mediow w dwoch krokach (najpierw `/media`, potem referencje w `media[]`).
5. Moduly administracyjne (`dashboard.js`) odswiezaja dane poprzez `GET /workshops`, `GET /reports` i `GET /logs`.

## Kolejne kroki

1. Zaimplementuj prosty serwer (np. Express + `lowdb` lub `fs`).
2. Dodaj middleware do autoryzacji i walidacji payloadow (np. `zod`).
3. Przygotuj skrypty migracyjne przenoszace istniejace dane z localStorage do plikow JSON.
4. Dopiero na koniec usun logike localStorage z frontendu.
