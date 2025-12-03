(function () {
    const LOGIN_URL = 'login.html';
    const REQUIRED_MODULES = [
        'WarsztatSession',
        'WarsztatWorkshops',
        'WarsztatReports',
        'WarsztatSettings',
        'WarsztatLogs'
    ];

    const formatDate = (value, options = {}) => {
        if (!value) {
            return '—';
        }
        try {
            return new Date(value).toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                ...options
            });
        } catch (error) {
            return value;
        }
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

    const formatCurrency = (value) => {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) {
            return 'Brak stawki';
        }
        return amount.toLocaleString('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            minimumFractionDigits: 2
        });
    };

    const getContractDescription = (workshop) => {
        if (!workshop) {
            return 'Brak danych o umowie.';
        }
        switch (workshop.contractStatus) {
            case 'indefinite':
                return `Umowa na czas nieokreslony od ${formatDate(
                    workshop.contractIndefiniteSince || workshop.contractFixedEnd
                )}.`;
            case 'notice':
                return `Wypowiedzenie z dnia ${formatDate(workshop.terminationNoticeDate)} ze skutkiem na ${formatDate(
                    workshop.terminationEndDate
                )}.`;
            case 'terminated':
                return `Umowa wygasla ${formatDate(workshop.terminatedAt || workshop.terminationEndDate)}.`;
            case 'fixed':
            default:
                return `Umowa na czas okreslony do ${formatDate(workshop.contractFixedEnd)}.`;
        }
    };

    const escapeHtml = (value = '') =>
        String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);

    const formatMileage = (value) => {
        const mileage = Number(value);
        if (!Number.isFinite(mileage) || mileage < 0) {
            return 'Brak danych';
        }
        return `${mileage.toLocaleString('pl-PL')} km`;
    };

    const formatFileSize = (bytes) => {
        const size = Number(bytes);
        if (!Number.isFinite(size) || size <= 0) {
            return '0 B';
        }
        if (size >= 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }
        if (size >= 1024) {
            return `${Math.round(size / 1024)} kB`;
        }
        return `${Math.round(size)} B`;
    };

    const createMediaGalleryMarkup = (media = []) =>
        media
            .map((item, index) => {
                const isVideo = (item.type || '').startsWith('video');
                const preview = item.dataUrl
                    ? isVideo
                        ? `<video class="panel-media-thumb panel-media-thumb--video" src="${item.dataUrl}" controls preload="metadata"></video>`
                        : `<img class="panel-media-thumb" src="${item.dataUrl}" alt="${escapeHtml(
                              item.name || `Zalacznik ${index + 1}`
                          )}">`
                    : '';
                const label = escapeHtml(item.name || `Zalacznik ${index + 1}`);
                const metaParts = [item.type || 'plik', formatFileSize(item.size)].filter(Boolean);
                const meta = escapeHtml(metaParts.join(' • '));
                return `
                    <div class="panel-media-card">
                        ${preview}
                        <strong>${label}</strong>
                        <small>${meta}</small>
                    </div>
                `;
            })
            .join('');

    const setMediaGalleryContent = (element, mediaItems = []) => {
        if (!element) {
            return;
        }
        if (!mediaItems.length) {
            element.innerHTML = '<p class="panel-empty">Brak zalacznikow.</p>';
            return;
        }
        element.innerHTML = createMediaGalleryMarkup(mediaItems);
    };

    const getContractTagMeta = (workshop) => {
        if (!workshop) {
            return { label: 'Status umowy nieznany', className: 'panel-tag--warning' };
        }
        switch (workshop.contractStatus) {
            case 'indefinite':
                return { label: 'Umowa bezterminowa', className: 'panel-tag--success' };
            case 'notice':
                return { label: 'Wypowiedzenie w toku', className: 'panel-tag--warning' };
            case 'terminated':
                return { label: 'Umowa wypowiedziana', className: 'panel-tag--warning' };
            default:
                return { label: `Umowa do ${formatDate(workshop.contractFixedEnd)}`, className: 'panel-tag--warning' };
        }
    };

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

    document.addEventListener('DOMContentLoaded', () => {
        const missing = REQUIRED_MODULES.filter((key) => !window[key]);
        if (missing.length) {
            console.error('Brak wymaganych modulow:', missing.join(', '));
            return;
        }

        window.WarsztatReports.ensureSeeded?.();

        const session = window.WarsztatSession.get();
        if (!session) {
            window.location.href = LOGIN_URL;
            return;
        }

        const state = {
            workshops: [],
            reports: [],
            settings: window.WarsztatSettings.get(),
            logs: []
        };

        const APPROVAL_STATES = window.WarsztatReports.APPROVAL_STATES || {
            pending: 'pending',
            approved: 'approved',
            rejected: 'rejected'
        };

        const approvalMetaMap = {
            [APPROVAL_STATES.pending]: {
                label: 'Oczekuje na akceptacje',
                className: 'panel-tag--warning'
            },
            [APPROVAL_STATES.approved]: {
                label: 'Zatwierdzony',
                className: 'panel-tag--success'
            },
            [APPROVAL_STATES.rejected]: {
                label: 'Odrzucony',
                className: 'panel-tag--danger'
            }
        };

        const getApprovalMeta = (status) => approvalMetaMap[status] || approvalMetaMap[APPROVAL_STATES.pending];

        const filters = { query: '', status: 'all' };
        const reportFilters = { vin: '', registration: '', approval: 'all' };
        let currentReportId = null;

        const elements = {
            username: document.getElementById('panel-username'),
            role: document.getElementById('panel-role'),
            logoutBtn: document.getElementById('logout-btn'),
            overviewMetrics: document.getElementById('overview-metrics'),
            overviewLogs: document.getElementById('overview-logs'),
            adminActions: document.getElementById('admin-actions'),
            workshopList: document.getElementById('workshop-list'),
            workshopFilterForm: document.getElementById('workshop-filter-form'),
            adminFeedback: document.getElementById('admin-feedback'),
            createWorkshopForm: document.getElementById('create-workshop-form'),
            reportList: document.getElementById('report-list'),
            reportFilterForm: document.getElementById('report-filter-form'),
            reportEditForm: document.getElementById('report-edit-form'),
            reportFeedback: document.getElementById('report-feedback'),
            reportMediaGallery: document.getElementById('report-media-gallery'),
            settingsForm: document.getElementById('settings-form'),
            settingsFeedback: document.getElementById('settings-feedback'),
            logsFull: document.getElementById('logs-full'),
            logsClearBtn: document.getElementById('logs-clear-btn'),
            navButtons: document.querySelectorAll('.panel-nav__link'),
            views: document.querySelectorAll('.panel-view')
        };

        const isAdmin = session.role === 'admin';

        const reportFields = {
            id: elements.reportEditForm?.querySelector('input[name="reportId"]'),
            vin: elements.reportEditForm?.querySelector('input[name="vin"]'),
            registrationNumber: elements.reportEditForm?.querySelector('input[name="registrationNumber"]'),
            approvalStatus: elements.reportEditForm?.querySelector('select[name="approvalStatus"]'),
            summary: elements.reportEditForm?.querySelector('textarea[name="summary"]'),
            moderationNote: elements.reportEditForm?.querySelector('textarea[name="moderationNote"]'),
            mileageKm: elements.reportEditForm?.querySelector('input[name="mileageKm"]'),
            firstRegistrationDate: elements.reportEditForm?.querySelector('input[name="firstRegistrationDate"]')
        };

        elements.username.textContent = session.user.name || session.user.email;
        elements.role.textContent = isAdmin ? 'Administrator' : 'Warsztat';

        if (!isAdmin) {
            initializeWorkshopPanel();
            return;
        }

        const refreshState = (...targets) => {
            const needs = targets.length ? targets : ['workshops', 'reports', 'settings', 'logs'];
            if (needs.includes('workshops')) {
                state.workshops = window.WarsztatWorkshops.getAll();
            }
            if (needs.includes('reports')) {
                state.reports = window.WarsztatReports.getAll();
            }
            if (needs.includes('settings')) {
                state.settings = window.WarsztatSettings.get();
            }
            if (needs.includes('logs')) {
                state.logs = window.WarsztatLogs.getAll();
            }
        };

        const logAction = (message, meta = {}) => {
            window.WarsztatLogs.add({
                message,
                actor: session.user.email || session.user.name || 'Administrator',
                ...meta
            });
            refreshState('logs');
            renderLogs();
        };

        const activateView = (target) => {
            elements.navButtons.forEach((btn) => {
                btn.classList.toggle('is-active', btn.dataset.panelTarget === target);
            });
            elements.views.forEach((view) => {
                view.classList.toggle('is-active', view.dataset.panel === target);
            });
        };

        const renderMetrics = () => {
            if (!elements.overviewMetrics) {
                return;
            }
            const now = Date.now();
            const totalWorkshops = state.workshops.length;
            const activeWorkshops = state.workshops.filter((item) => item.active).length;
            const expiredLicenses = state.workshops.filter((item) => new Date(item.licenseEnd).getTime() < now).length;
            const reportsInProgress = state.reports.filter((report) => report.status !== 'Zakonczona').length;
            const metrics = [
                {
                    label: 'Aktywne warsztaty',
                    value: activeWorkshops,
                    detail: `z ${totalWorkshops} w systemie`
                },
                {
                    label: 'Wygasle licencje',
                    value: expiredLicenses,
                    detail: 'Wymagaja reaktywacji'
                },
                {
                    label: 'Raporty w toku',
                    value: reportsInProgress,
                    detail: `z ${state.reports.length} raportow`
                },
                {
                    label: 'Standard licencji',
                    value: `${state.settings.licenseMonths} mies.`,
                    detail: 'Aktualne ustawienie systemowe'
                }
            ];

            elements.overviewMetrics.innerHTML = metrics
                .map(
                    (metric) => `
                    <article class="metric-card">
                        <strong>${metric.value}</strong>
                        <p>${metric.label}</p>
                        <small>${metric.detail}</small>
                    </article>
                `
                )
                .join('');
        };

        const renderLogs = () => {
            const latestLogs = state.logs.slice(0, 5);
            if (elements.overviewLogs) {
                elements.overviewLogs.innerHTML = latestLogs.length
                    ? latestLogs
                          .map(
                              (log) => `
                            <li>
                                <strong>${formatDateTime(log.timestamp)}</strong><br>
                                <span>${log.message}</span>
                            </li>
                        `
                          )
                          .join('')
                    : '<li class="panel-empty">Brak logow.</li>';
            }

            if (elements.logsFull) {
                elements.logsFull.innerHTML = state.logs.length
                    ? state.logs
                          .map(
                              (log) => `
                            <div>
                                <strong>${formatDateTime(log.timestamp)}</strong>
                                <p>${log.message}</p>
                                <small>${log.actor || 'System'}</small>
                            </div>
                        `
                          )
                          .join('')
                    : '<p class="panel-empty">Brak logow w systemie.</p>';
            }

            renderAdminActions();
        };

        const renderAdminActions = () => {
            if (!elements.adminActions) {
                return;
            }
            const adminLogs = state.logs.filter((log) => log.actor && log.actor !== 'System').slice(0, 6);
            elements.adminActions.innerHTML = adminLogs.length
                ? adminLogs
                      .map(
                          (log) => `
                        <li>
                            <strong>${formatDateTime(log.timestamp)}</strong><br>
                            <span>${log.message}</span>
                        </li>
                    `
                      )
                      .join('')
                : '<li class="panel-empty">Brak dzialan administratora.</li>';
        };


        const renderWorkshopList = () => {
            if (!elements.workshopList) {
                return;
            }
            const now = Date.now();
            const filtered = state.workshops.filter((item) => {
                const matchesQuery = [item.name, item.email, item.registration]
                    .filter(Boolean)
                    .some((value) => value.toLowerCase().includes(filters.query.toLowerCase()));

                const isExpired = new Date(item.licenseEnd).getTime() < now;

                const matchesStatus = () => {
                    switch (filters.status) {
                        case 'active':
                            return item.active && !isExpired;
                        case 'expired':
                            return isExpired;
                        case 'inactive':
                            return !item.active;
                        default:
                            return true;
                    }
                };

                return matchesQuery && matchesStatus();
            });

            if (!filtered.length) {
                elements.workshopList.innerHTML = '<p class="panel-empty">Brak wynikow dla wybranego filtru.</p>';
                return;
            }

            elements.workshopList.innerHTML = filtered
                .map((item) => {
                    const licenseStatus = new Date(item.licenseEnd).getTime() < now ? 'panel-tag--warning' : 'panel-tag--success';
                    const licenseLabel = `Licencja do ${formatDate(item.licenseEnd)}`;
                    const activeLabel = item.active ? 'Aktywny' : 'Nieaktywny';
                    const activeClass = item.active ? 'panel-tag--success' : 'panel-tag--warning';
                    const contractTag = getContractTagMeta(item);
                    const contractDescription = getContractDescription(item);
                    const billingLabel = item.billingAmount ? `${formatCurrency(item.billingAmount)} netto / mc` : 'Brak stawki';
                    const canIssueTermination = item.contractStatus === 'indefinite';
                    const hasNotice = item.contractStatus === 'notice';
                    return `
                        <div class="panel-list__item">
                            <div>
                                <strong>${item.name}</strong><br>
                                <span>${item.email}</span> | <span>${item.registration}</span><br>
                                <small>Haslo tymczasowe: ${item.password}</small>
                                <div class="panel-tags">
                                    <span class="panel-tag ${licenseStatus}">${licenseLabel}</span>
                                    <span class="panel-tag ${activeClass}">${activeLabel}</span>
                                    <span class="panel-tag ${contractTag.className}">${contractTag.label}</span>
                                </div>
                                <div class="panel-billing-amount">Abonament: ${billingLabel}</div>
                                <p class="panel-contract-info">${contractDescription}</p>
                            </div>
                            <div class="panel-list__item-actions">
                                <button class="btn btn--ghost" type="button" data-action="toggle" data-id="${item.id}">
                                    ${item.active ? 'Dezaktywuj' : 'Aktywuj'}
                                </button>
                                <button class="btn btn--ghost" type="button" data-action="extend" data-id="${item.id}">
                                    Przedluz o ${state.settings.licenseMonths} mies.
                                </button>
                                ${
                                    canIssueTermination
                                        ? `<button class="btn btn--ghost" type="button" data-action="issue-termination" data-id="${item.id}">Rozpocznij wypowiedzenie</button>`
                                        : ''
                                }
                                ${
                                    hasNotice
                                        ? `<button class="btn btn--ghost" type="button" data-action="cancel-termination" data-id="${item.id}">Anuluj wypowiedzenie</button>`
                                        : ''
                                }
                            </div>
                        </div>
                    `;
                })
                .join('');
        };

        const renderReportList = () => {
            if (!elements.reportList) {
                return;
            }

            if (!state.reports.length) {
                elements.reportList.innerHTML = '<p class="panel-empty">Brak raportow w bazie.</p>';
                return;
            }

            const approvalPriority = {
                [APPROVAL_STATES.pending]: 0,
                [APPROVAL_STATES.rejected]: 1,
                [APPROVAL_STATES.approved]: 2
            };

            const matchesReportFilters = (report) => {
                const vinMatches = !reportFilters.vin || report.vin.toLowerCase().includes(reportFilters.vin);
                const registrationMatches =
                    !reportFilters.registration || (report.registrationNumber || '').toLowerCase().includes(reportFilters.registration);
                const approvalMatches =
                    reportFilters.approval === 'all' || report.approvalStatus === reportFilters.approval;
                return vinMatches && registrationMatches && approvalMatches;
            };

            const filteredReports = state.reports.filter(matchesReportFilters);
            if (!filteredReports.length) {
                elements.reportList.innerHTML = '<p class="panel-empty">Brak raportow dla wybranych filtrow.</p>';
                return;
            }

            const reports = [...filteredReports].sort((a, b) => {
                const aPriority = approvalPriority[a.approvalStatus] ?? 3;
                const bPriority = approvalPriority[b.approvalStatus] ?? 3;
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });

            elements.reportList.innerHTML = reports
                .map((report) => {
                    const isClosed = report.status === 'Zakonczona';
                    const tagClass = isClosed ? 'panel-tag--success' : 'panel-tag--warning';
                    const approvalMeta = getApprovalMeta(report.approvalStatus);
                    const noteClass =
                        report.approvalStatus === APPROVAL_STATES.rejected
                            ? 'panel-report-note panel-report-note--danger'
                            : 'panel-report-note';
                    const moderationNote = report.moderationNote
                        ? `<p class="${noteClass}">${report.moderationNote}</p>`
                        : '';
                    const moderationInfo = report.moderatedAt
                        ? ` • ${formatDateTime(report.moderatedAt)}${report.moderatedBy ? ` (${report.moderatedBy})` : ''}`
                        : '';
                    const firstRegistration = report.firstRegistrationDate
                        ? formatDate(report.firstRegistrationDate)
                        : 'Brak danych';
                    const mileageLabel = formatMileage(report.mileageKm);
                    const mediaSection = report.media?.length
                        ? `<div class="panel-media-gallery panel-media-gallery--inline">${createMediaGalleryMarkup(
                              report.media
                          )}</div>`
                        : '';
                    return `
                        <article class="panel-list__item">
                            <div>
                                <strong>${report.vin}</strong><br>
                                <span>${report.workshop}</span><br>
                                <ul class="panel-report-meta">
                                    <li>Rejestracja: ${report.registrationNumber || 'Nieznana'}</li>
                                    <li>Przebieg: ${mileageLabel}</li>
                                    <li>Pierwsza rejestracja: ${firstRegistration}</li>
                                </ul>
                                <small>Aktualizacja: ${formatDate(report.updatedAt)}</small>
                                <p>${report.summary || 'Brak opisu'}</p>
                                <div class="panel-tags">
                                    <span class="panel-tag ${tagClass}">${report.status}</span>
                                    <span class="panel-tag ${approvalMeta.className}">${approvalMeta.label}</span>
                                </div>
                                <small class="panel-report-moderation">
                                    Weryfikacja: ${approvalMeta.label}${moderationInfo}
                                </small>
                                ${mediaSection}
                                ${moderationNote}
                            </div>
                            <div class="panel-list__item-actions">
                                <button class="btn btn--ghost" type="button" data-action="select-report" data-report-id="${report.id}">
                                    Wczytaj
                                </button>
                            </div>
                        </article>
                    `;
                })
                .join('');
        };

        const populateReportForm = (report) => {
            if (!elements.reportEditForm || !report || !reportFields.id) {
                setMediaGalleryContent(elements.reportMediaGallery);
                return;
            }
            currentReportId = report.id;
            reportFields.id.value = report.id;
            if (reportFields.vin) {
                reportFields.vin.value = report.vin || '';
            }
            if (reportFields.registrationNumber) {
                reportFields.registrationNumber.value = report.registrationNumber || '';
            }
            if (reportFields.mileageKm) {
                reportFields.mileageKm.value = Number.isFinite(Number(report.mileageKm)) ? report.mileageKm : '';
            }
            if (reportFields.firstRegistrationDate) {
                reportFields.firstRegistrationDate.value = report.firstRegistrationDate || '';
            }
            if (reportFields.approvalStatus) {
                reportFields.approvalStatus.value = report.approvalStatus || APPROVAL_STATES.pending;
            }
            if (reportFields.summary) {
                reportFields.summary.value = report.summary || '';
            }
            if (reportFields.moderationNote) {
                reportFields.moderationNote.value = report.moderationNote || '';
            }
            setMediaGalleryContent(elements.reportMediaGallery, report.media || []);
            setFeedback(elements.reportFeedback, `Edytujesz raport VIN ${report.vin}`, 'success');
        };

        const populateSettingsForm = () => {
            if (!elements.settingsForm) {
                return;
            }
            elements.settingsForm.licenseMonths.value = state.settings.licenseMonths;
            elements.settingsForm.statusOptions.value = state.settings.statusOptions.join(', ');
        };

        const bindNavigation = () => {
            elements.navButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    activateView(btn.dataset.panelTarget);
                });
            });
            activateView('overview');
        };

        const bindEvents = () => {
            elements.logoutBtn?.addEventListener('click', () => {
                window.WarsztatSession.clear();
                window.location.href = LOGIN_URL;
            });

            elements.workshopFilterForm?.addEventListener('submit', (event) => {
                event.preventDefault();
                const data = new FormData(elements.workshopFilterForm);
                filters.query = String(data.get('query') || '').trim().toLowerCase();
                filters.status = String(data.get('status') || 'all');
                renderWorkshopList();
            });

            elements.reportFilterForm?.addEventListener('submit', (event) => {
                event.preventDefault();
                const data = new FormData(elements.reportFilterForm);
                reportFilters.vin = String(data.get('vin') || '').trim().toLowerCase();
                reportFilters.registration = String(data.get('registration') || '').trim().toLowerCase();
                reportFilters.approval = String(data.get('approval') || 'all');
                renderReportList();
            });

            elements.createWorkshopForm?.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(elements.createWorkshopForm);
                const payload = {
                    name: String(formData.get('name') || '').trim(),
                    email: String(formData.get('email') || '').trim().toLowerCase(),
                    registration: String(formData.get('registration') || '').trim(),
                    password: String(formData.get('password') || '').trim(),
                    billingAmount: Number(formData.get('billingAmount'))
                };

                if (!payload.name || !payload.email || !payload.registration || !payload.password) {
                    setFeedback(elements.adminFeedback, 'Uzupelnij wszystkie pola.', 'error');
                    return;
                }

                if (!Number.isFinite(payload.billingAmount) || payload.billingAmount <= 0) {
                    setFeedback(elements.adminFeedback, 'Podaj miesieczna oplata dla warsztatu.', 'error');
                    return;
                }

                try {
                    window.WarsztatWorkshops.create(payload, {
                        licenseMonths: state.settings.licenseMonths
                    });
                    refreshState('workshops');
                    renderWorkshopList();
                    renderMetrics();
                    elements.createWorkshopForm.reset();
                    setFeedback(elements.adminFeedback, 'Dodano konto warsztatu.', 'success');
                    logAction(`Dodano warsztat ${payload.name}.`, { type: 'workshop' });
                } catch (error) {
                    setFeedback(elements.adminFeedback, error.message, 'error');
                }
            });

            elements.workshopList?.addEventListener('click', (event) => {
                const actionBtn = event.target.closest('button[data-action]');
                if (!actionBtn) {
                    return;
                }
                const id = Number(actionBtn.dataset.id);
                if (!id) {
                    return;
                }
                const workshop = state.workshops.find((item) => item.id === id);
                if (!workshop) {
                    return;
                }

                if (actionBtn.dataset.action === 'toggle') {
                    window.WarsztatWorkshops.toggleActive(id, !workshop.active);
                    refreshState('workshops');
                    renderWorkshopList();
                    renderMetrics();
                    logAction(
                        `${!workshop.active ? 'Aktywowano' : 'Dezaktywowano'} warsztat ${workshop.name}.`,
                        { type: 'workshop' }
                    );
                } else if (actionBtn.dataset.action === 'extend') {
                    window.WarsztatWorkshops.extendLicense(id, state.settings.licenseMonths);
                    refreshState('workshops');
                    renderWorkshopList();
                    logAction(`Przedluzono licencje warsztatu ${workshop.name}.`, { type: 'workshop' });
                } else if (actionBtn.dataset.action === 'issue-termination') {
                    try {
                        window.WarsztatWorkshops.issueTermination(id);
                        refreshState('workshops');
                        renderWorkshopList();
                        renderMetrics();
                        setFeedback(elements.adminFeedback, 'Wypowiedzenie zostalo zarejestrowane.', 'success');
                        logAction(`Rozpoczeto wypowiedzenie warsztatu ${workshop.name}.`, { type: 'contract' });
                    } catch (error) {
                        setFeedback(elements.adminFeedback, error.message, 'error');
                    }
                } else if (actionBtn.dataset.action === 'cancel-termination') {
                    window.WarsztatWorkshops.cancelTermination(id);
                    refreshState('workshops');
                    renderWorkshopList();
                    renderMetrics();
                    setFeedback(elements.adminFeedback, 'Wypowiedzenie zostalo anulowane.', 'success');
                    logAction(`Anulowano wypowiedzenie warsztatu ${workshop.name}.`, { type: 'contract' });
                }
            });

            elements.reportList?.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-report-id]');
                if (!button) {
                    return;
                }
                const reportId = Number(button.dataset.reportId);
                const report = state.reports.find((item) => item.id === reportId);
                if (report) {
                    populateReportForm(report);
                }
            });

            elements.reportEditForm?.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(elements.reportEditForm);
                const reportId = Number(formData.get('reportId'));
                const vin = String(formData.get('vin') || '').trim().toUpperCase();
                const summary = String(formData.get('summary') || '').trim();
                const registrationNumber = String(formData.get('registrationNumber') || '').trim().toUpperCase();
                const approvalStatusValue = String(formData.get('approvalStatus') || '').trim();
                const moderationNote = String(formData.get('moderationNote') || '').trim();
                const mileageRaw = String(formData.get('mileageKm') ?? '').trim();
                const mileageValue = mileageRaw === '' ? null : Number(mileageRaw);
                const firstRegistrationDate = String(formData.get('firstRegistrationDate') || '').trim();

                if (!reportId) {
                    setFeedback(elements.reportFeedback, 'Wybierz raport do edycji.', 'error');
                    return;
                }

                if (!vin) {
                    setFeedback(elements.reportFeedback, 'Numer VIN nie moze byc pusty.', 'error');
                    return;
                }

                if (mileageValue !== null && (!Number.isFinite(mileageValue) || mileageValue < 0)) {
                    setFeedback(elements.reportFeedback, 'Podaj prawidlowy przebieg lub pozostaw pole puste.', 'error');
                    return;
                }

                try {
                    const current = state.reports.find((item) => item.id === reportId);
                    const updates = {
                        vin,
                        status: current?.status || 'Zakonczona',
                        summary,
                        registrationNumber,
                        mileageKm: mileageValue === null ? null : Math.round(mileageValue),
                        firstRegistrationDate: firstRegistrationDate || null
                    };
                    if (reportFields.approvalStatus) {
                        updates.approvalStatus = approvalStatusValue || current?.approvalStatus || APPROVAL_STATES.pending;
                        updates.moderationNote = moderationNote;
                        if (!current || current.approvalStatus !== updates.approvalStatus) {
                            updates.moderatedBy = session.user.email || session.user.name || 'Administrator';
                        }
                    }
                    const updated = window.WarsztatReports.update(reportId, updates);
                    refreshState('reports');
                    renderReportList();
                    renderMetrics();
                    populateReportForm(updated);
                    setFeedback(elements.reportFeedback, 'Zapisano zmiany w raporcie.', 'success');
                    logAction(`Zaktualizowano raport VIN ${updated.vin}.`, { type: 'report' });
                } catch (error) {
                    setFeedback(elements.reportFeedback, error.message, 'error');
                }
            });

            elements.settingsForm?.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(elements.settingsForm);
                const months = Number(formData.get('licenseMonths'));
                const statusOptions = String(formData.get('statusOptions') || '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);

                if (!Number.isInteger(months) || months <= 0) {
                    setFeedback(elements.settingsFeedback, 'Podaj poprawna dlugosc licencji.', 'error');
                    return;
                }

                if (!statusOptions.length) {
                    setFeedback(elements.settingsFeedback, 'Dodaj co najmniej jeden status.', 'error');
                    return;
                }

                window.WarsztatSettings.update({
                    licenseMonths: months,
                    statusOptions
                });
                refreshState('settings');
                populateSettingsForm();
                renderWorkshopList();
                setFeedback(elements.settingsFeedback, 'Zapisano ustawienia.', 'success');
                logAction('Zmieniono ustawienia systemowe.', { type: 'settings' });
            });

            elements.logsClearBtn?.addEventListener('click', () => {
                window.WarsztatLogs.clear();
                refreshState('logs');
                renderLogs();
            });
        };

        const initialize = () => {
            refreshState();
            populateSettingsForm();
            renderMetrics();
            renderWorkshopList();
            renderReportList();
            renderLogs();
            bindNavigation();
            bindEvents();
        };

        initialize();

        function initializeWorkshopPanel() {
            document.body.classList.add('panel-body--workshop');
            const workshopView = document.querySelector('[data-panel="workshop-home"]');
            elements.views.forEach((view) => {
                view.classList.toggle('is-active', view === workshopView);
            });

            elements.logoutBtn?.addEventListener('click', () => {
                window.WarsztatSession.clear();
                window.location.href = LOGIN_URL;
            });

            const workshopReportForm = document.getElementById('workshop-report-form');
            const workshopReportFeedback = document.getElementById('workshop-report-feedback');
            const workshopMediaPreview = document.getElementById('workshop-media-preview');
            const workshopMediaInput = workshopReportForm?.querySelector('input[name="mediaFiles"]');
            const MEDIA_LIMIT = 5;
            const MEDIA_MAX_SIZE_MB = 5;
            const MEDIA_MAX_SIZE = MEDIA_MAX_SIZE_MB * 1024 * 1024;
            let queuedMediaFiles = [];

            const getWorkshopRecord = () =>
                window.WarsztatWorkshops
                    .getAll()
                    .find((item) => item.id === session.user.id || item.email === session.user.email) || session.user;

            const renderWorkshopSummary = () => {
                const container = document.getElementById('workshop-details');
                if (!container) {
                    return;
                }
                const workshop = getWorkshopRecord();
                const licenseEnd = formatDate(workshop.licenseEnd);
                const licenseStart = formatDate(workshop.licenseStart);
                const isActive = workshop.active !== false;
                const licenseEndDate = workshop.licenseEnd ? new Date(workshop.licenseEnd) : null;
                const isLicenseExpired = licenseEndDate ? licenseEndDate.getTime() < Date.now() : false;
                const contractTag = getContractTagMeta(workshop);
                const contractDescription = getContractDescription(workshop);
                const billingLabel = workshop.billingAmount
                    ? `${formatCurrency(workshop.billingAmount)} netto / mc`
                    : 'Brak stawki';
                container.innerHTML = `
                    <strong>${workshop.name || 'Twoj warsztat'}</strong>
                    <small>${workshop.email || 'brak e-maila'} | ${workshop.registration || 'brak numeru rejestrowego'}</small>
                    <div class="workshop-summary__meta">
                        <div>
                            <p>Licencja od</p>
                            <strong>${licenseStart}</strong>
                        </div>
                        <div>
                            <p>Licencja do</p>
                            <strong>${licenseEnd}</strong>
                        </div>
                        <div>
                            <p>Status konta</p>
                            <strong>${isActive ? 'Aktywne' : 'Dezaktywowane'}</strong>
                        </div>
                    </div>
                    <div class="panel-tags">
                        <span class="panel-tag ${isActive ? 'panel-tag--success' : 'panel-tag--warning'}">${
                            isActive ? 'Konto aktywne' : 'Konto zablokowane'
                        }</span>
                        <span class="panel-tag ${isLicenseExpired ? 'panel-tag--warning' : 'panel-tag--success'}">
                            Licencja do ${licenseEnd}
                        </span>
                        <span class="panel-tag ${contractTag.className}">${contractTag.label}</span>
                    </div>
                    <div class="workshop-summary__contract">
                        <p>${contractDescription}</p>
                        <p>Abonament: <strong>${billingLabel}</strong></p>
                    </div>
                `;
            };

            const renderWorkshopReports = () => {
                const list = document.getElementById('workshop-report-list');
                if (!list) {
                    return;
                }
                const workshop = getWorkshopRecord();
                const reports = window.WarsztatReports.getAll().filter((report) => {
                    if (report.workshopId && workshop.id) {
                        return report.workshopId === workshop.id;
                    }
                    return (report.workshop || '').toLowerCase() === (workshop.name || '').toLowerCase();
                });
                if (!reports.length) {
                    list.innerHTML = '<p class="panel-empty">Brak raportow przypisanych do tego warsztatu.</p>';
                    return;
                }
                const sortedReports = [...reports].sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
                list.innerHTML = sortedReports
                    .map((report) => {
                        const approvalMeta = getApprovalMeta(report.approvalStatus);
                        const noteClass =
                            report.approvalStatus === APPROVAL_STATES.rejected
                                ? 'panel-report-note panel-report-note--danger'
                                : 'panel-report-note';
                        const noteBlock = report.moderationNote
                            ? `<p class="${noteClass}">${report.moderationNote}</p>`
                            : '';
                        const firstRegistration = report.firstRegistrationDate
                            ? formatDate(report.firstRegistrationDate)
                            : 'Brak danych';
                        const mileageLabel = formatMileage(report.mileageKm);
                        const mediaSection = report.media?.length
                            ? `<div class="panel-media-gallery">${createMediaGalleryMarkup(report.media)}</div>`
                            : '';
                        return `
                        <article class="panel-list__item">
                            <div>
                                <strong>${report.vin}</strong>
                                <p>${report.summary || 'Brak opisu'}</p>
                                <ul class="panel-report-meta">
                                    <li>Rejestracja: ${report.registrationNumber || 'Brak danych'}</li>
                                    <li>Przebieg: ${mileageLabel}</li>
                                    <li>Pierwsza rejestracja: ${firstRegistration}</li>
                                </ul>
                                <small>Ostatnia aktualizacja: ${formatDate(report.updatedAt)}</small>
                                <div class="panel-tags">
                                    <span class="panel-tag ${
                                        report.status === 'Zakonczona' ? 'panel-tag--success' : 'panel-tag--warning'
                                    }">${report.status}</span>
                                    <span class="panel-tag ${approvalMeta.className}">${approvalMeta.label}</span>
                                </div>
                                ${mediaSection}
                                ${noteBlock}
                            </div>
                        </article>
                    `;
                    })
                    .join('');
            };

            const renderWorkshopMediaPreview = () => {
                if (!workshopMediaPreview) {
                    return;
                }
                if (!queuedMediaFiles.length) {
                    workshopMediaPreview.innerHTML = '<li class="panel-empty">Brak zalacznikow.</li>';
                    return;
                }
                workshopMediaPreview.innerHTML = queuedMediaFiles
                    .map(
                        (file) => `
                            <li>
                                <span>${escapeHtml(file.name)}</span>
                                <span>${formatFileSize(file.size)}</span>
                            </li>
                        `
                    )
                    .join('');
            };

            const handleMediaSelection = (fileList) => {
                if (!fileList) {
                    queuedMediaFiles = [];
                    renderWorkshopMediaPreview();
                    return;
                }
                const nextFiles = Array.from(fileList).slice(0, MEDIA_LIMIT);
                const validFiles = [];
                nextFiles.forEach((file) => {
                    if (file.size > MEDIA_MAX_SIZE) {
                        setFeedback(
                            workshopReportFeedback,
                            `Plik ${file.name} przekracza limit ${MEDIA_MAX_SIZE_MB} MB i zostal pominiety.`,
                            'error'
                        );
                        return;
                    }
                    const type = file.type || '';
                    if (!type.startsWith('image') && !type.startsWith('video')) {
                        setFeedback(workshopReportFeedback, `Plik ${file.name} nie jest obrazem ani filmem.`, 'error');
                        return;
                    }
                    validFiles.push(file);
                });
                queuedMediaFiles = validFiles;
                renderWorkshopMediaPreview();
            };

            const readFileAsDataUrl = (file) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('Nie udalo sie odczytac pliku.'));
                    reader.readAsDataURL(file);
                });

            const buildMediaPayload = async () => {
                if (!queuedMediaFiles.length) {
                    return [];
                }
                const timestamp = Date.now();
                return Promise.all(
                    queuedMediaFiles.slice(0, MEDIA_LIMIT).map(async (file, index) => ({
                        id: `media_${timestamp}_${index}`,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        dataUrl: await readFileAsDataUrl(file),
                        createdAt: new Date().toISOString()
                    }))
                );
            };

            const bindWorkshopReportForm = () => {
                workshopReportForm?.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    if (!workshopReportForm) {
                        return;
                    }
                    const formData = new FormData(workshopReportForm);
                    const vin = String(formData.get('vin') || '').trim().toUpperCase();
                    const registrationNumber = String(formData.get('registrationNumber') || '').trim().toUpperCase();
                    const mileageKm = Number(formData.get('mileageKm'));
                    const firstRegistrationDate = String(formData.get('firstRegistrationDate') || '').trim();
                    const status = 'Zakonczona';
                    const summary = String(formData.get('summary') || '').trim();

                    if (!vin || !registrationNumber) {
                        setFeedback(workshopReportFeedback, 'Podaj VIN i numer rejestracyjny.', 'error');
                        return;
                    }

                    if (!Number.isFinite(mileageKm) || mileageKm < 0) {
                        setFeedback(workshopReportFeedback, 'Podaj prawidlowy przebieg.', 'error');
                        return;
                    }

                    if (!firstRegistrationDate) {
                        setFeedback(workshopReportFeedback, 'Podaj date pierwszej rejestracji.', 'error');
                        return;
                    }

                    const workshop = getWorkshopRecord();
                    try {
                        const media = await buildMediaPayload();
                        window.WarsztatReports.create({
                            vin,
                            registrationNumber,
                            status,
                            summary,
                            workshop: workshop.name || workshop.email || 'Warsztat',
                            workshopId: workshop.id || null,
                            mileageKm,
                            firstRegistrationDate,
                            media
                        });
                        window.WarsztatLogs?.add({
                            message: `Warsztat ${workshop.name || workshop.email || 'Warsztat'} dodal raport VIN ${vin}.`,
                            actor: workshop.email || workshop.name || 'Warsztat'
                        });
                        setFeedback(workshopReportFeedback, 'Raport wyslany do akceptacji.', 'success');
                        workshopReportForm.reset();
                        queuedMediaFiles = [];
                        renderWorkshopMediaPreview();
                        if (workshopMediaInput) {
                            workshopMediaInput.value = '';
                        }
                        renderWorkshopReports();
                    } catch (error) {
                        setFeedback(workshopReportFeedback, error.message || 'Nie udalo sie dodac raportu.', 'error');
                    }
                });
            };

            workshopMediaInput?.addEventListener('change', (event) => handleMediaSelection(event.target.files));
            renderWorkshopMediaPreview();

            renderWorkshopSummary();
            renderWorkshopReports();
            bindWorkshopReportForm();
        }
    });
})();
