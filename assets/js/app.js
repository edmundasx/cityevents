const USER_STORAGE_KEY = 'cityevents_user';
const LOCAL_EVENTS_KEY = 'cityevents_events';

const FALLBACK_EVENTS = [
    {
        id: 1,
        organizer_id: 2,
        organizer_name: 'Organizer',
        title: 'Miesto mugė',
        description: 'Sezoninė miesto mugė su vietiniais gamintojais ir scena',
        category: 'food',
        location: 'Rotušės aikštė',
        lat: 54.6872,
        lng: 25.2797,
        event_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        price: 0,
        status: 'approved',
        cover_image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 2,
        organizer_id: 2,
        organizer_name: 'Organizer',
        title: 'Technologijų vakaras',
        description: 'Diskusijos ir dirbtuvės apie inovacijas',
        category: 'business',
        location: 'Technopolis Vilnius',
        lat: 54.6690,
        lng: 25.2747,
        event_date: new Date(Date.now() + 14 * 86400000).toISOString(),
        price: 15,
        status: 'pending',
        cover_image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 3,
        organizer_id: 2,
        organizer_name: 'Organizer',
        title: 'Muzikos piknikas',
        description: 'Gyva muzika parke ir maisto furgonai',
        category: 'music',
        location: 'Bernardinų sodas',
        lat: 54.6840,
        lng: 25.2900,
        event_date: new Date(Date.now() + 3 * 86400000).toISOString(),
        price: 5,
        status: 'approved',
        cover_image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 4,
        organizer_id: 2,
        organizer_name: 'Organizer',
        title: 'Urban Run',
        description: '5 km miesto bėgimas palei upę su muzika finiše',
        category: 'sports',
        location: 'Neries pakrantė',
        lat: 54.6890,
        lng: 25.2660,
        event_date: new Date(Date.now() - 10 * 86400000).toISOString(),
        price: 0,
        status: 'approved',
        cover_image: 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 5,
        organizer_id: 2,
        organizer_name: 'Organizer',
        title: 'Kino vakaras po atviru dangumi',
        description: 'Vasaros kino seansas su vietos režisieriumi',
        category: 'arts',
        location: 'Valdovų rūmų kiemas',
        lat: 54.6850,
        lng: 25.2890,
        event_date: new Date(Date.now() + 21 * 86400000).toISOString(),
        price: 8,
        status: 'pending',
        cover_image: 'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 6,
        organizer_id: 2,
        organizer_name: 'Organizer',
        title: 'Startuolių pusryčiai',
        description: 'Tinklaveikos susitikimas ankstyvą rytą su kava ir investuotojais',
        category: 'business',
        location: 'Vilnius Tech Park',
        lat: 54.6800,
        lng: 25.2870,
        event_date: new Date(Date.now() + 35 * 86400000).toISOString(),
        price: 12,
        status: 'approved',
        cover_image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    },
];

const FALLBACK_NOTIFICATIONS = [
    { id: 1, type: 'admin', message: '2 renginiai laukia patvirtinimo', created_at: 'prieš 5 min.' },
    { id: 2, type: 'organizer', message: '„Miesto mugė“ patvirtinta ir matoma lankytojams', created_at: 'prieš 1 val.' },
    { id: 3, type: 'user', message: 'Naujų renginių pagal jūsų pomėgius: muzika', created_at: 'vakar' },
];

const state = {
    map: null,
    markers: [],
    events: [],
    notifications: [],
    favorites: [1, 3],
    organizerEventsCache: [],
};

function getLocalEvents() {
    const saved = localStorage.getItem(LOCAL_EVENTS_KEY);
    return saved ? JSON.parse(saved) : [];
}

function upsertLocalEvent(event) {
    const events = getLocalEvents();
    const index = events.findIndex(e => String(e.id) === String(event.id));
    if (index >= 0) {
        events[index] = { ...events[index], ...event };
    } else {
        events.push(event);
    }
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
    return events;
}

function mergeWithLocalEvents(events = []) {
    const localEvents = getLocalEvents();
    const map = new Map();
    [...events, ...localEvents].forEach(ev => {
        map.set(String(ev.id), { ...ev });
    });
    return Array.from(map.values());
}

function getKnownEvents(filters = {}) {
    let events = state.events.length ? state.events : apiService.getCachedEvents();
    if (!events.length) {
        events = FALLBACK_EVENTS;
    }

    if (filters.category) {
        events = events.filter(e => e.category === filters.category);
    }

    return mergeWithLocalEvents(events);
}

async function ensureEventsLoaded(params = {}) {
    if (!Object.keys(params).length && state.events.length) {
        return state.events;
    }

    const { data, error } = await apiService.getEvents(params, FALLBACK_EVENTS);
    const events = mergeWithLocalEvents(data || []);
    if (!Object.keys(params).length || !error || !state.events.length) {
        state.events = events;
    }
    return events;
}

async function ensureNotificationsLoaded() {
    if (state.notifications.length) return state.notifications;

    try {
        const { data } = await apiService.getNotifications({}, FALLBACK_NOTIFICATIONS);
        state.notifications = data && data.length ? data : FALLBACK_NOTIFICATIONS;
    } catch (err) {
        const cached = apiService.getCachedNotifications();
        state.notifications = cached.length ? cached : FALLBACK_NOTIFICATIONS;
    }

    return state.notifications;
}

function formatStatus(status = '') {
    const map = {
        pending: 'Laukiama',
        approved: 'Patvirtinta',
        rejected: 'Atmesta',
        update_pending: 'Atnaujinimas laukia',
    };
    return map[status] || status || '—';
}

function addOrganizerNotification(event, status, reason = '') {
    const statusText = formatStatus(status);
    const note = {
        id: Date.now(),
        type: 'organizer',
        message: status === 'rejected'
            ? `„${event.title}“ atmesta. Priežastis: ${reason || 'nenurodyta'}`
            : `„${event.title}“ ${statusText.toLowerCase()}.`,
        created_at: 'dabar',
    };
    state.notifications.unshift(note);
}

const adminCalendarState = {
    currentDate: new Date(),
    events: [],
};

