(function (window) {
    const STORAGE_KEY = 'warsztat:workshops';
    const DEFAULT_LICENSE_MONTHS = 12;
    const CONTRACT_MONTHS = 12;
    const TERMINATION_NOTICE_MONTHS = 3;

    const safeParse = (value) => {
        try {
            return JSON.parse(value) || [];
        } catch (error) {
            console.warn('Blad podczas odczytu warsztatow', error);
            return [];
        }
    };

    const endOfMonth = (date) => {
        const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        result.setHours(23, 59, 59, 999);
        return result.toISOString();
    };

    const addMonths = (isoDate, months) => {
        const date = isoDate ? new Date(isoDate) : new Date();
        const originalDay = date.getDate();
        date.setMonth(date.getMonth() + months);
        if (date.getDate() < originalDay) {
            date.setDate(0);
        }
        return date.toISOString();
    };

    const calculateTerminationEnd = (noticeDate) => {
        const notice = noticeDate ? new Date(noticeDate) : new Date();
        notice.setMonth(notice.getMonth() + TERMINATION_NOTICE_MONTHS);
        return endOfMonth(notice);
    };

    const applyContractRules = (workshop) => {
        if (!workshop) {
            return workshop;
        }
        const now = Date.now();
        const fixedEndTime = workshop.contractFixedEnd ? new Date(workshop.contractFixedEnd).getTime() : 0;
        if (!workshop.contractIndefiniteSince && fixedEndTime && now >= fixedEndTime) {
            workshop.contractIndefiniteSince = workshop.contractFixedEnd;
        }

        const hasIndefinite = Boolean(workshop.contractIndefiniteSince);

        if (workshop.terminationNoticeDate) {
            const terminationEnd = workshop.terminationEndDate || calculateTerminationEnd(workshop.terminationNoticeDate);
            workshop.terminationEndDate = terminationEnd;
            const terminationEndTime = new Date(terminationEnd).getTime();
            if (now >= terminationEndTime) {
                workshop.active = false;
                workshop.contractStatus = 'terminated';
                workshop.terminatedAt = workshop.terminatedAt || terminationEnd;
            } else {
                workshop.contractStatus = 'notice';
            }
        } else if (!workshop.active) {
            workshop.contractStatus = hasIndefinite ? 'indefinite' : 'fixed';
        } else if (hasIndefinite) {
            workshop.contractStatus = 'indefinite';
        } else {
            workshop.contractStatus = 'fixed';
        }

        return workshop;
    };

    const normalizeWorkshop = (item) => {
        if (!item) {
            return item;
        }
        const licenseStart = item.licenseStart || item.createdAt || new Date().toISOString();
        const licenseEnd = item.licenseEnd || addMonths(licenseStart, DEFAULT_LICENSE_MONTHS);
        const contractFixedEnd = item.contractFixedEnd || addMonths(licenseStart, CONTRACT_MONTHS);
        const normalized = {
            ...item,
            active: item.active !== false,
            createdAt: item.createdAt || new Date().toISOString(),
            licenseStart,
            licenseEnd,
            billingAmount: Number(item.billingAmount) || 0,
            contractFixedEnd,
            contractIndefiniteSince: item.contractIndefiniteSince || null,
            terminationNoticeDate: item.terminationNoticeDate || null,
            terminationEndDate: item.terminationEndDate || null,
            contractStatus: item.contractStatus || 'fixed',
            terminatedAt: item.terminatedAt || null
        };
        return applyContractRules(normalized);
    };

    const readAll = () => {
        const raw = safeParse(localStorage.getItem(STORAGE_KEY));
        let mutated = false;
        const normalized = raw.map((item) => {
            const result = normalizeWorkshop(item);
            if (!mutated && JSON.stringify(result) !== JSON.stringify(item)) {
                mutated = true;
            }
            return result;
        });
        if (mutated) {
            saveAll(normalized);
        }
        return normalized;
    };

    const saveAll = (items) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    };

    const existsByEmail = (email) => readAll().some((item) => item.email === email);

    const createWorkshop = (payload, options = {}) => {
        const workshops = readAll();
        if (workshops.some((item) => item.email === payload.email)) {
            throw new Error('Warsztat z tym adresem e-mail juz istnieje.');
        }

        const now = new Date().toISOString();
        const licenseMonths = options.licenseMonths || DEFAULT_LICENSE_MONTHS;
        const workshop = normalizeWorkshop({
            id: Date.now(),
            name: payload.name,
            email: payload.email,
            registration: payload.registration,
            password: payload.password,
            active: true,
            createdAt: now,
            licenseStart: now,
            licenseEnd: addMonths(now, licenseMonths),
            billingAmount: Number(payload.billingAmount) || 0
        });

        workshops.push(workshop);
        saveAll(workshops);
        return workshops;
    };

    const applyUpdate = (id, updater) => {
        const workshops = readAll();
        const index = workshops.findIndex((item) => item.id === id);
        if (index === -1) {
            throw new Error('Nie znaleziono warsztatu.');
        }
        const updated = normalizeWorkshop(updater({ ...workshops[index] }));
        workshops[index] = updated;
        saveAll(workshops);
        return workshops;
    };

    const extendLicense = (id, months) =>
        applyUpdate(id, (item) => ({
            ...item,
            licenseEnd: addMonths(item.licenseEnd, months)
        }));

    const toggleActive = (id, isActive) =>
        applyUpdate(id, (item) => ({
            ...item,
            active: isActive
        }));

    const issueTerminationNotice = (id, noticeDate = new Date().toISOString()) =>
        applyUpdate(id, (item) => {
            if (item.contractStatus !== 'indefinite') {
                throw new Error('Umowa nie jest na czas nieokreslony.');
            }
            const terminationNoticeDate = noticeDate;
            const terminationEndDate = calculateTerminationEnd(terminationNoticeDate);
            return {
                ...item,
                terminationNoticeDate,
                terminationEndDate,
                contractStatus: 'notice'
            };
        });

    const cancelTerminationNotice = (id) =>
        applyUpdate(id, (item) => {
            if (!item.terminationNoticeDate) {
                return item;
            }
            return {
                ...item,
                terminationNoticeDate: null,
                terminationEndDate: null,
                terminatedAt: null,
                contractStatus: item.contractIndefiniteSince ? 'indefinite' : 'fixed'
            };
        });

    const resetPassword = (id, newPassword) =>
        applyUpdate(id, (item) => ({
            ...item,
            password: newPassword
        }));

    const updateWorkshop = (id, updates) =>
        applyUpdate(id, (item) => ({
            ...item,
            ...updates
        }));

    const findByCredentials = (email, password) =>
        readAll().find((item) => item.email === email && item.password === password);

    const getContractState = (workshopId) => {
        const current = readAll().find((item) => item.id === workshopId);
        return current ? { ...current } : null;
    };

    window.WarsztatWorkshops = {
        getAll: readAll,
        create: createWorkshop,
        existsByEmail,
        findByCredentials,
        extendLicense,
        toggleActive,
        issueTermination: issueTerminationNotice,
        cancelTermination: cancelTerminationNotice,
        resetPassword,
        update: updateWorkshop,
        getContractState
    };
})(window);
