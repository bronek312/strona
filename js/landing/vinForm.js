(function () {
    const VIN_FORM_ID = 'vin-form';
    const VIN_INPUT_ID = 'vin-input';
    const VIN_RESULT_ID = 'vin-result';
    const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{11,17}$/;

    const formatDate = (value) => {
        if (!value) {
            return 'Brak danych';
        }
        try {
            return new Date(value).toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return value;
        }
    };

    const formatMileage = (value) => {
        const mileage = Number(value);
        if (!Number.isFinite(mileage) || mileage < 0) {
            return 'Brak danych';
        }
        return `${mileage.toLocaleString('pl-PL')} km`;
    };

    const renderMediaList = (media = []) => {
        if (!media.length) {
            return '';
        }
        const items = media
            .map((item, index) => {
                const label = item.name || `Zalacznik ${index + 1}`;
                if (item.url) {
                    return `<li><a href="${item.url}" target="_blank" rel="noopener">${label}</a></li>`;
                }
                return `<li>${label}</li>`;
            })
            .join('');
        return `<ul class="vin-card-media">${items}</ul>`;
    };

    const renderResult = (container, vin, reports) => {
        if (!reports.length) {
            container.textContent = 'Brak zaakceptowanych raportow dla podanego VIN.';
            return;
        }

        const items = reports
            .map((report) => `
                <article class="vin-card">
                    <header>
                        <strong>${report.workshopName || 'Warsztat'}</strong>
                        <span>Status: ${report.status || '—'}</span>
                    </header>
                    <div class="vin-card__meta">
                        <span>Rejestracja: ${report.registrationNumber || 'Brak danych'}</span>
                        <span>Przebieg: ${formatMileage(report.mileageKm)}</span>
                        <span>Pierwsza rejestracja: ${formatDate(report.firstRegistrationDate)}</span>
                    </div>
                    <p>${report.summary || 'Brak opisu naprawy.'}</p>
                    ${renderMediaList(report.media)}
                    <footer>Aktualizacja: ${formatDate(report.updatedAt)}</footer>
                </article>
            `)
            .join('');

        container.innerHTML = `
            <p>Znaleziono ${reports.length} raport(y) dla VIN <strong>${vin}</strong>:</p>
            <div class="vin-card-list">${items}</div>
        `;
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.WarsztatApi) {
            console.error('Brak klienta API');
            return;
        }

        const form = document.getElementById(VIN_FORM_ID);
        const input = document.getElementById(VIN_INPUT_ID);
        const result = document.getElementById(VIN_RESULT_ID);

        if (!form || !input || !result) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const vin = input.value.trim().toUpperCase();

            if (!VIN_PATTERN.test(vin)) {
                result.textContent = 'Podaj poprawny numer VIN (11-17 znakow, bez liter O oraz I).';
                return;
            }

            result.textContent = 'Trwa wyszukiwanie w bazie...';

            try {
                const reports = await window.WarsztatApi.get(`/reports/public/${vin}`, { auth: false });
                renderResult(result, vin, Array.isArray(reports) ? reports : []);
            } catch (error) {
                console.error('Nie udalo sie pobrac raportow', error);
                result.textContent = 'Nie udalo sie polaczyc z API. Sprobuj ponownie pozniej.';
            }
        });
    });
})();