function getStoredUser() {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
}

function ensureAuthContainer() {
    const header = document.querySelector('.header .header-content');
    if (!header) return null;

    header.querySelectorAll('button[onclick*="Login feature"], button[onclick*="Sign up feature"]').forEach(btn => {
        const parent = btn.closest('div');
        parent?.remove();
    });

    let container = document.getElementById('authActions');
    if (!container) {
        container = document.createElement('div');
        container.id = 'authActions';
        container.className = 'header-actions';
        header.appendChild(container);
    }
    return container;
}

function promptLogin(message = '') {
    if (message) {
        const createMessage = document.getElementById('createEventMessage');
        if (createMessage && !createMessage.textContent) {
            createMessage.textContent = message;
            createMessage.style.color = '#dc2626';
        }
    }

    if (typeof toggleLoginModal === 'function') {
        toggleLoginModal(true);
    } else {
        window.location.href = 'signup.html';
    }
}

function saveUser(user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function sanitizePayload(payload = {}) {
    const cleaned = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            cleaned[key] = value;
        }
    });
    return cleaned;
}

let toggleLoginModal = () => {};

function initLoginModal() {
    if (document.getElementById('loginModal')) return;

    const modalWrapper = document.createElement('div');
    modalWrapper.innerHTML = `
        <div class="login-modal" id="loginModal" aria-hidden="true">
            <div class="login-backdrop" data-login-close></div>
            <div class="login-dialog" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
                <button class="login-close" type="button" data-login-close aria-label="Uždaryti">×</button>
                <h3 id="loginTitle">Prisijungimas</h3>
                <p>Įveskite savo el. paštą ir slaptažodį, kad tęstumėte.</p>
                <form class="login-form" id="loginForm">
                    <div class="form-group">
                        <label for="loginEmail">El. paštas</label>
                        <input type="email" id="loginEmail" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Slaptažodis</label>
                        <input type="password" id="loginPassword" name="password" required>
                    </div>
                    <div class="form-group">
                        <label for="loginRole">Rolė</label>
                        <select id="loginRole" name="role">
                            <option value="user">Dalyvis</option>
                            <option value="organizer">Organizatorius</option>
                            <option value="admin">Administratorius</option>
                        </select>
                    </div>
                    <div class="login-actions">
                        <button type="button" class="btn-secondary" data-login-close>Atšaukti</button>
                        <button type="submit" class="btn btn-primary">Prisijungti</button>
                    </div>
                    <div class="login-message" id="loginMessage"></div>
                </form>
            </div>
        </div>
    `.trim();

    const modal = modalWrapper.firstElementChild;
    document.body.appendChild(modal);

    const form = modal.querySelector('#loginForm');
    const message = modal.querySelector('#loginMessage');

    function toggleLogin(open) {
        modal.classList.toggle('open', open);
        modal.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open) {
            message.textContent = '';
            modal.querySelector('#loginEmail')?.focus();
        }
    }

    toggleLoginModal = toggleLogin;

    modal.querySelectorAll('[data-login-close]').forEach(btn => {
        btn.addEventListener('click', () => toggleLogin(false));
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const submitBtn = form.querySelector('button[type="submit"]');

        message.textContent = '';
        message.style.color = '#374151';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Jungiama...';
            }

            const data = await fetchJSON(`${API_BASE}?resource=auth`, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            saveUser(data.user);
            message.textContent = `Prisijungta kaip ${data.user.name}`;
            message.style.color = '#15803d';
            form.reset();
            renderAuthActions();
            setTimeout(() => toggleLogin(false), 800);
        } catch (err) {
            message.textContent = err.message || 'Nepavyko prisijungti.';
            message.style.color = '#dc2626';
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Prisijungti';
            }
        }
    });
}

function bindLoginTriggers() {
    document.querySelectorAll('.js-login-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            toggleLoginModal(true);
        });
    });
}

function renderAuthActions() {
    const container = ensureAuthContainer();
    if (!container) return;

    const user = getStoredUser();
    syncNavRoleLinks(user);

    if (!user) {
        container.innerHTML = `
            <a class="btn btn-outline js-login-trigger" href="#login">Prisijungti</a>
            <a class="btn btn-primary" href="signup.html">Registruotis</a>
        `;
        bindLoginTriggers();
        return;
    }

    const roleLabel = user.role === 'organizer'
        ? 'Organizatorius'
        : user.role === 'admin'
            ? 'Administratorius'
            : 'Dalyvis';

    const name = user.name || 'Vartotojas';
    const initial = name.charAt(0).toUpperCase();

    const organizerLink = user.role === 'organizer' || user.role === 'admin'
        ? '<a class="btn btn-outline" href="organizer-events.html">Organizatoriaus zona</a>'
        : '';

    const adminLink = user.role === 'admin'
        ? '<a class="btn btn-outline" href="admin.html">Admin panelis</a>'
        : '';

    container.innerHTML = `
        <div class="user-chip" aria-label="Prisijungęs naudotojas">
            <span class="user-initial">${initial}</span>
            <div>
                <div class="user-name">${name}</div>
                <div class="user-role">${roleLabel}</div>
            </div>
        </div>
        <a class="btn btn-outline" href="user-panel.html">Mano renginiai</a>
        <a class="btn btn-outline" href="edit-profile.html">Redaguoti profilį</a>
        ${organizerLink}
        ${adminLink}
        <button class="btn btn-primary" id="logoutBtn" type="button">Atsijungti</button>
    `;

    const logoutBtn = container.querySelector('#logoutBtn');
    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem(USER_STORAGE_KEY);
        renderAuthActions();
        if (window.location.pathname.includes('user-panel') || window.location.pathname.includes('organizer')) {
            window.location.href = 'index.html';
        }
    });
}

function syncNavRoleLinks(user) {
    document.querySelectorAll('.nav').forEach(nav => {
        let adminLink = nav.querySelector('[data-nav-admin]');

        if (user?.role === 'admin') {
            if (!adminLink) {
                adminLink = document.createElement('a');
                adminLink.href = 'admin.html';
                adminLink.textContent = 'Admin panelis';
                adminLink.setAttribute('data-nav-admin', 'true');
                nav.appendChild(adminLink);
            } else {
                adminLink.style.removeProperty('display');
            }
        } else if (adminLink) {
            adminLink.remove();
        }
    });
}

