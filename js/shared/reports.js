(function (window) {
    const REPORTS_KEY = 'warsztat:reports';
    const APPROVAL_STATES = {
        pending: 'pending',
        approved: 'approved',
        rejected: 'rejected'
    };
    const sampleReports = [
        {
            id: 1,
            vin: 'WAUZZZ8V9JA123456',
            registrationNumber: 'WX1234K',
            workshopId: 'wrk_demo_1',
            mileageKm: 183500,
            firstRegistrationDate: '2018-05-12',
            workshop: 'Auto Serwis 24',
            status: 'Zakonczona',
            updatedAt: '2024-11-18T10:00:00.000Z',
            summary: 'Wymiana rozrzadu oraz oleju.',
            approvalStatus: APPROVAL_STATES.approved,
            media: [
                {
                    id: 'med_demo_1',
                    name: 'silnik-po.jpg',
                    type: 'image/jpeg',
                    size: 102400,
                    dataUrl: '',
                    description: 'Silnik po naprawie'
                }
            ]
        },
        {
            id: 2,
            vin: 'VF3LCBHY6HS789012',
            registrationNumber: 'KR5GS89',
            workshopId: 'wrk_demo_2',
            mileageKm: 99500,
            firstRegistrationDate: '2019-03-22',
            workshop: 'MotorTech Pro',
            status: 'W trakcie',
            updatedAt: '2025-01-05T08:30:00.000Z',
            summary: 'Diagnostyka elektroniki silnika.',
            approvalStatus: APPROVAL_STATES.approved,
            media: []
        }
    ];

    const normalizeMileage = (value) => {
        const mileage = Number(value);
        return Number.isFinite(mileage) && mileage >= 0 ? Math.round(mileage) : null;
    };

    const normalizeFirstRegistration = (value) => {
        if (!value) {
            return null;
        }
        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return String(value);
            }
            return date.toISOString().split('T')[0];
        } catch (error) {
            return String(value);
        }
    };

    const normalizeMediaItem = (item, index = 0) => {
        if (!item || typeof item !== 'object') {
            return null;
        }
        return {
            id: item.id || `media_${Date.now()}_${index}`,
            name: item.name || 'Zalacznik',
            type: item.type || 'application/octet-stream',
            size: Number(item.size) || 0,
            dataUrl: item.dataUrl || '',
            description: item.description || '',
            createdAt: item.createdAt || new Date().toISOString()
        };
    };

    const safeParse = (value) => {
        try {
            return JSON.parse(value) || [];
        } catch (error) {
            console.warn('Nie udalo sie odczytac raportow', error);
            return [];
        }
    };

    const normalizeReport = (report, index = 0) => {
        if (!report) {
            return report;
        }
        const createdAt = report.createdAt || report.updatedAt || new Date().toISOString();
        const updatedAt = report.updatedAt || createdAt;
        const approvalStatus = report.approvalStatus || APPROVAL_STATES.pending;
        const registrationNumber = (report.registrationNumber || '').toUpperCase();
        return {
            id: report.id || Date.now() + index,
            vin: report.vin || 'NIEZNANY VIN',
            workshop: report.workshop || 'Nieznany warsztat',
            workshopId: report.workshopId || null,
            registrationNumber,
            mileageKm: normalizeMileage(report.mileageKm),
            firstRegistrationDate: normalizeFirstRegistration(report.firstRegistrationDate),
            status: report.status || 'W trakcie',
            summary: report.summary || '',
            createdAt,
            updatedAt,
            approvalStatus,
            moderationNote: report.moderationNote || '',
            moderatedAt: report.moderatedAt || (approvalStatus !== APPROVAL_STATES.pending ? updatedAt : null),
            moderatedBy: report.moderatedBy || null,
            media: Array.isArray(report.media)
                ? report.media.map((item, mediaIndex) => normalizeMediaItem(item, mediaIndex)).filter(Boolean)
                : []
        };
    };

    const saveReports = (items) => {
        localStorage.setItem(REPORTS_KEY, JSON.stringify(items));
    };

    const ensureSeeded = () => {
        if (localStorage.getItem(REPORTS_KEY)) {
            return;
        }
        saveReports(sampleReports);
    };

    const getAllReports = () => {
        const raw = safeParse(localStorage.getItem(REPORTS_KEY));
        const normalized = raw.map((report, index) => normalizeReport(report, index));
        saveReports(normalized);
        return normalized;
    };

    const findByVin = (vin) => getAllReports().filter((item) => item.vin === vin);

    const findById = (id) => getAllReports().find((item) => item.id === id);

    const updateReport = (id, updates) => {
        const reports = getAllReports();
        const index = reports.findIndex((item) => item.id === id);
        if (index === -1) {
            throw new Error('Nie znaleziono raportu.');
        }
        const previous = reports[index];
        const approvalChanged =
            typeof updates.approvalStatus !== 'undefined' && updates.approvalStatus !== previous.approvalStatus;
        reports[index] = normalizeReport(
            {
                ...previous,
                ...updates,
                updatedAt: updates.updatedAt || new Date().toISOString(),
                moderatedAt: approvalChanged ? new Date().toISOString() : previous.moderatedAt,
                moderatedBy: approvalChanged ? updates.moderatedBy || previous.moderatedBy : previous.moderatedBy
            },
            index
        );
        saveReports(reports);
        return reports[index];
    };

    const createReport = (payload) => {
        const reports = getAllReports();
        const now = new Date().toISOString();
        const report = normalizeReport({
            ...payload,
            id: Date.now(),
            createdAt: now,
            updatedAt: now,
            approvalStatus: APPROVAL_STATES.pending
        });
        reports.push(report);
        saveReports(reports);
        return report;
    };

    const moderateReport = (id, { approvalStatus, moderationNote, actor }) =>
        updateReport(id, {
            approvalStatus,
            moderationNote,
            moderatedBy: actor
        });

    window.WarsztatReports = {
        ensureSeeded,
        findByVin,
        getAll: getAllReports,
        getById: findById,
        update: updateReport,
        create: createReport,
        moderate: moderateReport,
        APPROVAL_STATES
    };
})(window);
