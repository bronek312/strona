(function () {
    const LOGIN_URL = 'login.html';
    const APPROVAL_META = {
        pending: { label: 'Oczekuje na akceptacje', className: 'panel-tag--warning' },
        approved: { label: 'Zatwierdzony', className: 'panel-tag--success' },
        rejected: { label: 'Odrzucony', className: 'panel-tag--danger' }
    };
    const WORKSHOP_STATUS_META = {
        active: { label: 'Aktywny', className: 'panel-tag--success' },
        inactive: { label: 'Nieaktywny', className: 'panel-tag--muted' },
        notice: { label: 'W okresie wypowiedzenia', className: 'panel-tag--notice' },
        deactivated: { label: 'Dezaktywowany', className: 'panel-tag--danger' }
    };

    const formatDateTime = (value) => {
        if (!value) {
            return '—';
        }
        try {
            return new Date(value).toLocaleString('pl-PL', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return value;
        }
    };

    const formatShortDate = (value) => {
        if (!value) {
            return '—';
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

    const formatBillingMonth = (value) => {
        if (!value) {
            return 'Brak miesiaca';
        }
        const [year, month] = String(value)
            .split('-')
            .map((chunk) => Number(chunk));
        if (!year || !month) {
            return value;
        }
        try {
            const date = new Date(Date.UTC(year, month - 1, 1));
            return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' });
        } catch (error) {
            return value;
        }
    };

    const formatMileage = (value) => {
        if (value === null || typeof value === 'undefined') {
            return 'Brak danych';
        }
        const mileage = Number(value);
        if (!Number.isFinite(mileage) || mileage < 0) {
            return 'Brak danych';
        }
        return `${mileage.toLocaleString('pl-PL')} km`;
    };

    const formatCurrency = (value, currency = 'PLN') => {
        const amount = Number(value);
        if (!Number.isFinite(amount)) {
            return 'Brak danych';
        }
        try {
            return new Intl.NumberFormat('pl-PL', {
                style: 'currency',
                currency,
                minimumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            return `${amount.toFixed(2)} ${currency}`;
        }
    };

    const getWorkshopInitials = (name) => {
        if (!name) {
            return 'W+';
        }
        const parts = String(name)
            .trim()
            .split(/\s+/)
            .filter((chunk) => chunk && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(chunk))
            .slice(0, 2)
            .map((chunk) => chunk[0]?.toUpperCase())
            .filter(Boolean);
        return parts.length ? parts.join('') : 'W+';
    };

    const addMonths = (value, months) => {
        if (!value || !Number.isFinite(months)) {
            return null;
        }
        const date = new Date(value.getTime());
        date.setMonth(date.getMonth() + months);
        return date;
    };

    const monthsBetweenDates = (futureDate, baseDate = new Date()) => {
        if (!futureDate || !baseDate) {
            return null;
        }
        const years = futureDate.getFullYear() - baseDate.getFullYear();
        const months = futureDate.getMonth() - baseDate.getMonth();
        const totalMonths = years * 12 + months;
        const adjust = futureDate.getDate() >= baseDate.getDate() ? 0 : -1;
        return Math.max(0, totalMonths + adjust);
    };

    const getWorkshopLicenseSummary = (workshop) => {
        const licenseSetting = Number(state.settings?.licenseMonths);
        const startedAt = toDate(workshop.licenseStartedAt);
        const expiresAt = toDate(workshop.licenseExpiresAt) || (startedAt && addMonths(startedAt, licenseSetting));
        const noticeEndsAt = toDate(workshop.noticeEndsAt);
        const remainingMonths = expiresAt ? monthsBetweenDates(expiresAt) : null;
        return {
            expiresLabel: expiresAt ? formatShortDate(expiresAt) : null,
            remainingMonths,
            noticeEndsLabel: noticeEndsAt ? formatShortDate(noticeEndsAt) : null
        };
    };

    const toDate = (value) => {
        if (!value) {
            return null;
        }
        try {
            return new Date(value);
        } catch (error) {
            return null;
        }
    };

    const isSameDay = (value, reference = new Date()) => {
        const date = toDate(value);
        if (!date) {
            return false;
        }
        return (
            date.getFullYear() === reference.getFullYear() &&
            date.getMonth() === reference.getMonth() &&
            date.getDate() === reference.getDate()
        );
    };

    const daysBetween = (newer, older) => {
        if (!newer || !older) {
            return Infinity;
        }
        const ms = newer.getTime() - older.getTime();
        return Math.floor(ms / (1000 * 60 * 60 * 24));
    };

    const sortByDateDesc = (items, selector) =>
        [...items].sort((a, b) => {
            const left = toDate(selector(a))?.getTime() || 0;
            const right = toDate(selector(b))?.getTime() || 0;
            return right - left;
        });

    const setFeedback = (element, message, type) => {
        if (!element) {
            return;
        }
        element.textContent = message;
        element.classList.remove('is-error', 'is-success');
        if (type) {
            element.classList.add(type === 'error' ? 'is-error' : 'is-success');
        }
    };

    const handleAuthError = (error) => {
        if (error?.status === 401 || error?.status === 403) {
            window.WarsztatSession?.clear();
            window.location.href = LOGIN_URL;
            return true;
        }
        return false;
    };

    const normalizeString = (value) => String(value ?? '').trim();
    const toNullable = (value) => {
        const normalized = normalizeString(value);
        return normalized.length ? normalized : null;
    };
    const toOptional = (value) => {
        const normalized = normalizeString(value);
        return normalized.length ? normalized : undefined;
    };
    const toEmail = (value) => {
        const normalized = normalizeString(value).toLowerCase();
        return normalized.length ? normalized : null;
    };
    const toDateOnly = (value) => {
        const normalized = normalizeString(value);
        return normalized.length ? normalized : null;
    };
    const toMoneyValue = (value) => {
        if (value === null || typeof value === 'undefined') {
            return null;
        }
        const normalized = normalizeString(String(value).replace(',', '.'));
        if (!normalized) {
            return null;
        }
        const amount = Number(normalized);
        return Number.isFinite(amount) ? Number(amount.toFixed(2)) : null;
    };
    const toDateInputValue = (value) => {
        const date = toDate(value);
        if (!date) {
            return '';
        }
        return date.toISOString().slice(0, 10);
    };

    const state = {
        reports: [],
        media: [],
        news: [],
        workshops: [],
        settings: null,
        logs: [],
        filters: {
            vin: '',
            registration: '',
            approval: 'all'
        },
        workshopFilters: {
            query: '',
            status: 'all'
        },
        selectedReportId: null,
        editingWorkshopId: null,
        focusedWorkshopId: null,
        workshopDetailRecord: null,
        workshopDetails: null,
        workshopReports: [],
        workshopUploads: [],
        workshopUploadWarning: false,
        workshopDetailViewActive: false,
        workshopDetailLoading: false,
        workshopDetailError: null,
        workshopBillingEditId: null,
        metricDetails: {},
        metricDrawerKey: null,
        workshopDrawerOpen: false,
        session: null,
        isAdmin: true
    };

    const WORKSHOP_TOOLBAR_HINT_DEFAULT = 'Wybierz warsztat, aby zobaczyc szczegoly.';
    const elements = {};
    let workshopEventsBound = false;

    const setWorkshopToolbarHint = (message = WORKSHOP_TOOLBAR_HINT_DEFAULT) => {
        if (elements.workshopToolbarHint) {
            elements.workshopToolbarHint.textContent = message;
        }
    };

    const bindDom = () => {
        elements.username = document.getElementById('panel-username');
        elements.role = document.getElementById('panel-role');
        elements.logoutBtn = document.getElementById('logout-btn');
        elements.navButtons = document.querySelectorAll('.panel-nav__link');
        elements.views = document.querySelectorAll('.panel-view');
        elements.metrics = document.getElementById('overview-metrics');
        elements.overviewLogs = document.getElementById('overview-logs');
        elements.adminActions = document.getElementById('admin-actions');
        elements.reportList = document.getElementById('report-list');
        elements.reportFilterForm = document.getElementById('report-filter-form');
        elements.reportEditForm = document.getElementById('report-edit-form');
        elements.reportFeedback = document.getElementById('report-feedback');
        elements.reportMediaGallery = document.getElementById('report-media-gallery');
        elements.workshopList = document.getElementById('workshop-list');
        elements.workshopFilterForm = document.getElementById('workshop-filter-form');
        elements.workshopFilterReset = document.getElementById('workshop-filter-reset');
        elements.workshopAddBtn = document.getElementById('workshop-add-btn');
        elements.workshopToolbarList = document.getElementById('workshop-toolbar-list');
        elements.workshopToolbarDetail = document.getElementById('workshop-toolbar-detail');
        elements.workshopToolbarHint = document.getElementById('workshop-toolbar-hint');
        elements.workshopForm = document.getElementById('create-workshop-form');
        elements.workshopFeedback = document.getElementById('workshop-feedback');
        elements.workshopFormEyebrow = document.getElementById('workshop-drawer-eyebrow');
        elements.workshopFormTitle = document.getElementById('workshop-drawer-title');
        elements.workshopFormSubmit = document.querySelector('[data-workshop-form-submit]');
        elements.workshopCancelBtn = document.getElementById('workshop-cancel-edit');
        elements.workshopDrawer = document.getElementById('workshop-drawer');
        elements.workshopDrawerClose = document.getElementById('workshop-drawer-close');
        elements.workshopDrawerBackdrop = document.getElementById('workshop-drawer-backdrop');
        elements.settingsForm = document.getElementById('settings-form');
        elements.settingsFeedback = document.getElementById('settings-feedback');
        elements.logsContainer = document.getElementById('logs-full');
        elements.logsRefreshBtn = document.getElementById('logs-refresh-btn');
        elements.inactiveWorkshopsList = document.getElementById('inactive-workshops-list');
        elements.workshopDetails = document.getElementById('workshop-details');
        elements.workshopListView = document.getElementById('workshop-browser-list');
        elements.workshopDetailView = document.getElementById('workshop-browser-detail');
        elements.workshopReportList = document.getElementById('workshop-report-list');
        elements.workshopReportForm = document.getElementById('workshop-report-form');
        elements.workshopReportFeedback = document.getElementById('workshop-report-feedback');
        elements.workshopMediaPreview = document.getElementById('workshop-media-preview');
        elements.metricDrawer = document.getElementById('metric-drawer');
        elements.metricDrawerTitle = document.getElementById('metric-drawer-title');
        elements.metricDrawerEyebrow = document.getElementById('metric-drawer-eyebrow');
        elements.metricDrawerDescription = document.getElementById('metric-drawer-description');
        elements.metricDrawerContent = document.getElementById('metric-drawer-content');
        elements.metricDrawerClose = document.getElementById('metric-drawer-close');
        elements.metricDrawerBackdrop = document.getElementById('metric-drawer-backdrop');
        elements.workshopDetailTitle = document.getElementById('workshop-detail-title');
        elements.workshopDetailEyebrow = document.getElementById('workshop-detail-eyebrow');
        elements.workshopDetailBack = document.getElementById('workshop-detail-back');
        elements.workshopDetailOverview = document.getElementById('workshop-detail-overview');
        elements.workshopDetailSubscription = document.getElementById('workshop-detail-subscription');
        elements.workshopDetailFeedback = document.getElementById('workshop-detail-feedback');
        elements.workshopBillingList = document.getElementById('workshop-billing-list');
        elements.workshopBillingForm = document.getElementById('workshop-billing-form');
        elements.workshopBillingFeedback = document.getElementById('workshop-billing-feedback');
    };

    const disableLegacyViews = () => {
        const placeholders = [];
        placeholders.forEach((name) => {
            const view = document.querySelector(`[data-panel="${name}"]`);
            if (view) {
                view.innerHTML = `
                    <div class="panel-card">
                        <p class="panel-empty">Sekcja w przebudowie. Wkrotce dodamy nowe funkcjonalnosci.</p>
                    </div>
                `;
            }
        });
    };

    const renderWorkshopSummary = () => {
        if (!elements.workshopDetails) {
            return;
        }
        if (!state.workshopDetails) {
            elements.workshopDetails.innerHTML = '<p class="panel-empty">Trwa ladowanie profilu warsztatu...</p>';
            return;
        }
        const workshop = state.workshopDetails;
        const meta = WORKSHOP_STATUS_META[workshop.status] || WORKSHOP_STATUS_META.inactive;
        const address = [workshop.city, workshop.address].filter(Boolean).join(' • ');
        const contact = [workshop.email, workshop.phone].filter(Boolean).join(' • ');
        const loginEmail = state.session?.user?.email || workshop.loginEmail || workshop.email || 'Brak e-maila logowania';
        const licenseInfo = state.settings?.licenseMonths
            ? `Standardowa licencja: ${state.settings.licenseMonths} miesiecy.`
            : 'Licencja aktywna – brak dodatkowych wymagan.';

        elements.workshopDetails.innerHTML = `
            <div>
                <strong>${workshop.name}</strong>
                <p>${address || 'Brak przypisanego adresu'}</p>
                <div class="workshop-summary__meta">
                    <span class="panel-tag ${meta.className}">${meta.label}</span>
                    <span>${loginEmail}</span>
                    ${contact ? `<span>${contact}</span>` : ''}
                </div>
            </div>
            <div class="workshop-summary__contract">
                <strong>Status licencji</strong>
                <p>${licenseInfo}</p>
                ${workshop.notes ? `<p class="panel-contract-info">${workshop.notes}</p>` : ''}
            </div>
        `;
    };

    const renderWorkshopReportList = () => {
        if (!elements.workshopReportList) {
            return;
        }
        if (!state.workshopReports.length) {
            elements.workshopReportList.innerHTML = '<p class="panel-empty">Nie dodales jeszcze zadnych raportow.</p>';
            return;
        }

        elements.workshopReportList.innerHTML = state.workshopReports
            .map((report) => {
                const approval = APPROVAL_META[report.approvalStatus] || APPROVAL_META.pending;
                const workshopStatus = report.status || 'W trakcie';
                const summary = report.summary || 'Brak opisu naprawy.';
                const note = report.moderationNote
                    ? `<div class="panel-report-note panel-report-note--danger">${report.moderationNote}</div>`
                    : '';
                return `
                <article class="panel-list__item panel-list__item--stacked">
                    <div>
                        <strong>${report.vin || 'Brak VIN'}</strong>
                        <ul class="panel-report-meta">
                            <li>Status warsztatu: ${workshopStatus}</li>
                            <li>Ostatnia aktualizacja: ${formatShortDate(report.updatedAt)}</li>
                            <li>Rejestracja: ${report.registrationNumber || 'Brak danych'}</li>
                        </ul>
                        <p>${summary}</p>
                        ${note}
                    </div>
                    <div class="panel-list__item-actions panel-list__item-actions--compact">
                        <span class="panel-tag ${approval.className}">${approval.label}</span>
                        <small>${report.approvalStatus === 'approved' ? 'Zatwierdzono' : 'Oczekuje na akceptacje'}</small>
                    </div>
                </article>
            `;
            })
            .join('');
    };

    const renderWorkshopUploads = () => {
        if (!elements.workshopMediaPreview) {
            return;
        }
        if (!state.workshopUploads.length) {
            const message = state.workshopUploadWarning
                ? 'Wybrano za duzo plikow. Maksymalnie 5 zalacznikow zostanie zachowanych.'
                : 'Nie wybrano plikow. Zalaczniki beda wysylane w kolejnej iteracji.';
            elements.workshopMediaPreview.innerHTML = `<li class="panel-upload__warning">${message}</li>`;
            return;
        }
        let items = state.workshopUploads
            .map((file) => {
                const sizeMb = Math.max(file.size / (1024 * 1024), 0.01).toFixed(2);
                return `<li><span>${file.name}</span><small>${sizeMb} MB</small></li>`;
            })
            .join('');
        if (state.workshopUploadWarning) {
            items += '<li class="panel-upload__warning">Tylko pierwszych 5 plikow zostalo dodanych.</li>';
        }
        elements.workshopMediaPreview.innerHTML = items;
    };

    const renderMetricDrawer = (detail) => {
        if (!elements.metricDrawer) {
            return;
        }
        elements.metricDrawerTitle.textContent = detail?.title || 'Szczegoly';
        elements.metricDrawerEyebrow.textContent = detail?.eyebrow || '';
        elements.metricDrawerDescription.textContent = detail?.description || '';
        if (!detail?.items?.length) {
            elements.metricDrawerContent.innerHTML = '<p class="panel-empty">Brak danych do wyswietlenia.</p>';
            return;
        }
        elements.metricDrawerContent.innerHTML = detail.items
            .map((item) => {
                const subtitle = item.subtitle ? `<small>${item.subtitle}</small>` : '';
                const meta = item.meta ? `<small>${item.meta}</small>` : '';
                return `
                <div class="panel-drawer__item">
                    <strong>${item.title}</strong>
                    ${subtitle}
                    ${meta}
                </div>
            `;
            })
            .join('');
    };

    const openMetricDrawer = (key) => {
        const detail = state.metricDetails[key];
        if (!detail || !detail.items?.length) {
            return;
        }
        state.metricDrawerKey = key;
        renderMetricDrawer(detail);
        elements.metricDrawer?.classList.add('is-open');
        elements.metricDrawer?.setAttribute('aria-hidden', 'false');
        if (elements.metricDrawerBackdrop) {
            elements.metricDrawerBackdrop.hidden = false;
        }
    };

    const closeMetricDrawer = () => {
        state.metricDrawerKey = null;
        elements.metricDrawer?.classList.remove('is-open');
        elements.metricDrawer?.setAttribute('aria-hidden', 'true');
        if (elements.metricDrawerBackdrop) {
            elements.metricDrawerBackdrop.hidden = true;
        }
    };

    const focusWorkshopFormFirstField = () => {
        const firstField = elements.workshopForm?.querySelector('input, select, textarea');
        if (firstField) {
            window.requestAnimationFrame(() => firstField.focus());
        }
    };

    const openWorkshopDrawer = () => {
        if (!elements.workshopDrawer) {
            return;
        }
        elements.workshopDrawer.classList.add('is-open');
        elements.workshopDrawer.setAttribute('aria-hidden', 'false');
        if (elements.workshopDrawerBackdrop) {
            elements.workshopDrawerBackdrop.hidden = false;
        }
        state.workshopDrawerOpen = true;
        focusWorkshopFormFirstField();
    };

    const closeWorkshopDrawer = () => {
        if (!elements.workshopDrawer) {
            return;
        }
        elements.workshopDrawer.classList.remove('is-open');
        elements.workshopDrawer.setAttribute('aria-hidden', 'true');
        if (elements.workshopDrawerBackdrop) {
            elements.workshopDrawerBackdrop.hidden = true;
        }
        state.workshopDrawerOpen = false;
    };

    const loadWorkshopDashboard = async () => {
        try {
            setFeedback(elements.workshopReportFeedback, 'Ladowanie danych warsztatu...', null);
            const [workshop, reports, settings] = await Promise.all([
                window.WarsztatApi.get('/workshops/me'),
                window.WarsztatApi.get('/reports/mine'),
                window.WarsztatApi.get('/settings')
            ]);
            state.workshopDetails = workshop || null;
            state.workshopReports = Array.isArray(reports) ? reports : [];
            state.settings = settings || state.settings;
            renderWorkshopSummary();
            renderWorkshopReportList();
            setFeedback(elements.workshopReportFeedback, 'Dane zaladowane. Mozesz dodawac raporty.', 'success');
        } catch (error) {
            if (handleAuthError(error)) {
                return;
            }
            const message = error.details?.message || 'Nie udalo sie pobrac danych warsztatu.';
            setFeedback(elements.workshopReportFeedback, message, 'error');
        }
    };

    const bindWorkshopEvents = () => {
        if (workshopEventsBound) {
            return;
        }
        workshopEventsBound = true;

        const mediaInput = elements.workshopReportForm?.querySelector('input[name="mediaFiles"]');
        mediaInput?.addEventListener('change', (event) => {
            const files = Array.from(event.target.files || []);
            const limited = files.slice(0, 5);
            state.workshopUploadWarning = files.length > limited.length;
            state.workshopUploads = limited;
            renderWorkshopUploads();
        });

        elements.workshopReportForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = new FormData(elements.workshopReportForm);
            const vin = normalizeString(data.get('vin')).toUpperCase();
            const registrationNumber = normalizeString(data.get('registrationNumber')).toUpperCase();
            const summary = String(data.get('summary') || '').trim();
            const firstRegistrationDate = normalizeString(data.get('firstRegistrationDate')) || null;
            const mileageValue = Number(data.get('mileageKm'));
            const mileageKm = Number.isFinite(mileageValue) && mileageValue >= 0 ? mileageValue : null;

            if (!vin) {
                setFeedback(elements.workshopReportFeedback, 'Podaj numer VIN.', 'error');
                return;
            }
            if (!registrationNumber) {
                setFeedback(elements.workshopReportFeedback, 'Podaj numer rejestracyjny.', 'error');
                return;
            }
            if (!firstRegistrationDate) {
                setFeedback(elements.workshopReportFeedback, 'Podaj date pierwszej rejestracji.', 'error');
                return;
            }
            if (summary.length < 10) {
                setFeedback(elements.workshopReportFeedback, 'Opis powinien miec co najmniej 10 znakow.', 'error');
                return;
            }

            const payload = {
                vin,
                registrationNumber,
                mileageKm,
                firstRegistrationDate,
                summary,
                status: 'W trakcie'
            };

            try {
                setFeedback(elements.workshopReportFeedback, 'Wysylanie raportu...', null);
                const report = await window.WarsztatApi.post('/reports/mine', payload);
                state.workshopReports = [report, ...state.workshopReports];
                elements.workshopReportForm?.reset();
                state.workshopUploads = [];
                state.workshopUploadWarning = false;
                renderWorkshopUploads();
                renderWorkshopReportList();
                setFeedback(elements.workshopReportFeedback, 'Raport przekazany do administratora.', 'success');
            } catch (error) {
                if (handleAuthError(error)) {
                    return;
                }
                const message = error.details?.message || 'Nie udalo sie zapisac raportu.';
                setFeedback(elements.workshopReportFeedback, message, 'error');
            }
        });
    };

    const handleMetricClick = (event) => {
        const trigger = event.target.closest('[data-metric-key]');
        if (!trigger) {
            return;
        }
        if (!trigger.classList.contains('metric-card--action')) {
            return;
        }
        const key = trigger.dataset.metricKey;
        if (!key) {
            return;
        }
        openMetricDrawer(key);
    };

    const handleDrawerKeydown = (event) => {
        if (event.key !== 'Escape') {
            return;
        }
        if (state.metricDrawerKey) {
            closeMetricDrawer();
            return;
        }
        if (state.workshopDetailViewActive) {
            hideWorkshopDetailView();
            return;
        }
        if (state.workshopDrawerOpen) {
            closeWorkshopDrawer();
            resetWorkshopForm();
            setFeedback(elements.workshopFeedback, '', null);
        }
    };

    const activateWorkshopMode = (session) => {
        document.body.classList.add('panel-body--workshop');
        elements.navButtons?.forEach((btn) => {
            btn.style.display = 'none';
        });
        elements.views?.forEach((view) => {
            const isWorkshopView = view.dataset.panel === 'workshop-home';
            view.classList.toggle('is-active', isWorkshopView);
            if (!isWorkshopView) {
                view.remove();
            }
        });

        if (elements.username) {
            elements.username.textContent = session.user?.email || 'Warsztat';
        }
        if (elements.role) {
            elements.role.textContent = 'Warsztat';
        }

        bindWorkshopEvents();
        renderWorkshopSummary();
        renderWorkshopReportList();
        renderWorkshopUploads();
        loadWorkshopDashboard();
    };

    const activateView = (target) => {
        const alreadyActive = elements.navButtons
            ? Array.from(elements.navButtons).some(
                  (btn) => btn.dataset.panelTarget === target && btn.classList.contains('is-active')
              )
            : false;
        if (!alreadyActive) {
            elements.navButtons?.forEach((btn) => {
                btn.classList.toggle('is-active', btn.dataset.panelTarget === target);
            });
            elements.views?.forEach((view) => {
                view.classList.toggle('is-active', view.dataset.panel === target);
            });
        }

        if (target !== 'workshops' && state.workshopDrawerOpen) {
            closeWorkshopDrawer();
            resetWorkshopForm();
            setFeedback(elements.workshopFeedback, '', null);
        }
        if (target !== 'workshops' && state.workshopDetailViewActive) {
            hideWorkshopDetailView();
        }
    };

    const applyFilters = () => {
        const vinFilter = state.filters.vin.trim().toUpperCase();
        const regFilter = state.filters.registration.trim().toUpperCase();
        const approvalFilter = state.filters.approval;
        return state.reports.filter((report) => {
            const matchesVin = vinFilter ? report.vin?.includes(vinFilter) : true;
            const matchesReg = regFilter ? report.registrationNumber?.includes(regFilter) : true;
            const matchesApproval = approvalFilter === 'all' ? true : report.approvalStatus === approvalFilter;
            return matchesVin && matchesReg && matchesApproval;
        });
    };

    const renderOverview = () => {
        if (!elements.metrics) {
            return;
        }
        const metrics = buildOverviewMetrics();
        elements.metrics.innerHTML = metrics
            .map((metric) => {
                const tag = metric.clickable ? 'button' : 'article';
                const attrs = metric.clickable
                    ? `type="button" class="metric-card metric-card--action" data-metric-key="${metric.key}"`
                    : `class="metric-card" data-metric-key="${metric.key}"`;
                return `
                <${tag} ${attrs}>
                    <strong>${metric.value}</strong>
                    <p>${metric.label}</p>
                    <small>${metric.detail}</small>
                </${tag}>
            `;
            })
            .join('');

        if (elements.overviewLogs) {
            elements.overviewLogs.innerHTML = '<li class="panel-empty">Logi pojawia sie po wdrozeniu modulu audytu.</li>';
        }
        if (elements.adminActions) {
            elements.adminActions.innerHTML = '<li class="panel-empty">Lista akcji administratorow wkrotce bedzie dostepna.</li>';
        }

        renderInactiveWorkshops();
    };

    const renderReportList = () => {
        if (!elements.reportList) {
            return;
        }
        const filtered = applyFilters();
        if (!filtered.length) {
            elements.reportList.innerHTML = '<p class="panel-empty">Brak raportow spelniajacych kryteria.</p>';
            return;
        }
        elements.reportList.innerHTML = filtered
            .map((report) => {
                const approval = APPROVAL_META[report.approvalStatus] || APPROVAL_META.pending;
                return `
                <button class="panel-list__item" data-report-id="${report.id}" type="button">
                    <div>
                        <strong>${report.vin || 'Nieznany VIN'}</strong>
                        <p>${report.workshopName || 'Warsztat bez nazwy'}</p>
                    </div>
                    <div class="panel-list__meta">
                        <span class="panel-tag ${approval.className}">${approval.label}</span>
                        <small>Aktualizacja: ${formatShortDate(report.updatedAt)}</small>
                    </div>
                </button>
            `;
            })
            .join('');
    };

    const applyWorkshopFilters = () => {
        const query = state.workshopFilters.query.toLowerCase();
        const status = state.workshopFilters.status;
        return state.workshops.filter((workshop) => {
            const matchesQuery = query
                ? ['name', 'email', 'city', 'address'].some((field) =>
                      String(workshop[field] || '').toLowerCase().includes(query)
                  )
                : true;
            const matchesStatus = status === 'all' ? true : workshop.status === status;
            return matchesQuery && matchesStatus;
        });
    };

    const buildWorkshopActivityIndex = () => {
        const stats = new Map();
        state.reports.forEach((report) => {
            if (!report.workshopId) {
                return;
            }
            const current = stats.get(report.workshopId) || { count: 0, lastReportAt: null };
            current.count += 1;
            const updatedAt = toDate(report.updatedAt) || toDate(report.createdAt);
            if (updatedAt && (!current.lastReportAt || updatedAt > current.lastReportAt)) {
                current.lastReportAt = updatedAt;
            }
            stats.set(report.workshopId, current);
        });
        return stats;
    };

    const renderWorkshopList = () => {
        if (!elements.workshopList) {
            return;
        }
        const workshops = applyWorkshopFilters();
        const activityIndex = buildWorkshopActivityIndex();
        if (!workshops.length) {
            elements.workshopList.innerHTML = '<p class="panel-empty">Brak warsztatow spelniajacych kryteria.</p>';
            return;
        }
        elements.workshopList.innerHTML = workshops
            .map((workshop) => {
                const meta = WORKSHOP_STATUS_META[workshop.status] || WORKSHOP_STATUS_META.inactive;
                const workshopName = (workshop.name || '').trim();
                const displayName = workshopName || 'Brak nazwy';
                const location = [workshop.city, workshop.address].filter(Boolean).join(' • ');
                const stats = activityIndex.get(workshop.id) || { count: 0, lastReportAt: null };
                const lastActivity = stats.lastReportAt ? formatShortDate(stats.lastReportAt) : 'Brak danych';
                const emailValue = workshop.email || 'Brak adresu e-mail';
                const phoneValue = workshop.phone || 'Brak numeru telefonu';
                return `
                <article class="panel-workshop-card" data-workshop-id="${workshop.id}" data-workshop-card>
                    <div class="panel-workshop-card__header">
                        <div class="panel-workshop-card__identity">
                            <span class="panel-workshop-card__avatar" aria-hidden="true">${getWorkshopInitials(displayName)}</span>
                            <div>
                                <strong title="${displayName}">${displayName}</strong>
                                <p class="panel-workshop-card__location">${location || 'Brak lokalizacji'}</p>
                            </div>
                        </div>
                        <span class="panel-tag ${meta.className}">${meta.label}</span>
                    </div>
                    <div class="panel-workshop-card__contact" aria-label="Dane kontaktowe">
                        <div class="panel-workshop-card__contact-item">
                            <small>Email</small>
                            <span>${emailValue}</span>
                        </div>
                        <div class="panel-workshop-card__contact-item">
                            <small>Telefon</small>
                            <span>${phoneValue}</span>
                        </div>
                    </div>
                    <div class="panel-workshop-card__stats" aria-label="Aktywnosc warsztatu">
                        <div class="panel-workshop-card__stat">
                            <small>Raporty</small>
                            <strong>${stats.count}</strong>
                        </div>
                        <div class="panel-workshop-card__stat">
                            <small>Ostatnia aktywnosc</small>
                            <strong>${lastActivity}</strong>
                        </div>
                    </div>
                    <div class="panel-workshop-card__actions">
                        <!-- Usunięto przycisk Edytuj -->
                    </div>
                </article>
            `;
            })
            .join('');
    };

    const getWorkshopSubscriptionSnapshot = (workshop) => {
        if (!workshop) {
            return null;
        }
        const startDate = toDate(workshop.subscriptionStartDate);
        const periodEnd = startDate ? addMonths(startDate, 12) : null;
        const now = new Date();
        let phaseLabel = 'Brak danych';
        if (workshop.status === 'deactivated') {
            phaseLabel = 'Konto dezaktywowane';
        } else if (workshop.status === 'inactive') {
            phaseLabel = 'Nieaktywne';
        } else if (workshop.status === 'notice') {
            phaseLabel = 'W okresie wypowiedzenia';
        } else if (periodEnd) {
            phaseLabel = now < periodEnd ? 'Okres podstawowy' : 'Czas nieokreslony';
        }

        return {
            phaseLabel,
            startLabel: startDate ? formatShortDate(startDate) : 'Brak danych',
            endLabel: periodEnd ? formatShortDate(periodEnd) : 'Brak danych',
            amountLabel: typeof workshop.subscriptionAmount !== 'undefined' && workshop.subscriptionAmount !== null
                ? formatCurrency(workshop.subscriptionAmount)
                : 'Brak danych',
            initialAmountLabel:
                typeof workshop.subscriptionInitialAmount !== 'undefined' && workshop.subscriptionInitialAmount !== null
                    ? formatCurrency(workshop.subscriptionInitialAmount)
                    : null,
            initialNote: workshop.subscriptionInitialNote || null,
            billingEmail: workshop.billingEmail || null
        };
    };

    const renderWorkshopDetailOverview = () => {
        if (!elements.workshopDetailOverview) {
            return;
        }
        if (state.workshopDetailLoading) {
            setWorkshopToolbarHint('Ladowanie profilu warsztatu...');
            elements.workshopDetailOverview.innerHTML = '<p class="panel-empty">Ladowanie danych warsztatu...</p>';
            return;
        }
        if (state.workshopDetailError) {
            setWorkshopToolbarHint('Nie udalo sie pobrac danych warsztatu.');
            elements.workshopDetailOverview.innerHTML = `<p class="panel-empty">${state.workshopDetailError}</p>`;
            return;
        }
        if (!state.workshopDetailRecord) {
            setWorkshopToolbarHint(WORKSHOP_TOOLBAR_HINT_DEFAULT);
            elements.workshopDetailOverview.innerHTML = '<p class="panel-empty">Wybierz warsztat z listy, aby zobaczyc szczegoly.</p>';
            return;
        }

        const workshop = state.workshopDetailRecord;
        const meta = WORKSHOP_STATUS_META[workshop.status] || WORKSHOP_STATUS_META.inactive;
        const location = [workshop.city, workshop.address].filter(Boolean).join(' • ') || 'Brak lokalizacji';
        const contacts = [workshop.email, workshop.phone].filter(Boolean);
        const billingLine = workshop.billingEmail ? `<span>Faktury: ${workshop.billingEmail}</span>` : '';
        const isActive = workshop.status === 'active' || workshop.status === 'notice';
        const nextStatus = isActive ? 'deactivated' : 'active';
        const toggleLabel = isActive ? 'Dezaktywuj konto' : 'Aktywuj konto';

        if (elements.workshopDetailTitle) {
            elements.workshopDetailTitle.textContent = workshop.name || 'Warsztat';
        }
        if (elements.workshopDetailEyebrow) {
            elements.workshopDetailEyebrow.textContent = workshop.city || 'Profil warsztatu';
        }
        setWorkshopToolbarHint(`Profil: ${workshop.name || 'Warsztat'}`);

        elements.workshopDetailOverview.innerHTML = `
            <div class="workshop-detail__header">
                <div>
                    <h4>${workshop.name || 'Warsztat bez nazwy'}</h4>
                    <p class="workshop-detail__address">${location}</p>
                    <div class="workshop-detail__meta">
                        <span class="panel-tag ${meta.className}">${meta.label}</span>
                        ${contacts.map((item) => `<span>${item}</span>`).join('')}
                        ${billingLine}
                    </div>
                </div>
                <div class="workshop-detail__actions">
                    <button class="btn btn--ghost" type="button" data-workshop-detail-action="toggle-status" data-next-status="${nextStatus}">${toggleLabel}</button>
                    <!-- Usunięto przycisk Edytuj dane -->
                </div>
            </div>
            ${workshop.notes ? `<p class="workshop-detail__notes">${workshop.notes}</p>` : ''}
        `;
    };

    const renderWorkshopDetailSubscription = () => {
        if (!elements.workshopDetailSubscription) {
            return;
        }
        if (state.workshopDetailLoading) {
            elements.workshopDetailSubscription.innerHTML = '<p class="panel-empty">Trwa pobieranie informacji o abonamencie...</p>';
            return;
        }
        if (!state.workshopDetailRecord) {
            elements.workshopDetailSubscription.innerHTML = '<p class="panel-empty">Brak danych abonamentu.</p>';
            return;
        }
        const snapshot = getWorkshopSubscriptionSnapshot(state.workshopDetailRecord);
        if (!snapshot) {
            elements.workshopDetailSubscription.innerHTML = '<p class="panel-empty">Brak danych abonamentu.</p>';
            return;
        }

        const items = [
            { label: 'Status abonamentu', value: snapshot.phaseLabel },
            { label: 'Kwota miesieczna', value: snapshot.amountLabel },
            { label: 'Start umowy', value: snapshot.startLabel },
            { label: 'Koniec okresu 12 mies.', value: snapshot.endLabel },
            { label: 'E-mail do faktur', value: snapshot.billingEmail || 'Brak danych' }
        ];

        let html = items
            .map(
                (item) => `
                    <article class="workshop-detail__stat">
                        <small>${item.label}</small>
                        <strong>${item.value}</strong>
                    </article>
                `
            )
            .join('');

        if (snapshot.initialAmountLabel || snapshot.initialNote) {
            html += `
                <article class="workshop-detail__stat workshop-detail__stat--accent">
                    <small>Kwota startowa</small>
                    <strong>${snapshot.initialAmountLabel || 'Brak danych'}</strong>
                    ${snapshot.initialNote ? `<span>${snapshot.initialNote}</span>` : ''}
                </article>
            `;
        }

        elements.workshopDetailSubscription.innerHTML = html;
    };

    const getBillingMonthValue = (value) => {
        if (!value) {
            return 0;
        }
        const [year, month] = String(value)
            .split('-')
            .map((chunk) => Number(chunk));
        if (!year || !month) {
            return 0;
        }
        return new Date(year, month - 1, 1).getTime();
    };

    const sortBillingHistory = (history) =>
        [...history].sort((a, b) => getBillingMonthValue(b.month) - getBillingMonthValue(a.month));

    const renderWorkshopBillingList = () => {
        if (!elements.workshopBillingList) {
            return;
        }
        if (state.workshopDetailLoading) {
            elements.workshopBillingList.innerHTML = '<li class="panel-empty">Ladowanie historii platnosci...</li>';
            return;
        }
        const history = Array.isArray(state.workshopDetailRecord?.billingHistory)
            ? sortBillingHistory(state.workshopDetailRecord.billingHistory)
            : null;
        if (!Array.isArray(history) || !history.length) {
            elements.workshopBillingList.innerHTML = '<li class="panel-empty">Brak zapisanych rozliczen.</li>';
            return;
        }
        elements.workshopBillingList.innerHTML = history
            .map((entry) => {
                const statusLabel = entry.status === 'paid' ? 'Oplacona' : 'Nieoplacona';
                const monthLabel = formatBillingMonth(entry.month);
                const amountLabel = typeof entry.amount !== 'undefined' ? formatCurrency(entry.amount) : 'Brak kwoty';
                const noteBlock = entry.note ? `<p>${entry.note}</p>` : '';
                const invoice = entry.invoiceNumber ? `<span>Faktura: ${entry.invoiceNumber}</span>` : '';
                const hasActions = Boolean(entry.id);
                const statusClass = entry.status === 'paid' ? 'paid' : 'unpaid';
                const actions = hasActions
                    ? `
                        <div class="workshop-billing-item__actions">
                            <button type="button" class="btn btn--ghost" data-billing-action="toggle-status" data-billing-id="${entry.id}" data-billing-next-status="${entry.status === 'paid' ? 'unpaid' : 'paid'}">
                                ${entry.status === 'paid' ? 'Oznacz jako nieoplacona' : 'Oznacz jako oplacona'}
                            </button>
                            <button type="button" class="btn btn--ghost" data-billing-action="edit" data-billing-id="${entry.id}">Edytuj</button>
                        </div>
                    `
                    : '';
                return `
                <li class="workshop-billing-item" data-billing-id="${entry.id || ''}">
                    <div class="workshop-billing-item__main">
                        <strong>${monthLabel}</strong>
                        <small>${amountLabel}</small>
                        ${invoice}
                        ${noteBlock}
                    </div>
                    <div class="workshop-billing-item__meta">
                        <span class="workshop-billing-item__status workshop-billing-item__status--${statusClass}">${statusLabel}</span>
                        ${actions}
                    </div>
                </li>
            `;
            })
            .join('');
    };

    const renderWorkshopDetail = () => {
        renderWorkshopDetailOverview();
        renderWorkshopDetailSubscription();
        renderWorkshopBillingList();
    };

    const upsertBillingEntry = (entry) => {
        if (!entry) {
            return;
        }
        if (!state.workshopDetailRecord) {
            state.workshopDetailRecord = { id: state.focusedWorkshopId, billingHistory: [] };
        }
        if (!Array.isArray(state.workshopDetailRecord.billingHistory)) {
            state.workshopDetailRecord.billingHistory = [];
        }
        const history = [...state.workshopDetailRecord.billingHistory];
        if (entry.id) {
            const existingIndex = history.findIndex((item) => item.id === entry.id);
            if (existingIndex >= 0) {
                history[existingIndex] = entry;
            } else {
                history.push(entry);
            }
        } else {
            history.push(entry);
        }
        state.workshopDetailRecord.billingHistory = sortBillingHistory(history);
        renderWorkshopBillingList();
    };

    const populateBillingFormEntry = (entry) => {
        if (!elements.workshopBillingForm || !entry) {
            return;
        }
        const setFieldValue = (name, value) => {
            const field = elements.workshopBillingForm.querySelector(`[name="${name}"]`);
            if (field) {
                field.value = value ?? '';
            }
        };
        setFieldValue('billingMonth', entry.month || '');
        setFieldValue('billingAmount', entry.amount ?? '');
        setFieldValue('billingInvoiceNumber', entry.invoiceNumber || '');
        setFieldValue('billingStatus', entry.status || 'unpaid');
        const noteField = elements.workshopBillingForm.querySelector('[name="billingNote"]');
        if (noteField) {
            noteField.value = entry.note || '';
        }
        const submitBtn = elements.workshopBillingForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Aktualizuj platnosc';
        }
        state.workshopBillingEditId = entry.id || null;
        setFeedback(
            elements.workshopBillingFeedback,
            `Edytujesz rozliczenie za ${formatBillingMonth(entry.month)}.`,
            null
        );
    };

    const handleBillingEdit = (billingId) => {
        if (!billingId || !state.workshopDetailRecord || !Array.isArray(state.workshopDetailRecord.billingHistory)) {
            return;
        }
        const entry = state.workshopDetailRecord.billingHistory.find((item) => String(item.id) === String(billingId));
        if (entry) {
            populateBillingFormEntry(entry);
        }
    };

    const handleBillingToggleStatus = async (entryId, nextStatus) => {
        if (!state.focusedWorkshopId || !entryId || !nextStatus) {
            return;
        }
        try {
            setFeedback(elements.workshopBillingFeedback, 'Aktualizowanie statusu platnosci...', null);
            const entry = await window.WarsztatApi.patch(
                `/workshops/${state.focusedWorkshopId}/billing/${entryId}`,
                { status: nextStatus }
            );
            upsertBillingEntry(entry);
            setFeedback(elements.workshopBillingFeedback, 'Status platnosci zaktualizowany.', 'success');
        } catch (error) {
            if (handleAuthError(error)) {
                return;
            }
            const message = error.details?.message || 'Nie udalo sie zaktualizowac statusu platnosci.';
            setFeedback(elements.workshopBillingFeedback, message, 'error');
        }
    };

    const handleBillingListClick = (event) => {
        const actionBtn = event.target.closest('[data-billing-action]');
        if (!actionBtn) {
            return;
        }
        const billingId = actionBtn.dataset.billingId;
        const action = actionBtn.dataset.billingAction;
        if (action === 'edit') {
            handleBillingEdit(billingId);
            return;
        }
        if (action === 'toggle-status') {
            const nextStatus = actionBtn.dataset.billingNextStatus;
            handleBillingToggleStatus(billingId, nextStatus);
        }
    };

    const handleBillingFormSubmit = async (event) => {
        event.preventDefault();
        if (!state.focusedWorkshopId) {
            setFeedback(elements.workshopBillingFeedback, 'Najpierw wybierz warsztat.', 'error');
            return;
        }
        if (!elements.workshopBillingForm) {
            return;
        }
        const data = new FormData(elements.workshopBillingForm);
        const monthValue = normalizeString(data.get('billingMonth'));
        const amountValue = toMoneyValue(data.get('billingAmount'));
        if (!monthValue) {
            setFeedback(elements.workshopBillingFeedback, 'Wybierz miesiac rozliczenia.', 'error');
            return;
        }
        if (amountValue === null) {
            setFeedback(elements.workshopBillingFeedback, 'Podaj kwote faktury.', 'error');
            return;
        }
        const statusRaw = String(data.get('billingStatus') || 'unpaid');
        const normalizedStatus = statusRaw === 'paid' ? 'paid' : 'unpaid';
        const payload = {
            month: monthValue,
            amount: amountValue,
            invoiceNumber: toOptional(data.get('billingInvoiceNumber')),
            status: normalizedStatus,
            note: toOptional(data.get('billingNote'))
        };

        try {
            setFeedback(elements.workshopBillingFeedback, 'Zapisywanie platnosci...', null);
            let entry;
            if (state.workshopBillingEditId) {
                entry = await window.WarsztatApi.patch(
                    `/workshops/${state.focusedWorkshopId}/billing/${state.workshopBillingEditId}`,
                    payload
                );
            } else {
                entry = await window.WarsztatApi.post(`/workshops/${state.focusedWorkshopId}/billing`, payload);
            }
            upsertBillingEntry(entry);
            resetWorkshopBillingForm();
            setFeedback(elements.workshopBillingFeedback, 'Platnosc zostala zapisana.', 'success');
        } catch (error) {
            if (handleAuthError(error)) {
                return;
            }
            const message = error.details?.message || 'Nie udalo sie zapisac platnosci.';
            setFeedback(elements.workshopBillingFeedback, message, 'error');
        }
    };

    const handleWorkshopStatusToggle = async (nextStatus) => {
        if (!nextStatus || !state.focusedWorkshopId) {
            return;
        }
        try {
            setFeedback(elements.workshopDetailFeedback, 'Aktualizowanie statusu...', null);
            const updated = await window.WarsztatApi.patch(`/workshops/${state.focusedWorkshopId}`, {
                status: nextStatus
            });
            state.workshops = state.workshops.map((item) => (item.id === updated.id ? updated : item));
            state.workshopDetailRecord = updated;
            setFeedback(elements.workshopDetailFeedback, 'Status zostal zaktualizowany.', 'success');
            renderWorkshopList();
            renderOverview();
            renderWorkshopDetail();
        } catch (error) {
            if (handleAuthError(error)) {
                return;
            }
            const message = error.details?.message || 'Nie udalo sie zmienic statusu warsztatu.';
            setFeedback(elements.workshopDetailFeedback, message, 'error');
        }
    };

    const handleWorkshopDetailClick = (event) => {
        const editBtn = event.target.closest('[data-workshop-action="edit"]');
        if (editBtn) {
            const workshopId = editBtn.dataset.workshopId;
            hideWorkshopDetailView();
            handleWorkshopEditSelect(workshopId);
            return;
        }
        const toggleBtn = event.target.closest('[data-workshop-detail-action="toggle-status"]');
        if (toggleBtn) {
            const nextStatus = toggleBtn.dataset.nextStatus;
            handleWorkshopStatusToggle(nextStatus);
        }
    };

    const resetWorkshopBillingForm = () => {
        elements.workshopBillingForm?.reset();
        state.workshopBillingEditId = null;
        setFeedback(elements.workshopBillingFeedback, '', null);
        const submitBtn = elements.workshopBillingForm?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Zapisz platnosc';
        }
    };

    const showWorkshopDetailView = () => {
        if (!elements.workshopDetailView) {
            return;
        }
        if (elements.workshopListView) {
            elements.workshopListView.hidden = true;
        }
        elements.workshopDetailView.hidden = false;
        if (elements.workshopToolbarList) {
            elements.workshopToolbarList.hidden = true;
        }
        if (elements.workshopToolbarDetail) {
            elements.workshopToolbarDetail.hidden = false;
        }
        setWorkshopToolbarHint('Ladowanie profilu warsztatu...');
        state.workshopDetailViewActive = true;
    };

    const hideWorkshopDetailView = () => {
        if (!elements.workshopDetailView) {
            return;
        }
        elements.workshopDetailView.hidden = true;
        if (elements.workshopListView) {
            elements.workshopListView.hidden = false;
        }
        if (elements.workshopToolbarList) {
            elements.workshopToolbarList.hidden = false;
        }
        if (elements.workshopToolbarDetail) {
            elements.workshopToolbarDetail.hidden = true;
        }
        setWorkshopToolbarHint(WORKSHOP_TOOLBAR_HINT_DEFAULT);
        state.workshopDetailViewActive = false;
        state.focusedWorkshopId = null;
        state.workshopDetailRecord = null;
        state.workshopDetailError = null;
        state.workshopDetailLoading = false;
        setFeedback(elements.workshopDetailFeedback, '', null);
        renderWorkshopDetail();
        resetWorkshopBillingForm();
        if (elements.workshopDetailTitle) {
            elements.workshopDetailTitle.textContent = 'Szczegoly warsztatu';
        }
        if (elements.workshopDetailEyebrow) {
            elements.workshopDetailEyebrow.textContent = 'Profil warsztatu';
        }
    };

    const loadWorkshopDetail = async (workshopId) => {
        const numericId = Number(workshopId);
        state.workshopDetailLoading = true;
        state.workshopDetailError = null;
        state.workshopDetailRecord = null;
        renderWorkshopDetail();
        try {
            const detail = await window.WarsztatApi.get(`/workshops/${workshopId}`);
            if (!state.workshopDetailViewActive || numericId !== state.focusedWorkshopId) {
                return;
            }
            state.workshopDetailRecord = detail;
            state.workshopDetailLoading = false;
            renderWorkshopDetail();
        } catch (error) {
            if (handleAuthError(error)) {
                return;
            }
            if (!state.workshopDetailViewActive || numericId !== state.focusedWorkshopId) {
                return;
            }
            state.workshopDetailError = error.details?.message || 'Nie udalo sie pobrac danych warsztatu.';
            state.workshopDetailLoading = false;
            renderWorkshopDetail();
        }
    };

    const openWorkshopDetail = (workshopId) => {
        state.focusedWorkshopId = Number(workshopId);
        resetWorkshopBillingForm();
        setFeedback(elements.workshopDetailFeedback, '', null);
        showWorkshopDetailView();
        loadWorkshopDetail(workshopId);
    };

    const setWorkshopFormMode = () => {
        if (!elements.workshopForm) {
            return;
        }
        const isEdit = Boolean(state.editingWorkshopId);
        if (elements.workshopFormEyebrow) {
            elements.workshopFormEyebrow.textContent = isEdit ? 'Edycja warsztatu' : 'Nowy warsztat';
        }
        if (elements.workshopFormTitle) {
            elements.workshopFormTitle.textContent = isEdit ? 'Edytuj warsztat' : 'Dodaj warsztat';
        }
        if (elements.workshopFormSubmit) {
            elements.workshopFormSubmit.textContent = isEdit ? 'Zapisz zmiany' : 'Dodaj warsztat';
        }
        if (elements.workshopCancelBtn) {
            elements.workshopCancelBtn.hidden = !isEdit;
        }
    };

    const renderSettings = () => {
        if (!elements.settingsForm || !state.settings) {
            return;
        }
        const { licenseMonths, statusOptions } = state.settings;
        const monthsField = elements.settingsForm.querySelector('input[name="licenseMonths"]');
        const statusesField = elements.settingsForm.querySelector('textarea[name="statusOptions"]');
        if (monthsField) {
            monthsField.value = licenseMonths ?? '';
        }
        if (statusesField) {
            statusesField.value = (statusOptions || []).join(', ');
        }
    };

    const renderLogs = () => {
        if (!elements.logsContainer) {
            return;
        }
        if (!state.logs.length) {
            elements.logsContainer.innerHTML = '<li class="panel-empty">Brak wpisów w dzienniku.</li>';
            return;
        }
        elements.logsContainer.innerHTML = state.logs
            .map((log) => {
                const actor = log.actorEmail || 'System';
                return `
                <li>
                    <strong>${log.message}</strong><br>
                    <small>${formatDateTime(log.createdAt)} · ${actor} · ${log.type}</small>
                </li>
            `;
            })
            .join('');
    };

    const buildOverviewMetrics = () => {
        const now = new Date();
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);

        const workshopIndex = new Map(state.workshops.map((workshop) => [workshop.id, workshop]));
        const workshopStats = new Map();
        const isActiveWorkshop = (status) => status === 'active' || status === 'notice';
        const isInactiveWorkshop = (status) => status === 'inactive' || status === 'deactivated';

        state.reports.forEach((report) => {
            if (!report.workshopId) {
                return;
            }
            const stats = workshopStats.get(report.workshopId) || {
                workshopId: report.workshopId,
                count: 0,
                lastReportAt: null,
                name: null,
                city: null
            };
            stats.count += 1;
            const updatedAt = toDate(report.updatedAt) || toDate(report.createdAt);
            if (updatedAt && (!stats.lastReportAt || updatedAt > stats.lastReportAt)) {
                stats.lastReportAt = updatedAt;
            }
            const workshop = workshopIndex.get(report.workshopId);
            stats.name = workshop?.name || report.workshopName || 'Warsztat';
            stats.city = workshop?.city || null;
            workshopStats.set(report.workshopId, stats);
        });

        const describeWorkshopEntry = (workshop, metaLabel = 'Aktualizacja') => {
            const location = [workshop.city, workshop.address].filter(Boolean).join(' • ') || 'Brak lokalizacji';
            const lastTouched = toDate(workshop.updatedAt) || toDate(workshop.createdAt);
            const meta = lastTouched ? `${metaLabel} ${formatShortDate(lastTouched)}` : 'Brak daty aktualizacji';
            return {
                title: workshop.name || 'Warsztat',
                subtitle: location,
                meta
            };
        };

        const newWorkshopsList = sortByDateDesc(
            state.workshops.filter((workshop) => {
                const createdAt = toDate(workshop.createdAt);
                return createdAt && createdAt >= monthAgo;
            }),
            (workshop) => workshop.createdAt
        );

        const activeWorkshopItems = state.workshops
            .filter((workshop) => isActiveWorkshop(workshop.status))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
            .slice(0, 100)
            .map((workshop) => describeWorkshopEntry(workshop, 'Aktualizacja'));

        const inactiveWorkshopItems = state.workshops
            .filter((workshop) => isInactiveWorkshop(workshop.status))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
            .slice(0, 100)
            .map((workshop) => describeWorkshopEntry(workshop, 'Ostatnia zmiana'));

        const inactive30List = state.workshops
            .map((workshop) => {
                const updatedAt = toDate(workshop.updatedAt) || toDate(workshop.createdAt);
                const reportActivity = workshopStats.get(workshop.id)?.lastReportAt;
                const lastActivity = [updatedAt, reportActivity].filter(Boolean).sort((a, b) => b - a)[0];
                return { workshop, lastActivity };
            })
            .filter(({ lastActivity }) => !lastActivity || daysBetween(now, lastActivity) >= 30)
            .map(({ workshop, lastActivity }) => ({
                ...workshop,
                lastActivity: lastActivity ? lastActivity.toISOString() : null
            }));

        const workshopLoginsTodayList = [];
        const seenLoginKeys = new Set();

        state.logs
            .filter((log) => log.type === 'auth:login:workshop' && isSameDay(log.createdAt, now))
            .forEach((log) => {
                const key = String(log.payload?.workshopId ?? log.actorEmail ?? log.id ?? log.createdAt);
                if (seenLoginKeys.has(key)) {
                    return;
                }
                seenLoginKeys.add(key);
                workshopLoginsTodayList.push({
                    title: log.actorEmail || 'Warsztat',
                    subtitle: formatDateTime(log.createdAt),
                    meta: log.payload?.workshopId ? `Warsztat ID ${log.payload.workshopId}` : ''
                });
            });

        const topWorkshopList = [...workshopStats.values()]
            .sort((a, b) => {
                if (b.count === a.count) {
                    return (a.name || '').localeCompare(b.name || '', 'pl');
                }
                return b.count - a.count;
            })
            .slice(0, 100)
            .map((entry, index) => ({
                title: `${index + 1}. ${entry.name || 'Warsztat'}`,
                subtitle: entry.city || 'Brak lokalizacji',
                meta: `${entry.count} raportów${entry.lastReportAt ? ` · ostatni ${formatShortDate(entry.lastReportAt)}` : ''}`
            }));

        const reportChronoList = sortByDateDesc(state.reports, (report) => report.updatedAt || report.createdAt)
            .slice(0, 100)
            .map((report) => ({
                title: report.vin || 'Brak VIN',
                subtitle: report.workshopName || 'Warsztat',
                meta: `${report.status || 'Brak statusu'} · ${formatShortDate(report.updatedAt || report.createdAt)}`
            }));

        const pendingReportEntries = sortByDateDesc(
            state.reports.filter((report) => report.approvalStatus === 'pending'),
            (report) => report.updatedAt || report.createdAt
        )
            .slice(0, 100)
            .map((report) => ({
                title: report.vin || 'Brak VIN',
                subtitle: report.workshopName || 'Warsztat',
                meta: `Oczekuje od ${formatShortDate(report.updatedAt || report.createdAt)}`
            }));

        const approvedThisWeekEntries = sortByDateDesc(
            state.reports.filter((report) => {
                if (report.approvalStatus !== 'approved') {
                    return false;
                }
                const updatedAt = toDate(report.updatedAt) || toDate(report.createdAt);
                return updatedAt && updatedAt >= weekAgo;
            }),
            (report) => report.updatedAt || report.createdAt
        )
            .slice(0, 100)
            .map((report) => ({
                title: report.vin || 'Brak VIN',
                subtitle: report.workshopName || 'Warsztat',
                meta: `Zatwierdzono ${formatShortDate(report.updatedAt || report.createdAt)}`
            }));

        const approvedThisWeek = approvedThisWeekEntries.length;

        const totalReports = state.reports.length;
        const pendingReports = pendingReportEntries.length;
        const approvedReports = state.reports.filter((item) => item.approvalStatus === 'approved').length;
        const activeWorkshops = activeWorkshopItems.length;
        const inactiveWorkshops = inactiveWorkshopItems.length;

        state.metricDetails = {
            activeWorkshops: {
                title: 'Aktywne warsztaty',
                eyebrow: 'Status kont',
                description: 'Partnerzy z aktywną licencją i dostępem do panelu.',
                items: activeWorkshopItems
            },
            inactiveWorkshops: {
                title: 'Warsztaty nieaktywne',
                eyebrow: 'Do reaktywacji',
                description: 'Punkty partnerskie, które zostały wstrzymane lub oczekują na reaktywację.',
                items: inactiveWorkshopItems
            },
            newWorkshops: {
                title: 'Nowe warsztaty',
                eyebrow: 'Ostatnie 30 dni',
                description: 'Partnerzy, którzy dolaczyli w ciagu minionego miesiaca.',
                items: newWorkshopsList.map((workshop) => ({
                    title: workshop.name,
                    subtitle: [workshop.city, workshop.address].filter(Boolean).join(' • ') || 'Brak lokalizacji',
                    meta: `Dodano ${formatShortDate(workshop.createdAt)}`
                }))
            },
            inactive30Workshops: {
                title: 'Warsztaty do reaktywacji',
                eyebrow: 'Brak aktywnosci 30 dni',
                description: 'Lista partnerow, ktorzy od 30 dni nie wykonywali zadnej akcji ani nie zlozyli raportu.',
                items: sortByDateDesc(inactive30List, (workshop) => workshop.lastActivity)
                    .map((workshop) => ({
                        title: workshop.name,
                        subtitle: [workshop.city, workshop.address].filter(Boolean).join(' • ') || 'Brak lokalizacji',
                        meta: workshop.lastActivity
                            ? `Ostatnia aktywnosc ${formatShortDate(workshop.lastActivity)}`
                            : 'Brak zarejestrowanej aktywnosci'
                    }))
            },
            totalReports: {
                title: 'Raporty łącznie',
                eyebrow: 'Cała baza',
                description: 'Chronologiczna lista najnowszych raportów.',
                items: reportChronoList
            },
            pendingReports: {
                title: 'Raporty oczekujace',
                eyebrow: 'Wymagają moderacji',
                description: 'Raporty, które czekają na decyzję administratora.',
                items: pendingReportEntries
            },
            approvedThisWeek: {
                title: 'Zatwierdzone raporty (7 dni)',
                eyebrow: 'Tempo pracy',
                description: 'Lista raportów zaakceptowanych w ciągu ostatnich 7 dni.',
                items: approvedThisWeekEntries
            },
            workshopLoginsToday: {
                title: 'Logowania warsztatow dzisiaj',
                eyebrow: 'Aktywnosc dzienna',
                description: 'Historia dzisiejszych logowan warsztatow.',
                items: workshopLoginsTodayList
            },
            topWorkshopReporters: {
                title: 'Top warsztatow wg raportow',
                eyebrow: 'Ranking do 100 pozycji',
                description: 'Najbardziej aktywni partnerzy pod wzgledem dodawanych raportow.',
                items: topWorkshopList
            }
        };

        const metricsConfig = [
            { key: 'activeWorkshops', label: 'Warsztaty aktywne', value: activeWorkshops, detail: `${state.workshops.length} łącznie` },
            { key: 'inactiveWorkshops', label: 'Warsztaty nieaktywne', value: inactiveWorkshops, detail: 'Do reaktywacji' },
            { key: 'newWorkshops', label: 'Nowe warsztaty', value: newWorkshopsList.length, detail: 'Ostatnie 30 dni' },
            { key: 'inactive30Workshops', label: 'Brak aktywności 30d', value: state.metricDetails.inactive30Workshops.items.length, detail: 'Wymagają kontaktu' },
            { key: 'totalReports', label: 'Raporty łącznie', value: totalReports, detail: `${approvedReports} zatwierdzonych` },
            { key: 'pendingReports', label: 'Raporty oczekujące', value: pendingReports, detail: 'Wymagają moderacji' },
            { key: 'approvedThisWeek', label: 'Zatwierdzone (7 dni)', value: approvedThisWeek, detail: 'Tempo pracy' },
            { key: 'workshopLoginsToday', label: 'Logowania dzisiaj', value: workshopLoginsTodayList.length, detail: 'Warsztaty aktywne' },
            { key: 'topWorkshopReporters', label: 'Top warsztatów', value: state.metricDetails.topWorkshopReporters.items.length, detail: 'Najaktywniejsi' }
        ];

        return metricsConfig.map((metric) => ({
            ...metric,
            clickable: Boolean(state.metricDetails[metric.key]?.items?.length)
        }));
    };

    const renderInactiveWorkshops = () => {
        if (!elements.inactiveWorkshopsList) {
            return;
        }
        const inactive = state.workshops.filter((workshop) => ['inactive', 'deactivated'].includes(workshop.status));
        if (!inactive.length) {
            elements.inactiveWorkshopsList.innerHTML = '<li class="panel-empty">Wszyscy partnerzy sa aktywni.</li>';
            return;
        }

        const limited = [...inactive].sort((a, b) => {
            const left = a.updatedAt || a.createdAt;
            const right = b.updatedAt || b.createdAt;
            if (left === right) {
                return a.name.localeCompare(b.name, 'pl');
            }
            return right.localeCompare(left);
        }).slice(0, 6);

        elements.inactiveWorkshopsList.innerHTML = limited
            .map((workshop) => {
                const location = [workshop.city, workshop.address].filter(Boolean).join(' • ');
                const contact = workshop.email || workshop.phone || 'Brak danych kontaktowych';
                return `
                <li>
                    <div>
                        <strong>${workshop.name}</strong>
                        <small>${location || 'Brak lokalizacji'}</small>
                    </div>
                    <small>${contact}</small>
                </li>
            `;
            })
            .join('');

        if (inactive.length > limited.length) {
            const remaining = inactive.length - limited.length;
            elements.inactiveWorkshopsList.innerHTML += `<li class="panel-empty">+${remaining} kolejnych wpisów</li>`;
        }
    };

    const populateWorkshopForm = (workshop) => {
        if (!elements.workshopForm || !workshop) {
            return;
        }
        const setValue = (name, value) => {
            const field = elements.workshopForm.querySelector(`[name="${name}"]`);
            if (field) {
                field.value = value ?? '';
            }
        };

        setValue('name', workshop.name);
        setValue('city', workshop.city);
        setValue('address', workshop.address);
        setValue('phone', workshop.phone);
        setValue('email', workshop.email);
        setValue('billingEmail', workshop.billingEmail);
        setValue('loginEmail', workshop.loginEmail || workshop.email);
        setValue('status', workshop.status || 'active');
        setValue('subscriptionAmount', workshop.subscriptionAmount ?? '');
        setValue('subscriptionStartDate', toDateInputValue(workshop.subscriptionStartDate));
        setValue('subscriptionInitialAmount', workshop.subscriptionInitialAmount ?? '');
        setValue('subscriptionInitialNote', workshop.subscriptionInitialNote);
        const notesField = elements.workshopForm.querySelector('[name="notes"]');
        if (notesField) {
            notesField.value = workshop.notes || '';
        }
        const passwordField = elements.workshopForm.querySelector('[name="loginPassword"]');
        if (passwordField) {
            passwordField.value = '';
        }
    };

    function resetWorkshopForm() {
        elements.workshopForm?.reset();
        state.editingWorkshopId = null;
        setWorkshopFormMode();
    }

    const handleWorkshopEditSelect = (workshopId) => {
        const workshop = state.workshops.find((item) => item.id === Number(workshopId));
        if (!workshop) {
            return;
        }
        state.editingWorkshopId = workshop.id;
        populateWorkshopForm(workshop);
        setWorkshopFormMode();
        setFeedback(elements.workshopFeedback, `Edycja warsztatu ${workshop.name}.`, null);
        openWorkshopDrawer();
    };

    const refreshLogs = async (showLoading = false) => {
        if (showLoading && elements.logsContainer) {
            elements.logsContainer.innerHTML = '<li class="panel-empty">Ładowanie dziennika...</li>';
        }
        try {
            const logs = await window.WarsztatApi.get('/logs');
            state.logs = Array.isArray(logs) ? logs : [];
            renderLogs();
        } catch (error) {
            if (handleAuthError(error)) {
                return;
            }
            if (elements.logsContainer) {
                elements.logsContainer.innerHTML = '<li class="panel-empty">Nie udało się pobrać logów.</li>';
            }
        }
    };

    const renderSelectedReport = () => {
        if (!elements.reportEditForm) {
            return;
        }
        const fields = {
            id: elements.reportEditForm.querySelector('input[name="reportId"]'),
            vin: elements.reportEditForm.querySelector('input[name="vin"]'),
            registrationNumber: elements.reportEditForm.querySelector('input[name="registrationNumber"]'),
            mileageKm: elements.reportEditForm.querySelector('input[name="mileageKm"]'),
            firstRegistrationDate: elements.reportEditForm.querySelector('input[name="firstRegistrationDate"]'),
            approvalStatus: elements.reportEditForm.querySelector('select[name="approvalStatus"]'),
            summary: elements.reportEditForm.querySelector('textarea[name="summary"]'),
            moderationNote: elements.reportEditForm.querySelector('textarea[name="moderationNote"]')
        };

        const report = state.reports.find((item) => item.id === state.selectedReportId);
        if (!report) {
            elements.reportEditForm.reset();
            state.selectedReportId = null;
            setFeedback(elements.reportFeedback, 'Wybierz raport z listy, aby rozpoczac edycje.', null);
            if (elements.reportMediaGallery) {
                elements.reportMediaGallery.innerHTML = '<p class="panel-empty">Brak zalacznikow.</p>';
            }
            return;
        }

        fields.id.value = report.id;
        fields.vin.value = report.vin || '';
        fields.registrationNumber.value = report.registrationNumber || '';
        fields.mileageKm.value = report.mileageKm ?? '';
        fields.firstRegistrationDate.value = report.firstRegistrationDate || '';
        fields.approvalStatus.value = report.approvalStatus || 'pending';
        fields.summary.value = report.summary || '';
        fields.moderationNote.value = report.moderationNote || '';

        if (elements.reportMediaGallery) {
            elements.reportMediaGallery.innerHTML = '<p class="panel-empty">Integracja zalacznikow pojawi sie wkrotce.</p>';
        }

        setFeedback(elements.reportFeedback, `Edytujesz raport ${report.vin}.`, null);
    };

    const selectReport = (reportId) => {
        state.selectedReportId = Number(reportId);
        renderSelectedReport();
    };

    const bindEvents = () => {
        elements.metrics?.addEventListener('click', handleMetricClick);
        elements.navButtons?.forEach((btn) => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.panelTarget;
                if (target) {
                    activateView(target);
                    if (target === 'logs') {
                        refreshLogs(true);
                    }
                }
            });
        });

        elements.logoutBtn?.addEventListener('click', () => {
            window.WarsztatSession?.clear();
            window.location.href = LOGIN_URL;
        });

        elements.reportList?.addEventListener('click', (event) => {
            const target = event.target.closest('[data-report-id]');
            if (target) {
                selectReport(target.dataset.reportId);
            }
        });

        elements.reportFilterForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            const data = new FormData(elements.reportFilterForm);
            state.filters.vin = String(data.get('vin') || '').trim();
            state.filters.registration = String(data.get('registration') || '').trim();
            state.filters.approval = String(data.get('approval') || 'all');
            renderReportList();
        });

        elements.reportEditForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!state.selectedReportId) {
                setFeedback(elements.reportFeedback, 'Najpierw wybierz raport z listy.', 'error');
                return;
            }
            const data = new FormData(elements.reportEditForm);
            const payload = {
                vin: String(data.get('vin') || '').trim().toUpperCase(),
                registrationNumber: String(data.get('registrationNumber') || '').trim().toUpperCase(),
                mileageKm: data.get('mileageKm') ? Number(data.get('mileageKm')) : null,
                firstRegistrationDate: String(data.get('firstRegistrationDate') || '').trim() || null,
                summary: String(data.get('summary') || '').trim(),
                approvalStatus: String(data.get('approvalStatus') || 'pending'),
                moderationNote: String(data.get('moderationNote') || '').trim()
            };

            try {
                setFeedback(elements.reportFeedback, 'Zapisywanie zmian...', null);
                const updated = await window.WarsztatApi.patch(`/reports/${state.selectedReportId}`, payload);
                state.reports = state.reports.map((report) => (report.id === updated.id ? updated : report));
                setFeedback(elements.reportFeedback, 'Raport zaktualizowany poprawnie.', 'success');
                renderReportList();
                selectReport(updated.id);
            } catch (error) {
                if (handleAuthError(error)) {
                    return;
                }
                const message = error.details?.message || 'Nie udalo sie zapisac raportu.';
                setFeedback(elements.reportFeedback, message, 'error');
            }
        });

        elements.workshopList?.addEventListener('click', (event) => {
            const editBtn = event.target.closest('[data-workshop-action="edit"]');
            if (editBtn) {
                handleWorkshopEditSelect(editBtn.dataset.workshopId);
                event.stopPropagation();
                return;
            }
            if (event.target.closest('.panel-workshop-card__actions')) {
                return;
            }
            const card = event.target.closest('[data-workshop-card]');
            if (card?.dataset.workshopId) {
                openWorkshopDetail(card.dataset.workshopId);
            }
        });

        elements.workshopAddBtn?.addEventListener('click', () => {
            resetWorkshopForm();
            setFeedback(elements.workshopFeedback, 'Uzupelnij formularz, aby dodac nowy warsztat.', null);
            openWorkshopDrawer();
        });

        elements.workshopFilterForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            const data = new FormData(elements.workshopFilterForm);
            state.workshopFilters.query = normalizeString(data.get('query')).toLowerCase();
            state.workshopFilters.status = String(data.get('status') || 'all');
            renderWorkshopList();
        });

        elements.workshopFilterReset?.addEventListener('click', () => {
            elements.workshopFilterForm?.reset();
            state.workshopFilters = { query: '', status: 'all' };
            renderWorkshopList();
        });

        elements.workshopForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = new FormData(elements.workshopForm);
            const payload = {
                name: normalizeString(data.get('name')),
                city: toOptional(data.get('city')),
                address: toOptional(data.get('address')),
                phone: toOptional(data.get('phone')),
                email: toOptional(data.get('email')),
                billingEmail: toEmail(data.get('billingEmail')),
                status: String(data.get('status') || 'active'),
                subscriptionAmount: toMoneyValue(data.get('subscriptionAmount')),
                subscriptionStartDate: toDateOnly(data.get('subscriptionStartDate')),
                subscriptionInitialAmount: toMoneyValue(data.get('subscriptionInitialAmount')),
                subscriptionInitialNote: toOptional(data.get('subscriptionInitialNote')),
                notes: toOptional(data.get('notes')),
                loginEmail: toEmail(data.get('loginEmail')),
                loginPassword: normalizeString(data.get('loginPassword'))
            };

            if (!payload.name) {
                setFeedback(elements.workshopFeedback, 'Podaj nazwe warsztatu.', 'error');
                return;
            }

            if (!payload.loginEmail) {
                setFeedback(elements.workshopFeedback, 'Podaj e-mail do logowania warsztatu.', 'error');
                return;
            }

            const isEdit = Boolean(state.editingWorkshopId);
            if (!isEdit && payload.loginPassword.length < 8) {
                setFeedback(elements.workshopFeedback, 'Haslo musi miec co najmniej 8 znakow.', 'error');
                return;
            }
            if (isEdit && payload.loginPassword && payload.loginPassword.length < 8) {
                setFeedback(elements.workshopFeedback, 'Nowe haslo musi miec co najmniej 8 znakow.', 'error');
                return;
            }

            if (!payload.loginPassword) {
                delete payload.loginPassword;
            }

            try {
                setFeedback(elements.workshopFeedback, 'Zapisywanie danych warsztatu...', null);
                let workshop;
                if (state.editingWorkshopId) {
                    workshop = await window.WarsztatApi.patch(`/workshops/${state.editingWorkshopId}`, payload);
                    state.workshops = state.workshops.map((item) => (item.id === workshop.id ? workshop : item));
                    setFeedback(elements.workshopFeedback, 'Zmieniono dane warsztatu.', 'success');
                } else {
                    workshop = await window.WarsztatApi.post('/workshops', payload);
                    state.workshops = [workshop, ...state.workshops];
                    setFeedback(elements.workshopFeedback, 'Dodano nowy warsztat.', 'success');
                }
                renderWorkshopList();
                renderOverview();
                resetWorkshopForm();
            } catch (error) {
                if (handleAuthError(error)) {
                    return;
                }
                const message = error.details?.message || 'Nie udalo sie zapisac warsztatu.';
                setFeedback(elements.workshopFeedback, message, 'error');
            }
        });

        elements.workshopCancelBtn?.addEventListener('click', () => {
            resetWorkshopForm();
            setFeedback(elements.workshopFeedback, 'Anulowano edycje warsztatu.', null);
        });

        elements.settingsForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!elements.settingsForm) {
                return;
            }
            const data = new FormData(elements.settingsForm);
            const licenseMonths = Number(data.get('licenseMonths'));
            const rawStatuses = String(data.get('statusOptions') || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

            if (!Number.isFinite(licenseMonths) || licenseMonths < 1) {
                setFeedback(elements.settingsFeedback, 'Podaj poprawna liczbe miesiecy.', 'error');
                return;
            }
            if (!rawStatuses.length) {
                setFeedback(elements.settingsFeedback, 'Wpisz przynajmniej jeden status.', 'error');
                return;
            }

            try {
                setFeedback(elements.settingsFeedback, 'Zapisywanie ustawien...', null);
                const updated = await window.WarsztatApi.patch('/settings', {
                    licenseMonths,
                    statusOptions: rawStatuses
                });
                state.settings = updated;
                renderSettings();
                setFeedback(elements.settingsFeedback, 'Ustawienia zostaly zapisane.', 'success');
            } catch (error) {
                if (handleAuthError(error)) {
                    return;
                }
                const message = error.details?.message || 'Nie udalo sie zapisac ustawien.';
                setFeedback(elements.settingsFeedback, message, 'error');
            }
        });

        elements.logsRefreshBtn?.addEventListener('click', () => {
            refreshLogs(true);
        });

        const handleWorkshopDrawerClose = () => {
            closeWorkshopDrawer();
            resetWorkshopForm();
            setFeedback(elements.workshopFeedback, '', null);
        };

        elements.workshopDrawerClose?.addEventListener('click', handleWorkshopDrawerClose);
        elements.workshopDrawerBackdrop?.addEventListener('click', handleWorkshopDrawerClose);
        elements.metricDrawerClose?.addEventListener('click', closeMetricDrawer);
        elements.metricDrawerBackdrop?.addEventListener('click', closeMetricDrawer);
        elements.workshopDetailBack?.addEventListener('click', hideWorkshopDetailView);
        elements.workshopDetailView?.addEventListener('click', handleWorkshopDetailClick);
        elements.workshopBillingForm?.addEventListener('submit', handleBillingFormSubmit);
        elements.workshopBillingList?.addEventListener('click', handleBillingListClick);
        document.addEventListener('keydown', handleDrawerKeydown);
    };

    const loadInitialData = async () => {
        try {
            setFeedback(elements.reportFeedback, 'Wczytywanie danych z API...', null);
            const [reports, media, news, workshops, settings, logs] = await Promise.all([
                window.WarsztatApi.get('/reports'),
                window.WarsztatApi.get('/media', { auth: false }),
                window.WarsztatApi.get('/news', { auth: false }),
                window.WarsztatApi.get('/workshops'),
                window.WarsztatApi.get('/settings'),
                window.WarsztatApi.get('/logs')
            ]);
            state.reports = Array.isArray(reports) ? reports : [];
            state.media = Array.isArray(media) ? media : [];
            state.news = Array.isArray(news) ? news : [];
            state.workshops = Array.isArray(workshops) ? workshops : [];
            state.settings = settings || null;
            state.logs = Array.isArray(logs) ? logs : [];
            renderOverview();
            renderReportList();
            renderSelectedReport();
            renderWorkshopList();
            renderSettings();
            renderLogs();
            setFeedback(elements.reportFeedback, 'Dane zostaly pobrane.', 'success');
        } catch (error) {
            if (handleAuthError(error)) {
                return;
            }
            console.error('Nie udalo sie pobrac danych poczatkowych', error);
            setFeedback(elements.reportFeedback, 'Nie udalo sie pobrac danych z API.', 'error');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
            // --- Warsztat: zakładka Ustawienia ---
            const settingsTab = document.getElementById('tab-settings');
            const settingsForm = document.getElementById('workshop-settings-form');
            function fillWorkshopSettingsForm(data) {
                if (!settingsForm || !data) return;
                settingsForm.name.value = data.name || '';
                settingsForm.city.value = data.city || '';
                settingsForm.address.value = data.address || '';
                settingsForm.phone.value = data.phone || '';
                settingsForm.email.value = data.email || '';
                settingsForm.billingEmail.value = data.billingEmail || '';
                settingsForm.subscriptionAmount.value = data.subscriptionAmount || '';
                settingsForm.subscriptionMonths.value = data.subscriptionMonths || '';
                settingsForm.subscriptionStartDate.value = data.subscriptionStartDate || '';
                settingsForm.integrationSms.checked = !!data.integrationSms;
                settingsForm.integrationHurtownia.checked = !!data.integrationHurtownia;
                settingsForm.integrationAutodoc.checked = !!data.integrationAutodoc;
            }

            async function loadWorkshopSettings(workshopId) {
                if (!workshopId) return;
                try {
                    const detail = await window.WarsztatApi.get(`/workshops/${workshopId}`);
                    fillWorkshopSettingsForm(detail);
                } catch (err) {}
            }

            if (settingsForm) {
                settingsForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    if (!state.focusedWorkshopId) return;
                    const data = new FormData(settingsForm);
                    const payload = {
                        name: data.get('name'),
                        city: data.get('city'),
                        address: data.get('address'),
                        phone: data.get('phone'),
                        email: data.get('email'),
                        billingEmail: data.get('billingEmail'),
                        subscriptionAmount: Number(data.get('subscriptionAmount')),
                        subscriptionMonths: Number(data.get('subscriptionMonths')),
                        subscriptionStartDate: data.get('subscriptionStartDate'),
                        integrationSms: !!data.get('integrationSms'),
                        integrationHurtownia: !!data.get('integrationHurtownia'),
                        integrationAutodoc: !!data.get('integrationAutodoc')
                    };
                    try {
                        await window.WarsztatApi.patch(`/workshops/${state.focusedWorkshopId}`, payload);
                        alert('Zmiany zapisane!');
                    } catch (err) {
                        alert('Nie udało się zapisać zmian.');
                    }
                });
            }

            document.body.addEventListener('click', function(e) {
                const tabBtn = e.target.closest('.workshop-tab[data-tab="settings"]');
                if (tabBtn && state.focusedWorkshopId) {
                    loadWorkshopSettings(state.focusedWorkshopId);
                }
            });
            // --- Warsztat: zakładka Raporty ---
            const reportsTab = document.getElementById('tab-reports');
            const reportsList = document.getElementById('workshop-reports-list');
            const reportsFilterForm = document.getElementById('workshop-reports-filter-form');
            let reportsFilter = { status: 'all', date: '', type: '' };

            async function loadWorkshopReports(workshopId) {
                if (!workshopId) return;
                try {
                    const allReports = await window.WarsztatApi.get(`/workshops/${workshopId}/reports`);
                    state.workshopReports = Array.isArray(allReports) ? allReports : [];
                    renderWorkshopReports();
                } catch (err) {
                    reportsList.innerHTML = '<p class="panel-empty">Nie udało się pobrać raportów.</p>';
                }
            }

            function renderWorkshopReports() {
                if (!reportsList) return;
                let filtered = state.workshopReports;
                if (reportsFilter.status && reportsFilter.status !== 'all') {
                    filtered = filtered.filter(r => r.approvalStatus === reportsFilter.status);
                }
                if (reportsFilter.date) {
                    filtered = filtered.filter(r => r.updatedAt && r.updatedAt.startsWith(reportsFilter.date));
                }
                if (reportsFilter.type) {
                    filtered = filtered.filter(r => (r.type || '').toLowerCase().includes(reportsFilter.type.toLowerCase()));
                }
                if (!filtered.length) {
                    reportsList.innerHTML = '<p class="panel-empty">Brak raportów dla wybranych filtrów.</p>';
                    return;
                }
                reportsList.innerHTML = filtered.map(report => `
                    <article class="workshop-report-card">
                        <header>
                            <strong>${report.vin || 'Brak VIN'}</strong>
                            <span class="panel-tag ${report.approvalStatus}">${report.approvalStatus}</span>
                            <span>${report.type || 'Brak typu'}</span>
                            <span>${report.updatedAt ? new Date(report.updatedAt).toLocaleDateString('pl-PL') : ''}</span>
                        </header>
                        <p>${report.summary || 'Brak opisu naprawy.'}</p>
                        <div class="workshop-report-attachments">
                            ${(report.attachments && report.attachments.length)
                                ? report.attachments.map(att => `<a href="${att.url}" target="_blank">${att.name}</a>`).join(', ')
                                : '<span class="panel-empty">Brak załączników.</span>'}
                        </div>
                    </article>
                `).join('');
            }

            if (reportsFilterForm) {
                reportsFilterForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const data = new FormData(reportsFilterForm);
                    reportsFilter.status = data.get('status') || 'all';
                    reportsFilter.date = data.get('date') || '';
                    reportsFilter.type = data.get('type') || '';
                    renderWorkshopReports();
                });
            }

            // Załaduj raporty po otwarciu panelu warsztatu
            document.body.addEventListener('click', function(e) {
                const tabBtn = e.target.closest('.workshop-tab[data-tab="reports"]');
                if (tabBtn && state.focusedWorkshopId) {
                    loadWorkshopReports(state.focusedWorkshopId);
                }
            });
            // --- Warsztat: zakładki szczegółów ---
            document.body.addEventListener('click', function (e) {
                const tabBtn = e.target.closest('.workshop-tab');
                if (tabBtn) {
                    const nav = tabBtn.parentElement;
                    const allTabs = nav.querySelectorAll('.workshop-tab');
                    allTabs.forEach(btn => btn.classList.remove('active'));
                    tabBtn.classList.add('active');
                    const tab = tabBtn.getAttribute('data-tab');
                    const contentRoot = nav.parentElement.querySelector('.workshop-tabs__content');
                    if (contentRoot) {
                        contentRoot.querySelectorAll('.workshop-tab-content').forEach(sec => {
                            sec.style.display = sec.id === 'tab-' + tab ? '' : 'none';
                        });
                    }
                }
            });
        if (!window.WarsztatApi || !window.WarsztatSession) {
            console.error('Brakuje klienta API lub modulu sesji.');
            return;
        }
        const session = window.WarsztatSession.get();
        if (!session?.token) {
            window.location.href = LOGIN_URL;
            return;
        }

        bindDom();
        state.session = session;
        state.isAdmin = session.role !== 'workshop';

        if (!state.isAdmin) {
            activateWorkshopMode(session);
            return;
        }

        setWorkshopFormMode();
        disableLegacyViews();
        bindEvents();
        activateView('overview');

        if (elements.username) {
            elements.username.textContent = session.user?.email || 'Administrator';
        }
        if (elements.role) {
            elements.role.textContent = 'Administrator';
        }

        loadInitialData();
    });

    document.addEventListener('DOMContentLoaded', () => {
    // === INTEGRACJA GUS ===
    const nipInput = document.getElementById('workshop-nip');
    const loadingEl = document.getElementById('gus-loading');
    const feedbackEl = document.getElementById('nip-feedback');

    // Pola do wypełnienia
    const nameInput = document.getElementById('workshop-name');
    const cityInput = document.getElementById('workshop-city');
    const zipInput = document.getElementById('workshop-zip');
    const addressInput = document.getElementById('workshop-address');

    if (nipInput) {
        nipInput.addEventListener('blur', async () => {
            const nip = nipInput.value.replace(/[^0-9]/g, ''); // Usuń myślniki i spacje

            if (nip.length !== 10) {
                if(nip.length > 0) showError('NIP musi mieć 10 cyfr');
                return;
            }

            // Reset UI
            feedbackEl.style.display = 'none';
            loadingEl.style.display = 'inline-block';
            nipInput.disabled = true;

            try {
                // Wywołanie Twojego backendu (zakładam, że api.js obsługuje metodę get)
                // Jeśli nie używasz window.WarsztatApi, użyj zwykłego fetch()
                const data = await window.WarsztatApi.get(`/gus/${nip}`);
                if (data) {
                    // Automatyczne wypełnianie
                    if(nameInput) nameInput.value = data.name || '';
                    if(cityInput) cityInput.value = data.city || '';
                    if(zipInput) zipInput.value = data.zip || '';
                    if(addressInput) addressInput.value = data.address || ''; // Ulica i nr

                    // Efekt wizualny sukcesu
                    nameInput.style.backgroundColor = '#dcfce7'; // Jasny zielony
                    setTimeout(() => nameInput.style.backgroundColor = '', 1500);
                }

            } catch (error) {
                console.error("Błąd GUS:", error);
                if (error.status === 404) {
                    showError('Nie znaleziono firmy w bazie GUS.');
                } else {
                    showError('Błąd pobierania danych. Wpisz ręcznie.');
                }
            } finally {
                loadingEl.style.display = 'none';
                nipInput.disabled = false;
            }
        });
    }

    function showError(msg) {
        feedbackEl.textContent = msg;
        feedbackEl.style.display = 'block';
    }
});
})();