function renderEvents(events = []) {
    const container = document.getElementById('eventsGrid');
    if (!container) return;

    if (!events.length) {
        container.innerHTML = '<div class="loading">Šiuo metu renginių nėra.</div>';
        return;
    }

    container.innerHTML = events.map(event => {
        const price = event.price && Number(event.price) > 0 ? `${Number(event.price).toFixed(2)} €` : 'Nemokama';
        const statusClass = event.status ? `status-${event.status}` : 'status-approved';
        return `
            <article class="event-card" data-id="${event.id}">
                <div class="event-card-wrapper">
                    <div class="event-price">${price}</div>
                    <img class="event-image" src="${event.cover_image || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80'}" alt="${event.title}">
                </div>
                <div class="event-content">
                    <div class="event-card-footer">
                        <span class="tag">${event.category || 'Kita'}</span>
                        <span class="status-badge ${statusClass}">${formatStatus(event.status || 'approved')}</span>
                    </div>
                    <h3 class="event-title">${event.title}</h3>
                    <div class="event-detail">📍 ${event.location}</div>
                    <div class="event-detail">📅 ${new Date(event.event_date).toLocaleString('lt-LT')}</div>
                    <div class="event-card-footer">
                        <button class="btn-ghost" data-favorite="${event.id}">❤ Įsiminti</button>
                        <a class="btn btn-outline" href="event-details.html?id=${event.id}">Daugiau</a>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    container.querySelectorAll('[data-favorite]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(btn.dataset.favorite, 'favorite');
        });
    });

    container.querySelectorAll('.event-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('[data-favorite]') || e.target.tagName === 'A') return;
            window.location.href = `event-details.html?id=${card.dataset.id}`;
        });
    });
}

async function loadEvents(filters = {}) {
    const container = document.getElementById('eventsGrid');
    if (container) {
        container.innerHTML = '<div class="loading">Kraunama...</div>';
    }

    try {
        const events = await ensureEventsLoaded(filters);
        renderEvents(events);
        if (events.length) {
            updateMap(events);
        }
    } catch (err) {
        console.error(err);
        const fallback = getKnownEvents(filters);
        renderEvents(fallback);
        updateMap(fallback);
        if (container) {
            container.insertAdjacentHTML('afterbegin', `<div class="loading">${err.message || 'Rodome išsaugotus renginius.'}</div>`);
        }
    }
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const locationInput = document.getElementById('locationInput');
    const searchButton = document.getElementById('searchButton');
    const resetBtn = document.getElementById('resetFilters');

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            loadEvents({
                search: searchInput?.value,
                location: locationInput?.value,
            });
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (locationInput) locationInput.value = '';
            document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
            loadEvents();
        });
    }

    document.querySelectorAll('.category').forEach(category => {
        category.addEventListener('click', () => {
            document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
            category.classList.add('active');
            loadEvents({ category: category.dataset.category });
        });
    });
}

function initCreateEventForm() {
    const form = document.getElementById('createEventForm');
    if (!form) return;

    const message = document.getElementById('createEventMessage');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        const organizer = getStoredUser();

        if (!organizer) {
            message.textContent = 'Prisijunkite, kad galėtumėte kurti renginius.';
            message.style.color = '#dc2626';
            promptLogin('Prisijunkite, kad galėtumėte kurti renginius.');
            return;
        }

        if (!['organizer', 'admin'].includes(organizer.role)) {
            message.textContent = 'Renginius gali kurti tik organizatoriai arba administratoriai.';
            message.style.color = '#dc2626';
            return;
        }

        payload.organizer_id = organizer.id;

        const requiredFields = ['title', 'description', 'category', 'event_date', 'location'];
        const missingField = requiredFields.find(field => !payload[field] || String(payload[field]).trim() === '');
        if (missingField) {
            message.textContent = 'Užpildykite visus privalomus laukus.';
            message.style.color = '#dc2626';
            return;
        }

        const dateValue = new Date(payload.event_date);
        if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime()) || dateValue < new Date()) {
            message.textContent = 'Data ateityje';
            message.style.color = '#dc2626';
            return;
        }

        const draftEvent = {
            ...payload,
            id: Date.now(),
            organizer_name: organizer?.name || 'Organizatorius',
            status: 'pending',
        };

        try {
            await fetchJSON(`${API_BASE}?resource=events`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            upsertLocalEvent(draftEvent);
            message.textContent = 'Paraiška pateikta! Būsena: Laukiama.';
            message.style.color = '#15803d';
        } catch (err) {
            upsertLocalEvent(draftEvent);
            message.textContent = err.message || 'Paraiška pateikta lokaliai. Būsena: Laukiama.';
            message.style.color = '#15803d';
        }

        form.reset();
        loadOrganizerEvents();
        loadEvents();
    });
}

async function loadOrganizerEvents() {
    const user = getStoredUser();
    const container = document.getElementById('organizerEvents');
    if (!container) return;
    if (!user || !user.id) {
        container.innerHTML = '<div class="loading">Prisijunkite, kad matytumėte savo renginius.</div>';
        return;
    }

    container.innerHTML = '<div class="loading">Kraunama...</div>';

    try {
        const list = (await ensureEventsLoaded({ organizer_id: user.id, include_all: 1 }))
            .filter(ev => ev.organizer_id === user.id);
        if (!list.length) {
            container.innerHTML = '<div class="loading">Kol kas nesukūrėte renginių.</div>';
            return;
        }
        container.innerHTML = list.map(item => `
            <div class="list-item">
                <div>
                    <h4>${item.title}</h4>
                    <small>${new Date(item.event_date).toLocaleString('lt-LT')} • ${item.location}</small>
                </div>
                <span class="status-badge status-${item.status}">${formatStatus(item.status)}</span>
            </div>
        `).join('');
    } catch (err) {
        const fallback = getKnownEvents().filter(ev => ev.organizer_id === user.id);
        if (fallback.length) {
            container.innerHTML = fallback.map(item => `
                <div class="list-item">
                    <div>
                        <h4>${item.title}</h4>
                        <small>${new Date(item.event_date).toLocaleString('lt-LT')} • ${item.location}</small>
                    </div>
                    <span class="status-badge status-${item.status}">${formatStatus(item.status)}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div class="loading">${err.message}</div>`;
        }
    }
}

async function toggleFavorite(eventId, tag = 'favorite') {
    const user = getStoredUser();
    if (!user) {
        promptLogin('Prisijunkite, kad pažymėtumėte renginius.');
        return;
    }

    try {
        await fetchJSON(`${API_BASE}?resource=favorites`, {
            method: 'POST',
            body: JSON.stringify({ event_id: eventId, user_id: user.id, tag }),
        });
        loadRecommendations();
    } catch (err) {
        console.error(err);
    }
}

function renderNotifications(containerId, filterType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = state.notifications.filter(n => !filterType || n.type === filterType);
    if (!list.length) {
        container.innerHTML = '<div class="loading">Naujienų nėra.</div>';
        return;
    }
    container.innerHTML = list.map(item => `
        <div class="notice">
            <div>
                <p class="notice-title">${item.message}</p>
                <small class="muted">${item.created_at}</small>
            </div>
            <span class="badge pill">${item.type}</span>
        </div>
    `).join('');
}

async function loadRecommendations() {
    const user = getStoredUser();
    const container = document.getElementById('recommendations');
    if (!container) return;

    container.innerHTML = '<div class="loading">Kraunama...</div>';

    try {
        const data = await fetchJSON(`${API_BASE}?${buildQuery({ resource: 'recommendations', user_id: user?.id })}`);
        const list = data.events || [];
        if (!list.length) {
            container.innerHTML = '<div class="loading">Rekomendacijų kol kas nėra.</div>';
            return;
        }
        container.innerHTML = list.map(item => `
            <div class="list-item">
                <div>
                    <h4>${item.title}</h4>
                    <small>${item.location} • ${new Date(item.event_date).toLocaleDateString('lt-LT')}</small>
                </div>
                <button class="btn-ghost" onclick="window.location='event-details.html?id=${item.id}'">Atidaryti</button>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        const known = await ensureEventsLoaded().catch(() => getKnownEvents());
        const list = known.slice(0, 3);
        container.innerHTML = list.map(item => `
            <div class="list-item">
                <div>
                    <h4>${item.title}</h4>
                    <small>${item.location} • ${new Date(item.event_date).toLocaleDateString('lt-LT')}</small>
                </div>
                <button class="btn-ghost" onclick="window.location='event-details.html?id=${item.id}'">Atidaryti</button>
            </div>
        `).join('');
    }
}

function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || state.map) return;
    if (typeof L === 'undefined') {
        console.warn('Leaflet biblioteka neįkelta – žemėlapis nebus rodomas.');
        return;
    }
    state.map = L.map('map').setView([54.6872, 25.2797], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
    }).addTo(state.map);
}

