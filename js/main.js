(function () {
	const REPORTS_KEY = 'warsztat:reports';
	const VIN_FORM_ID = 'vin-form';
	const VIN_INPUT_ID = 'vin-input';
	const VIN_RESULT_ID = 'vin-result';

	const seedReports = () => {
		if (localStorage.getItem(REPORTS_KEY)) {
			return;
		}

		const demoReports = [
			{
				vin: 'WAUZZZ8V9JA123456',
				workshop: 'Auto Serwis 24',
				status: 'Zakonczona',
				updatedAt: '2024-11-18',
				summary: 'Wymiana rozrzadu oraz oleju.'
			},
			{
				vin: 'VF3LCBHY6HS789012',
				workshop: 'MotorTech Pro',
				status: 'W trakcie',
				updatedAt: '2025-01-05',
				summary: 'Diagnostyka elektroniki silnika.'
			}
		];

		localStorage.setItem(REPORTS_KEY, JSON.stringify(demoReports));
	};

	const loadReports = () => {
		try {
			return JSON.parse(localStorage.getItem(REPORTS_KEY)) || [];
		} catch (error) {
			console.warn('Nie udalo sie odczytac raportow', error);
			return [];
		}
	};

	const validateVin = (value) => /^[A-HJ-NPR-Z0-9]{11,17}$/.test(value);

	const renderResult = (container, vin, reports) => {
		if (!reports.length) {
			container.textContent = 'Brak raportow dla podanego VIN. Wkrotce dodamy wiecej danych.';
			return;
		}

		const items = reports
			.map((report) => `
				<article class="vin-card">
					<header>
						<strong>${report.workshop}</strong>
						<span>Status: ${report.status}</span>
					</header>
					<p>${report.summary}</p>
					<footer>Aktualizacja: ${report.updatedAt}</footer>
				</article>
			`)
			.join('');

		container.innerHTML = `
			<p>Znaleziono ${reports.length} raport(y) dla VIN <strong>${vin}</strong>:</p>
			<div class="vin-card-list">${items}</div>
		`;
	};

	document.addEventListener('DOMContentLoaded', () => {
		seedReports();

		const form = document.getElementById(VIN_FORM_ID);
		const input = document.getElementById(VIN_INPUT_ID);
		const result = document.getElementById(VIN_RESULT_ID);

		if (!form || !input || !result) {
			return;
		}

		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const vin = input.value.trim().toUpperCase();

			if (!validateVin(vin)) {
				result.textContent = 'Podaj poprawny numer VIN (11-17 znakow, bez liter O oraz I).';
				return;
			}

			const reports = loadReports().filter((item) => item.vin === vin);
			renderResult(result, vin, reports);
		});
	});
})();