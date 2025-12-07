(function () {
			// --- Obsługa kliknięcia na kartę warsztatu i pobieranie szczegółów ---
			document.addEventListener('click', async function (e) {
				const card = e.target.closest('.workshop-card[data-id]');
				if (card) {
					const id = card.getAttribute('data-id');
					if (!id) return;
					showWorkshopDetail(id);
				}
			});

			async function showWorkshopDetail(id) {
				const detail = document.getElementById('workshop-browser-detail');
				const list = document.getElementById('workshop-browser-list');
				if (!detail || !list) return;
				detail.hidden = false;
				detail.style.display = '';
				list.hidden = true;
				list.style.display = 'none';
				// Loader
				const title = document.getElementById('workshop-detail-title');
				if (title) title.textContent = 'Ładowanie...';
				// Pobierz szczegóły warsztatu
				try {
					const res = await fetch(`/api/workshops/${id}`, { credentials: 'include' });
					if (!res.ok) throw new Error('Błąd pobierania szczegółów warsztatu');
					const data = await res.json();
					renderWorkshopDetail(data);
				} catch (err) {
					if (title) title.textContent = 'Błąd ładowania';
				}
			}

			function renderWorkshopDetail(data) {
				// Ustaw nagłówek
				const title = document.getElementById('workshop-detail-title');
				if (title) title.textContent = data.name || 'Szczegóły warsztatu';
				
				// Ustaw dane w sekcji Aktywność/Abonament
				const sub = document.getElementById('workshop-detail-subscription');
				if (sub) {
					sub.innerHTML = `
						<div class="workshop-detail__item"><strong>Status abonamentu</strong><div>${data.subscriptionAmount ? 'Aktywny' : 'Brak danych'}</div></div>
						<div class="workshop-detail__item"><strong>Kwota miesięczna</strong><div>${data.subscriptionAmount || 'Brak danych'}</div></div>
						<div class="workshop-detail__item"><strong>Start umowy</strong><div>${data.subscriptionStartDate || 'Brak danych'}</div></div>
						<div class="workshop-detail__item"><strong>Koniec okresu 12 mies.</strong><div>${data.subscriptionStartDate && data.subscriptionMonths ? getEndDate(data.subscriptionStartDate, data.subscriptionMonths) : 'Brak danych'}</div></div>
						<div class="workshop-detail__item"><strong>E-mail do faktur</strong><div>${data.billingEmail || 'Brak danych'}</div></div>
					`;
				}
				
				// Ustaw dane w formularzu ustawień
				const settingsForm = document.getElementById('workshop-settings-form');
				if (settingsForm) {
					Array.from(settingsForm.elements).forEach(el => {
						if (!el.name) return;
						if (el.type === 'checkbox') {
							el.checked = !!data[el.name];
						} else {
							el.value = data[el.name] || '';
						}
					});
				}
				
				// Renderuj dodatkowe sekcje
				renderWorkshopLogs();
				renderWorkshopTickets();
				renderWorkshopReports(data.id);
			}

			// Funkcje pomocnicze
			async function renderWorkshopLogs() {
				const logsList = document.getElementById('workshop-detail-logs');
				if (!logsList) return;
				logsList.innerHTML = '<li>Ładowanie logów...</li>';
				try {
					const res = await fetch('/api/logs?limit=30', { credentials: 'include' });
					if (!res.ok) throw new Error('Błąd pobierania logów');
					const logs = await res.json();
					if (!Array.isArray(logs) || logs.length === 0) {
						logsList.innerHTML = '<li>Brak logów do wyświetlenia.</li>';
						return;
					}
					logsList.innerHTML = logs.map(renderLogItem).join('');
				} catch (err) {
					logsList.innerHTML = `<li>${err.message || 'Błąd sieci'}</li>`;
				}
			}

			function renderLogItem(log) {
				return `<li><b>${log.createdAt ? log.createdAt.substring(0, 16).replace('T', ' ') : ''}</b> — ${log.message || ''}</li>`;
			}

			function renderWorkshopTickets() {
				const tickets = document.getElementById('workshop-detail-tickets');
				if (tickets) {
					tickets.innerHTML = '<div class="panel-empty">Brak obsługi zgłoszeń w API.</div>';
				}
			}

			async function renderWorkshopReports(workshopId) {
				const reportsList = document.getElementById('workshop-reports-list');
				if (!reportsList) return;
				reportsList.innerHTML = '<div class="panel-loading">Ładowanie raportów...</div>';
				try {
					const res = await fetch(`/api/reports?workshopId=${encodeURIComponent(workshopId)}`, { credentials: 'include' });
					if (!res.ok) throw new Error('Błąd pobierania raportów');
					const reports = await res.json();
					if (!Array.isArray(reports) || reports.length === 0) {
						reportsList.innerHTML = '<div class="panel-empty">Brak raportów dla tego warsztatu.</div>';
						return;
					}
					reportsList.innerHTML = `
						<div class="panel-debug" style="background:#ffe;border:1px solid #cc0;padding:4px 8px;margin-bottom:8px;font-size:13px;">
							<b>Debug:</b> workshopId = <code>${workshopId}</code>, raportów = <b>${reports.length}</b>
						</div>
						${reports.map(renderReportItem).join('')}
					`;
				} catch (err) {
					reportsList.innerHTML = `<div class="panel-error">${err.message || 'Błąd sieci'}</div>`;
				}
			}

			function renderReportItem(r) {
				return `
					<div class="report-item">
						<div><b>VIN:</b> ${r.vin || '-'}</div>
						<div><b>Status:</b> ${r.status || '-'}</div>
						<div><b>Podsumowanie:</b> ${r.summary || '-'}</div>
						<div><b>Data:</b> ${r.updatedAt || '-'}</div>
					</div>
				`;
			}

			// --- Renderowanie listy warsztatów z backendu ---
			async function fetchWorkshops() {
				const list = document.getElementById('workshop-list');
				if (!list) return;
				list.innerHTML = '<div class="panel-loading">Ładowanie warsztatów...</div>';
			reportsList.innerHTML = '<div class="panel-loading">Ładowanie raportów...</div>';
			try {
				const res = await fetch(`/api/reports?workshopId=${encodeURIComponent(workshopId)}`, { credentials: 'include' });
				if (!res.ok) throw new Error('Błąd pobierania raportów');
				const reports = await res.json();
				if (!Array.isArray(reports) || reports.length === 0) {
					reportsList.innerHTML = '<div class="panel-empty">Brak raportów dla tego warsztatu.</div>';
					return;
				}
				   // DEBUG: Wyświetl ID warsztatu i liczbę raportów
				   reportsList.innerHTML = `
					   <div class="panel-debug" style="background:#ffe;border:1px solid #cc0;padding:4px 8px;margin-bottom:8px;font-size:13px;">
						   <b>Debug:</b> workshopId = <code>${workshopId}</code>, raportów = <b>${reports.length}</b>
					   </div>
					   ${reports.map(renderReportItem).join('')}
				   `;
			} catch (err) {
				reportsList.innerHTML = `<div class="panel-error">${err.message || 'Błąd sieci'}</div>`;
			}
		}

		function renderReportItem(r) {
			return `
				<div class="report-item">
					<div><b>VIN:</b> ${r.vin || '-'}</div>
					<div><b>Status:</b> ${r.status || '-'}</div>
					<div><b>Podsumowanie:</b> ${r.summary || '-'}</div>
					<div><b>Data:</b> ${r.updatedAt || '-'}</div>
				</div>
			`;
		}
			}
		}

		// Automatyczne ładowanie listy warsztatów po wejściu na panel
		document.addEventListener('DOMContentLoaded', fetchWorkshops);
	// --- Warsztat Panel Tabs ---
	document.addEventListener('DOMContentLoaded', function () {
		// --- Obsługa przycisku Powrót do listy (delegacja, bo może być renderowany dynamicznie) ---
		document.body.addEventListener('click', function (e) {
			if (e.target && e.target.id === 'workshop-list-back') {
				// Ukryj szczegóły warsztatu
				var detail = document.getElementById('workshop-browser-detail');
				if (detail) {
					detail.hidden = true;
					detail.style.display = 'none';
				}
				// Pokaż listę warsztatów
				var list = document.getElementById('workshop-browser-list');
				if (list) {
					list.hidden = false;
					list.style.display = '';
				}
				// Przewiń do nagłówka listy
				var header = document.querySelector('.panel-section__eyebrow');
				if (header) header.scrollIntoView({behavior: 'smooth', block: 'start'});
			}
		});

		// --- Obsługa formularza ustawień warsztatu ---
		let currentWorkshopId = null;
		const settingsForm = document.getElementById('workshop-settings-form');
		if (settingsForm) {
			settingsForm.addEventListener('submit', async function (e) {
				e.preventDefault();
				if (!currentWorkshopId) {
					alert('Brak wybranego warsztatu!');
					return;
				}
				const data = {};
				Array.from(settingsForm.elements).forEach(el => {
					if (!el.name) return;
					if (el.type === 'checkbox') {
						data[el.name] = el.checked;
					} else {
						data[el.name] = el.value;
					}
				});
				try {
					const res = await fetch(`/api/workshops/${currentWorkshopId}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify(data)
					});
					if (!res.ok) throw new Error('Błąd zapisu danych warsztatu');
					alert('Dane warsztatu zapisane!');
				} catch (err) {
					alert(err.message || 'Błąd sieci');
				}
			});
		}
	// Obsługa przycisku "Dezaktywuj konto"
	document.addEventListener('click', async function (e) {
		if (e.target && e.target.id === 'workshop-deactivate-btn') {
			if (!currentWorkshopId) {
				alert('Brak wybranego warsztatu!');
				return;
			}
			if (!confirm('Czy na pewno chcesz dezaktywować ten warsztat?')) return;
			try {
				const res = await fetch(`/api/workshops/${currentWorkshopId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ status: 'deactivated' })
				});
				if (!res.ok) throw new Error('Błąd dezaktywacji warsztatu');
				alert('Warsztat został dezaktywowany.');
				// Odśwież szczegóły
				showWorkshopDetail(currentWorkshopId);
			} catch (err) {
				alert(err.message || 'Błąd sieci');
			}
		}
	});

		// --- Renderuj sekcję Aktywność/Stan umowy na podstawie danych z localStorage ---
		function renderWorkshopSubscription(data) {
			const sub = document.getElementById('workshop-detail-subscription');
			if (!sub) return;
			data = data || JSON.parse(localStorage.getItem('workshop:settings') || '{}');
			sub.innerHTML = `
				<div class="workshop-detail__item"><strong>Status abonamentu</strong><div>${data.subscriptionAmount ? 'Aktywny' : 'Brak danych'}</div></div>
				<div class="workshop-detail__item"><strong>Kwota miesięczna</strong><div>${data.subscriptionAmount || 'Brak danych'}</div></div>
				<div class="workshop-detail__item"><strong>Start umowy</strong><div>${data.subscriptionStartDate || 'Brak danych'}</div></div>
				<div class="workshop-detail__item"><strong>Koniec okresu 12 mies.</strong><div>${data.subscriptionStartDate && data.subscriptionMonths ? getEndDate(data.subscriptionStartDate, data.subscriptionMonths) : 'Brak danych'}</div></div>
				<div class="workshop-detail__item"><strong>E-mail do faktur</strong><div>${data.billingEmail || 'Brak danych'}</div></div>
			`;
		}
		function getEndDate(start, months) {
			try {
				const d = new Date(start);
				d.setMonth(d.getMonth() + parseInt(months, 10));
				return d.toLocaleDateString('pl-PL');
			} catch { return 'Brak danych'; }
		}
		// Renderuj sekcję przy starcie
		renderWorkshopSubscription();

		// --- Synchronizacja: po przełączeniu na zakładkę Aktywność lub Ustawienia ---
		document.body.addEventListener('click', function (e) {
			if (e.target && e.target.classList.contains('workshop-tab')) {
				setTimeout(() => {
					renderWorkshopSubscription();
					if (settingsForm) {
						const tab = e.target.getAttribute('data-tab');
						if (tab === 'settings') {
							const data = JSON.parse(localStorage.getItem('workshop:settings') || '{}');
							Array.from(settingsForm.elements).forEach(el => {
								if (!el.name) return;
								if (el.type === 'checkbox') {
									el.checked = !!data[el.name];
								} else {
									el.value = data[el.name] || '';
								}
							});
						}
					}
				}, 100);
			}
		});
		const tabButtons = document.querySelectorAll('.tabs .tab');
		const tabContents = document.querySelectorAll('.tab-content');
		if (tabButtons.length) {
			tabButtons.forEach(btn => {
				btn.addEventListener('click', function () {
					// Deactivate all tabs
					tabButtons.forEach(b => b.classList.remove('active'));
					// Hide all contents
					tabContents.forEach(c => c.style.display = 'none');
					// Activate clicked tab
					this.classList.add('active');
					const tab = this.getAttribute('data-tab');
					const content = document.getElementById('tab-' + tab);
					if (content) content.style.display = '';
				});
			});
		}
	});
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