function updateMap(events = []) {
    if (!document.getElementById('map')) return;
    if (typeof L === 'undefined') return;
    initMap();
    state.markers.forEach(marker => marker.remove());
    state.markers = [];

    const points = events.filter(e => e.lat && e.lng);
    points.forEach(event => {
        const marker = L.marker([event.lat, event.lng]).addTo(state.map);
        marker.bindPopup(`<strong>${event.title}</strong><br>${event.location}`);
        state.markers.push(marker);
    });

    if (points.length) {
        const group = L.featureGroup(state.markers);
        state.map.fitBounds(group.getBounds().pad(0.2));
    }
}

async function loadEventDetails() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) return;

    try {
        const data = await fetchJSON(`${API_BASE}?${buildQuery({ resource: 'events', id: eventId, include_all: 1 })}`);
        const event = data.event || data.events?.[0];
        if (!event) throw new Error('Renginys nerastas');

        document.title = `${event.title} - CityEvents`;
        document.getElementById('crumbTitle').textContent = event.title;
        document.getElementById('eventTitle').textContent = event.title;
        document.getElementById('eventDescription').textContent = event.description || '';
        document.getElementById('eventCategory').textContent = event.category;
        document.getElementById('eventHero').src = event.cover_image || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=450&fit=crop';
        document.getElementById('eventHero').alt = event.title || 'Renginys';
        document.getElementById('eventDate').textContent = new Date(event.event_date).toLocaleDateString('lt-LT');
        document.getElementById('eventTime').textContent = new Date(event.event_date).toLocaleTimeString('lt-LT');
        document.getElementById('eventLocation').textContent = event.location;
        document.getElementById('eventPrice').textContent = event.price && Number(event.price) > 0 ? `${Number(event.price).toFixed(2)} €` : 'Nemokama';
        document.getElementById('eventOrganizer').textContent = event.organizer_name || 'Organizatorius';
        document.getElementById('eventStatus').textContent = formatStatus(event.status);
        document.getElementById('organizerAvatar').textContent = (event.organizer_name || 'CE').slice(0, 2).toUpperCase();

        const features = document.getElementById('eventFeatures');
        features.innerHTML = '';
        ['Nauja patirtis', 'Įdomūs pranešėjai', 'Daugiau veiklų mieste'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            features.appendChild(li);
        });

        document.getElementById('btnAttend').onclick = () => toggleFavorite(event.id, 'going');
        document.getElementById('btnFavorite').onclick = () => toggleFavorite(event.id, 'favorite');
    } catch (err) {
        const fallback = getKnownEvents().find(ev => String(ev.id) === String(eventId));
        if (fallback) {
            document.title = `${fallback.title} - CityEvents`;
            document.getElementById('crumbTitle').textContent = fallback.title;
            document.getElementById('eventTitle').textContent = fallback.title;
            document.getElementById('eventDescription').textContent = fallback.description || '';
            document.getElementById('eventCategory').textContent = fallback.category;
            document.getElementById('eventHero').src = fallback.cover_image;
            document.getElementById('eventHero').alt = fallback.title || 'Renginys';
            document.getElementById('eventDate').textContent = new Date(fallback.event_date).toLocaleDateString('lt-LT');
            document.getElementById('eventTime').textContent = new Date(fallback.event_date).toLocaleTimeString('lt-LT');
            document.getElementById('eventLocation').textContent = fallback.location;
            document.getElementById('eventPrice').textContent = fallback.price && Number(fallback.price) > 0 ? `${Number(fallback.price).toFixed(2)} €` : 'Nemokama';
            document.getElementById('eventOrganizer').textContent = fallback.organizer_name || 'Organizatorius';
            document.getElementById('eventStatus').textContent = formatStatus(fallback.status);
            document.getElementById('organizerAvatar').textContent = (fallback.organizer_name || 'CE').slice(0, 2).toUpperCase();
        } else {
            const container = document.getElementById('eventContainer');
            if (container) container.innerHTML = `<div class="loading">${err.message}</div>`;
        }
    }
}

async function handleSignup() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    const success = document.getElementById('signupSuccess');
    const error = document.getElementById('signupError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        success.style.display = 'none';
        error.style.display = 'none';

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        try {
            const data = await fetchJSON(`${API_BASE}?resource=users`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            saveUser(data.user);
            success.style.display = 'block';
            success.textContent = 'Paskyra sukurta! Jūsų ID: ' + data.user.id;
            form.reset();
        } catch (err) {
            error.style.display = 'block';
            error.textContent = err.message || 'Nepavyko užsiregistruoti.';
        }
    });
}

async function fetchProfile() {
    const user = getStoredUser();
    if (!user) {
        throw new Error('Prisijunkite, kad redaguotumėte profilį');
    }
    const data = await fetchJSON(`${API_BASE}?${buildQuery({ resource: 'users', id: user.id })}`);
    return data.user;
}

function fillForm(form, data = {}) {
    Object.entries(data).forEach(([key, value]) => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field) field.value = value ?? '';
    });
}

function attachProfileSubmit(form, messageEl, extraPayload = {}, options = {}) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageEl.textContent = '';
        const user = getStoredUser();
        if (!user) {
            messageEl.textContent = 'Prisijunkite, kad išsaugotumėte profilį.';
            messageEl.style.color = '#dc2626';
            return;
        }

        const formData = new FormData(form);
        const payload = sanitizePayload(Object.fromEntries(formData.entries()));
        payload.id = user.id;
        Object.assign(payload, extraPayload);

        try {
            await fetchJSON(`${API_BASE}?resource=users`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            saveUser({ ...user, ...payload });
            messageEl.textContent = 'Profilis išsaugotas!';
            messageEl.style.color = '#15803d';
            if (form.querySelector('[name="password"]')) {
                form.querySelector('[name="password"]').value = '';
            }
            options.onSuccess?.({ ...user, ...payload });
        } catch (err) {
            messageEl.textContent = err.message || 'Nepavyko išsaugoti.';
            messageEl.style.color = '#dc2626';
        }
    });
}

function getUserTypeLabel(role = 'user') {
    const map = {
        admin: '👑 Administratorius',
        organizer: '🎪 Organizatorius',
        user: '👤 Lankytojas',
    };
    return map[role] || map.user;
}

function updateProfileSummary(profile = {}) {
    const name = profile.name || getStoredUser()?.name || 'CityEvents narys';
    const role = profile.role || getStoredUser()?.role || 'user';
    const initials = name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'CE';

    const avatar = document.getElementById('avatarDisplay');
    if (avatar) avatar.textContent = initials;

    const displayName = document.getElementById('displayName');
    if (displayName) displayName.textContent = name;

    const userType = document.getElementById('userType');
    if (userType) userType.textContent = getUserTypeLabel(role);
}

function showProfileToast(toastEl) {
    if (!toastEl) return;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

async function loadUserProfilePage() {
    const form = document.getElementById('userProfileForm');
    const message = document.getElementById('userProfileMessage');
    const toast = document.getElementById('successToast');
    if (!form) return;

    try {
        const profile = await fetchProfile();
        fillForm(form, profile);
        updateProfileSummary(profile);
    } catch (err) {
        message.textContent = err.message;
        message.style.color = '#dc2626';
        return;
    }

    attachProfileSubmit(form, message, {}, {
        onSuccess: (updatedProfile) => {
            updateProfileSummary(updatedProfile);
            showProfileToast(toast);
        },
    });
}

async function loadOrganizerProfilePage() {
    const form = document.getElementById('organizerProfileForm');
    const message = document.getElementById('organizerProfileMessage');
    if (!form) return;

    try {
        const profile = await fetchProfile();
        fillForm(form, profile);
    } catch (err) {
        message.textContent = err.message;
        message.style.color = '#dc2626';
        return;
    }

    attachProfileSubmit(form, message, { role: 'organizer' });
}

function sortEventsByDate(items = [], direction = 'asc') {
    const sorted = [...items].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    return direction === 'desc' ? sorted.reverse() : sorted;
}

function renderOrganizerSummary(list = []) {
    const pendingCount = list.filter(item => item.status === 'pending').length;
    const approvedCount = list.filter(item => item.status === 'approved').length;
    const rejectedCount = list.filter(item => item.status === 'rejected' || item.status === 'update_pending').length;
    const upcomingCount = list.filter(item => new Date(item.event_date) >= new Date()).length;
    const notificationCount = (state.notifications || []).filter(n => n.type === 'organizer').length;

    const map = {
        summaryPendingCount: pendingCount,
        summaryApprovedCount: approvedCount,
        summaryRejectedCount: rejectedCount,
        summaryUpcomingCount: upcomingCount,
        summaryNotificationsCount: notificationCount,
    };

    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function renderOrganizerTimeline(list = []) {
    const container = document.getElementById('organizerTimeline');
    if (!container) return;

    if (!list.length) {
        container.innerHTML = '<div class="loading">Nėra įrašų.</div>';
        return;
    }

    const ordered = sortEventsByDate(list, 'asc');
    container.innerHTML = ordered.map(event => {
        const statusKey = event.status || 'pending';
        return `
            <div class="timeline-item">
                <span class="status-dot ${statusKey}" aria-label="${formatStatus(statusKey)}"></span>
                <div>
                    <strong>${event.title}</strong>
                    <small>${new Date(event.event_date).toLocaleString('lt-LT')} • ${formatStatus(statusKey)}</small>
                </div>
                <div class="timeline-actions">
                    <span class="status-badge status-${statusKey}">${formatStatus(statusKey)}</span>
                    <a class="btn-ghost" href="event-details.html?id=${event.id}">Peržiūrėti</a>
                </div>
            </div>
        `;
    }).join('');
}

function renderOrganizerBoard(list = [], filter = 'all', sortDirection = 'asc') {
    const upcomingContainer = document.getElementById('upcomingEvents');
    const pastContainer = document.getElementById('pastEvents');
    const counter = document.getElementById('organizerEventsCount');
    if (!upcomingContainer || !pastContainer) return;

    const now = new Date();
    const filtered = list.filter(item => filter === 'all' || item.status === filter);
    const upcoming = sortEventsByDate(filtered.filter(item => new Date(item.event_date) >= now), sortDirection);
    const past = sortEventsByDate(filtered.filter(item => new Date(item.event_date) < now), sortDirection);

    counter.textContent = `Iš viso: ${filtered.length} renginiai`;

    const template = (target, items) => {
        if (!items.length) {
            target.innerHTML = '<div class="loading">Nėra įrašų.</div>';
            return;
        }
            target.innerHTML = items.map(event => `
            <div class="list-item">
                <div>
                    <h4>${event.title}</h4>
                    <small>${new Date(event.event_date).toLocaleString('lt-LT')} • ${event.location}</small>
                </div>
                <span class="status-badge status-${event.status}">${formatStatus(event.status)}</span>
            </div>
        `).join('');
    };

    template(upcomingContainer, upcoming);
    template(pastContainer, past);
}

function renderEventCards(containerId, items = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<div class="loading">Nėra įrašų.</div>';
        return;
    }
    container.innerHTML = items.map(event => `
        <article class="mini-card">
            <div>
                <p class="eyebrow">${event.category} • ${new Date(event.event_date).toLocaleDateString('lt-LT')}</p>
                <h4>${event.title}</h4>
                <p class="muted">${event.location}</p>
            </div>
            <span class="status-badge status-${event.status}">${formatStatus(event.status)}</span>
        </article>
    `).join('');
}

async function loadOrganizerEventsBoard() {
    const user = getStoredUser();
    const chips = document.querySelectorAll('.chip');
    const sortSelect = document.getElementById('organizerSort');
    if (!user || !user.id) {
        const container = document.getElementById('upcomingEvents');
        if (container) {
            container.innerHTML = '<div class="loading">Prisijunkite, kad matytumėte savo renginius.</div>';
        }
        return;
    }

    const query = buildQuery({ resource: 'events', organizer_id: user.id, include_all: 1 });
    let events = [];
    try {
        events = (await ensureEventsLoaded({ organizer_id: user.id, include_all: 1 }))
            .filter(ev => ev.organizer_id === user.id);
    } catch (err) {
        console.error(err);
        events = getKnownEvents().filter(e => e.organizer_id === user.id);
    }

    state.organizerEventsCache = events;
    renderOrganizerSummary(events);
    renderOrganizerTimeline(events);

    let activeFilter = 'all';
    let activeSort = 'asc';
    const render = () => renderOrganizerBoard(events, activeFilter, activeSort);

    const pendingOnly = () => {
        const pending = sortEventsByDate(events.filter(ev => ev.status === 'pending'), activeSort);
        renderEventCards('pendingList', pending);
        ensureNotificationsLoaded().then(() => renderNotifications('organizerNotifications', 'organizer'));
    };

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            activeSort = sortSelect.value;
            render();
            pendingOnly();
            hydrateOrganizerEditForm();
        });
    }

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
            render();
            pendingOnly();
            hydrateOrganizerEditForm();
        });
        if (chip.dataset.filter === 'all') chip.classList.add('active');
    });

    render();
    pendingOnly();
    hydrateOrganizerEditForm();
}

async function loadUserDashboard() {
    const user = getStoredUser() || { name: 'Svečias', role: 'user' };
    const header = document.getElementById('userGreeting');
    if (header) {
        header.textContent = `${user.name}, jūsų renginiai ir mėgstamiausi`;
    }

    const events = await ensureEventsLoaded().catch(() => getKnownEvents());
    const now = new Date();
    const liked = events.filter(ev => state.favorites.includes(ev.id));
    const past = events.filter(ev => new Date(ev.event_date) < now);
    renderEventCards('likedEvents', liked);
    renderEventCards('pastUserEvents', past);
    await ensureNotificationsLoaded();
    renderNotifications('userNotifications', 'user');
}

function hydrateOrganizerEditForm() {
    const select = document.getElementById('editEventSelect');
    if (!select) return;

    const approved = state.organizerEventsCache.filter(ev => ev.status === 'approved');
    select.innerHTML = '<option value="">Pasirinkite renginį</option>';
    approved.forEach(ev => {
        const option = document.createElement('option');
        option.value = ev.id;
        option.textContent = `${ev.title} (${new Date(ev.event_date).toLocaleDateString('lt-LT')})`;
        select.appendChild(option);
    });
}

function initOrganizerEditForm() {
    const form = document.getElementById('editEventForm');
    const message = document.getElementById('editEventMessage');
    if (!form || !message) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        message.textContent = '';

        const user = getStoredUser();
        if (!user) {
            message.textContent = 'Prisijunkite, kad redaguotumėte renginį.';
            message.style.color = '#dc2626';
            return;
        }

        const formData = new FormData(form);
        const selectedId = formData.get('event_id');
        const description = formData.get('description');
        const dateValue = formData.get('event_date');
        const coverImage = formData.get('cover_image');

        if (!selectedId) {
            message.textContent = 'Pasirinkite renginį redagavimui.';
            message.style.color = '#dc2626';
            return;
        }

        const target = state.organizerEventsCache.find(ev => String(ev.id) === String(selectedId));
        if (!target) {
            message.textContent = 'Renginys nerastas.';
            message.style.color = '#dc2626';
            return;
        }

        if (dateValue) {
            const parsedDate = new Date(dateValue);
            if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
                message.textContent = 'Data ateityje';
                message.style.color = '#dc2626';
                return;
            }
        }

        const updated = {
            ...target,
            description: description || target.description,
            cover_image: coverImage || target.cover_image,
            event_date: dateValue || target.event_date,
            status: target.status === 'approved' ? 'update_pending' : target.status,
        };

        upsertLocalEvent(updated);
        const eventIndex = state.events.findIndex(ev => String(ev.id) === String(updated.id));
        if (eventIndex >= 0) {
            state.events[eventIndex] = { ...state.events[eventIndex], ...updated };
        }
        state.organizerEventsCache = state.organizerEventsCache.map(ev =>
            String(ev.id) === String(updated.id) ? updated : ev
        );

        message.textContent = updated.status === 'update_pending'
            ? 'Atnaujinimas laukia peržiūros.'
            : 'Pakeitimai išsaugoti.';
        message.style.color = '#15803d';
        form.reset();
        loadOrganizerEventsBoard();
        loadOrganizerEvents();
    });
}

function renderAdminCalendar(events = []) {
    const calendar = document.getElementById('adminCalendar');
    if (!calendar) return;

    if (!events.length) {
        calendar.innerHTML = '<div class="loading">Kalendorius tuščias</div>';
        return;
    }

    const sorted = events
        .map(ev => ({ ...ev, parsedDate: new Date(ev.event_date) }))
        .sort((a, b) => a.parsedDate - b.parsedDate);

    calendar.innerHTML = sorted.slice(0, 8).map(ev => {
        const timeClass = ev.parsedDate < new Date() ? 'past' : 'upcoming';
        return `
        <div class="calendar-row ${ev.status} ${timeClass}">
            <div>
                <strong>${ev.parsedDate.toLocaleDateString('lt-LT')}</strong>
                <p>${ev.title}</p>
            </div>
            <span class="badge ${ev.status}">${ev.status}</span>
        </div>
    `;
    }).join('');
}

function renderAdminCalendarGrid(events = []) {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('calendarMonth');
    if (!grid || !label) return;

    adminCalendarState.events = events;
    const viewDate = adminCalendarState.currentDate;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;

    label.textContent = viewDate.toLocaleDateString('lt-LT', { month: 'long', year: 'numeric' });

    const weekdays = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'];
    const cells = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`);

    for (let i = 0; i < offset; i += 1) {
        cells.push('<div class="calendar-cell muted"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dayEvents = events.filter((ev) => {
            const d = new Date(ev.event_date);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });

        const eventMarkup = dayEvents.map(ev => `
            <div class="calendar-event ${ev.status}">
                <strong>${ev.title}</strong>
                <div class="muted">${new Date(ev.event_date).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `).join('');

        cells.push(`
            <div class="calendar-cell">
                <div class="day-number">${day}</div>
                ${eventMarkup || '<span class="muted">–</span>'}
            </div>
        `);
    }

    grid.innerHTML = cells.join('');
}

function changeMonth(delta = 0) {
    adminCalendarState.currentDate = new Date(
        adminCalendarState.currentDate.getFullYear(),
        adminCalendarState.currentDate.getMonth() + delta,
        1,
    );
    renderAdminCalendarGrid(adminCalendarState.events);
}

window.changeMonth = changeMonth;

function updateAdminStatCards(events = []) {
    const totalEventsEl = document.getElementById('totalEvents');
    const pendingEventsEl = document.getElementById('pendingEvents');
    const approvedEventsEl = document.getElementById('approvedEvents');
    const totalUsersEl = document.getElementById('totalUsers');

    const pendingCount = events.filter(e => e.status === 'pending').length;
    const approvedCount = events.filter(e => e.status === 'approved').length;
    const uniqueUsers = new Set(events.map(e => e.organizer_id).filter(Boolean));

    if (totalEventsEl) totalEventsEl.textContent = events.length;
    if (pendingEventsEl) pendingEventsEl.textContent = pendingCount;
    if (approvedEventsEl) approvedEventsEl.textContent = approvedCount;
    if (totalUsersEl) totalUsersEl.textContent = uniqueUsers.size || totalUsersEl.textContent;
}

function renderPendingEventsBoard(pending = []) {
    const container = document.getElementById('pendingEventsList');
    if (!container) return;

    if (!pending.length) {
        container.innerHTML = '<div class="loading">Nėra laukiančių renginių.</div>';
        return;
    }

    container.innerHTML = pending.map(event => `
        <div class="pending-card">
            <div>
                <strong>${event.title}</strong>
                <p>${event.location} • ${new Date(event.event_date).toLocaleDateString('lt-LT')}</p>
            </div>
            <span class="badge pending">${formatStatus(event.status)}</span>
            <p>${event.description || 'Paraiška laukia peržiūros.'}</p>
        </div>
    `).join('');
}

function renderTrendBars(events = []) {
    const container = document.getElementById('adminTrendBars');
    if (!container) return;

    const grouped = events.reduce((acc, ev) => {
        const key = ev.category || 'Kita';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(([, count]) => count), 1);

    if (!entries.length) {
        container.innerHTML = '<div class="loading">Nėra pakankamai duomenų.</div>';
        return;
    }

    container.innerHTML = entries.map(([label, count]) => `
        <div class="trend-row">
            <span class="trend-label">${label}</span>
            <div class="trend-bar">
                <span style="width:${(count / max) * 100}%"></span>
            </div>
            <span class="trend-count">${count}</span>
        </div>
    `).join('');
}

function loadAdminDashboardExtras(events = []) {
    const pending = events.filter(e => e.status === 'pending');
    const past = events.filter(e => new Date(e.event_date) < new Date());
    updateAdminStatCards(events);
    renderPendingEventsBoard(pending);
    renderEventCards('pendingList', pending);
    renderEventCards('pastAdminEvents', past);
    renderAdminCalendar(events);
    renderAdminCalendarGrid(events);
    renderTrendBars(events);
    renderNotifications('adminNotifications', 'admin');

    const insights = {
        upcoming: events.filter(e => new Date(e.event_date) >= new Date()).length,
        revenue: events.reduce((sum, ev) => sum + (Number(ev.price) || 0), 0),
        engagement: events.reduce((sum, ev) => sum + (ev.status === 'approved' ? 45 : 20), state.favorites.length * 5),
    };

    const upcomingEl = document.getElementById('insightUpcoming');
    const revenueEl = document.getElementById('insightRevenue');
    const engagementEl = document.getElementById('insightEngagement');

    if (upcomingEl) upcomingEl.querySelector('strong').textContent = `${insights.upcoming}`;
    if (revenueEl) revenueEl.querySelector('strong').textContent = `${insights.revenue.toFixed(2)} €`;
    if (engagementEl) engagementEl.querySelector('strong').textContent = `${insights.engagement} rezervacijų`;
}

async function loadAdminPage() {
    const tableBody = document.querySelector('#adminEventsTable tbody');
    if (!tableBody) return;

    const searchInput = document.getElementById('adminSearch');
    const adminProfileForm = document.getElementById('adminProfileForm');
    const adminProfileMessage = document.getElementById('adminProfileMessage');
    let cachedEvents = [];

    if (adminProfileForm) {
        const savedProfile = JSON.parse(localStorage.getItem('cityevents_admin_profile') || '{}');
        ['name', 'email', 'phone'].forEach((field) => {
            if (savedProfile[field] && adminProfileForm.elements[field]) {
                adminProfileForm.elements[field].value = savedProfile[field];
            }
        });

        adminProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(adminProfileForm).entries());
            localStorage.setItem('cityevents_admin_profile', JSON.stringify(payload));
            if (adminProfileMessage) {
                adminProfileMessage.textContent = 'Profilis atnaujintas ir pritaikytas sąsajoje.';
                adminProfileMessage.classList.add('success');
            }
        });
    }

    async function fetchAndRender() {
        let events = [];
        try {
            events = await ensureEventsLoaded({ include_all: 1, search: searchInput?.value });
        } catch (err) {
            console.error(err);
            events = getKnownEvents();
            const term = searchInput?.value?.toLowerCase();
            if (term) {
                events = events.filter(ev =>
                    ev.title?.toLowerCase().includes(term) || ev.location?.toLowerCase().includes(term)
                );
            }
        }

        cachedEvents = mergeWithLocalEvents(events);

        if (!cachedEvents.length) {
            tableBody.innerHTML = '<tr><td colspan="6" class="empty">Renginių nėra</td></tr>';
            return;
        }

        document.getElementById('statPending').textContent = cachedEvents.filter(e => e.status === 'pending').length;
        document.getElementById('statApproved').textContent = cachedEvents.filter(e => e.status === 'approved').length;
        document.getElementById('statRejected').textContent = cachedEvents.filter(e => e.status === 'rejected').length;
        await ensureNotificationsLoaded();
        loadAdminDashboardExtras(cachedEvents);

        tableBody.innerHTML = cachedEvents.map(event => `
            <tr data-id="${event.id}">
                <td>${event.title}</td>
                <td>${event.organizer_name || '—'}</td>
                <td>${new Date(event.event_date).toLocaleString('lt-LT')}</td>
                <td>${event.location}</td>
                <td><span class="badge ${event.status}">${formatStatus(event.status)}</span></td>
                <td>
                    <button class="btn approve" data-status="approved">Patvirtinti</button>
                    <button class="btn reject" data-status="rejected">Atmesti</button>
                    <button class="btn block" data-block="${event.organizer_id}">Blokuoti</button>
                </td>
            </tr>
        `).join('');
    }

    tableBody.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const eventId = row.dataset.id;
        const currentEvent = cachedEvents.find(ev => String(ev.id) === String(eventId));

        if (e.target.dataset.status) {
            let reason = '';
            if (e.target.dataset.status === 'rejected') {
                reason = prompt('Nurodykite atmetimo priežastį', 'Nepakankama informacija') || 'nenurodyta';
            }

            try {
                await fetchJSON(`${API_BASE}?resource=admin`, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'update_status', event_id: eventId, status: e.target.dataset.status, reason }),
                });
            } catch (err) {
                console.warn('Naudojama lokali būsena', err);
            }

            if (currentEvent) {
                const updated = { ...currentEvent, status: e.target.dataset.status, rejection_reason: reason };
                upsertLocalEvent(updated);
                const eventIndex = state.events.findIndex(ev => String(ev.id) === String(updated.id));
                if (eventIndex >= 0) state.events[eventIndex] = { ...state.events[eventIndex], ...updated };
                addOrganizerNotification(updated, updated.status, reason);
            }

            fetchAndRender();
        }

        if (e.target.dataset.block) {
            await fetchJSON(`${API_BASE}?resource=admin`, {
                method: 'POST',
                body: JSON.stringify({ action: 'block_user', user_id: e.target.dataset.block }),
            });
            fetchAndRender();
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => fetchAndRender());
    }

    fetchAndRender().catch(err => {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty">${err.message}</td></tr>`;
    });
}

function initHomePage() {
    initSearch();
    initCreateEventForm();
    loadEvents();
    loadRecommendations();
    loadOrganizerEvents();
}

function init() {
    const page = document.body.dataset.page;

    ensureAuthContainer();

    initLoginModal();
    bindLoginTriggers();
    renderAuthActions();
    switch (page) {
        case 'home':
            initHomePage();
            break;
        case 'details':
            loadEventDetails();
            break;
        case 'signup':
            handleSignup();
            break;
        case 'admin':
            loadAdminPage();
            break;
        case 'user-profile':
            loadUserProfilePage();
            break;
        case 'user-panel':
            loadUserDashboard();
            break;
        case 'organizer-profile':
            loadOrganizerProfilePage();
            break;
        case 'organizer-events':
            loadOrganizerEventsBoard();
            initOrganizerEditForm();
            break;
    }
}

document.addEventListener('DOMContentLoaded', init);
