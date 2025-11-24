const API_BASE = 'api/index.php';
const USER_STORAGE_KEY = 'cityevents_user';

const state = {
    map: null,
    markers: [],
};

function getStoredUser() {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
}

function saveUser(user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Serverio klaida');
    }
    return response.json();
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

function buildQuery(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.append(key, value);
        }
    });
    return search.toString();
}

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

    modal.querySelectorAll('[data-login-close]').forEach(btn => {
        btn.addEventListener('click', () => toggleLogin(false));
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const email = formData.get('email');
        const role = formData.get('role') || 'user';
        const name = (email?.toString().split('@')[0] || 'Vartotojas');

        saveUser({
            id: Date.now(),
            email,
            name,
            role,
        });

        message.textContent = `Prisijungta kaip ${name}`;
        form.reset();
        setTimeout(() => toggleLogin(false), 800);
    });

    document.querySelectorAll('.js-login-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            toggleLogin(true);
        });
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
                        <span class="status-badge ${statusClass}">${event.status || 'approved'}</span>
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
    const query = buildQuery({ resource: 'events', ...filters });
    try {
        const data = await fetchJSON(`${API_BASE}?${query}`);
        renderEvents(data.events || []);
        if (data.events) {
            updateMap(data.events);
        }
    } catch (err) {
        const container = document.getElementById('eventsGrid');
        if (container) container.innerHTML = `<div class="loading">${err.message}</div>`;
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
        payload.organizer_id = getStoredUser()?.id;

        try {
            await fetchJSON(`${API_BASE}?resource=events`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            message.textContent = 'Paraiška pateikta! Administratorius informuos apie statusą.';
            message.style.color = '#15803d';
            form.reset();
            loadOrganizerEvents();
            loadEvents();
        } catch (err) {
            message.textContent = err.message || 'Nepavyko pateikti renginio.';
            message.style.color = '#dc2626';
        }
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

    try {
        const data = await fetchJSON(`${API_BASE}?${buildQuery({ resource: 'events', organizer_id: user.id, include_all: 1 })}`);
        const list = data.events || [];
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
                <span class="status-badge status-${item.status}">${item.status}</span>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div class="loading">${err.message}</div>`;
    }
}

async function toggleFavorite(eventId, tag = 'favorite') {
    const user = getStoredUser();
    if (!user) {
        alert('Prisijunkite, kad pažymėtumėte renginius.');
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

async function loadRecommendations() {
    const user = getStoredUser();
    const container = document.getElementById('recommendations');
    if (!container) return;

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
        container.innerHTML = `<div class="loading">${err.message}</div>`;
    }
}

function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || state.map) return;
    state.map = L.map('map').setView([54.6872, 25.2797], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
    }).addTo(state.map);
}

function updateMap(events = []) {
    if (!document.getElementById('map')) return;
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
        document.getElementById('eventTitle').textContent = event.title;
        document.getElementById('eventDescription').textContent = event.description || '';
        document.getElementById('eventCategory').textContent = event.category;
        document.getElementById('eventHero').src = event.cover_image || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=450&fit=crop';
        document.getElementById('eventDate').textContent = `Data: ${new Date(event.event_date).toLocaleDateString('lt-LT')}`;
        document.getElementById('eventTime').textContent = `Laikas: ${new Date(event.event_date).toLocaleTimeString('lt-LT')}`;
        document.getElementById('eventLocation').textContent = `Vieta: ${event.location}`;
        document.getElementById('eventPrice').textContent = event.price && Number(event.price) > 0 ? `${Number(event.price).toFixed(2)} €` : 'Nemokama';
        document.getElementById('eventOrganizer').textContent = event.organizer_name || 'Organizatorius';
        document.getElementById('eventStatus').textContent = event.status;

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
        const container = document.getElementById('eventContainer');
        if (container) container.innerHTML = `<div class="loading">${err.message}</div>`;
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

function attachProfileSubmit(form, messageEl, extraPayload = {}) {
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
        } catch (err) {
            messageEl.textContent = err.message || 'Nepavyko išsaugoti.';
            messageEl.style.color = '#dc2626';
        }
    });
}

async function loadUserProfilePage() {
    const form = document.getElementById('userProfileForm');
    const message = document.getElementById('userProfileMessage');
    if (!form) return;

    try {
        const profile = await fetchProfile();
        fillForm(form, profile);
    } catch (err) {
        message.textContent = err.message;
        message.style.color = '#dc2626';
        return;
    }

    attachProfileSubmit(form, message);
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

function renderOrganizerBoard(list = [], filter = 'all') {
    const upcomingContainer = document.getElementById('upcomingEvents');
    const pastContainer = document.getElementById('pastEvents');
    const counter = document.getElementById('organizerEventsCount');
    if (!upcomingContainer || !pastContainer) return;

    const now = new Date();
    const filtered = list.filter(item => filter === 'all' || item.status === filter);
    const upcoming = filtered.filter(item => new Date(item.event_date) >= now);
    const past = filtered.filter(item => new Date(item.event_date) < now);

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
                <span class="status-badge status-${event.status}">${event.status}</span>
            </div>
        `).join('');
    };

    template(upcomingContainer, upcoming);
    template(pastContainer, past);
}

async function loadOrganizerEventsBoard() {
    const user = getStoredUser();
    const chips = document.querySelectorAll('.chip');
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
        const data = await fetchJSON(`${API_BASE}?${query}`);
        events = data.events || [];
    } catch (err) {
        const container = document.getElementById('upcomingEvents');
        if (container) container.innerHTML = `<div class="loading">${err.message}</div>`;
        return;
    }

    let activeFilter = 'all';
    const render = () => renderOrganizerBoard(events, activeFilter);

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
            render();
        });
        if (chip.dataset.filter === 'all') chip.classList.add('active');
    });

    render();
}

async function loadAdminPage() {
    const tableBody = document.querySelector('#adminEventsTable tbody');
    if (!tableBody) return;

    const searchInput = document.getElementById('adminSearch');

    async function fetchAndRender() {
        const query = buildQuery({ resource: 'events', include_all: 1, search: searchInput?.value });
        const data = await fetchJSON(`${API_BASE}?${query}`);
        const events = data.events || [];

        if (!events.length) {
            tableBody.innerHTML = '<tr><td colspan="6" class="empty">Renginių nėra</td></tr>';
            return;
        }

        document.getElementById('statPending').textContent = events.filter(e => e.status === 'pending').length;
        document.getElementById('statApproved').textContent = events.filter(e => e.status === 'approved').length;
        document.getElementById('statRejected').textContent = events.filter(e => e.status === 'rejected').length;

        tableBody.innerHTML = events.map(event => `
            <tr data-id="${event.id}">
                <td>${event.title}</td>
                <td>${event.organizer_name || '—'}</td>
                <td>${new Date(event.event_date).toLocaleString('lt-LT')}</td>
                <td>${event.location}</td>
                <td><span class="badge ${event.status}">${event.status}</span></td>
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

        if (e.target.dataset.status) {
            await fetchJSON(`${API_BASE}?resource=admin`, {
                method: 'POST',
                body: JSON.stringify({ action: 'update_status', event_id: eventId, status: e.target.dataset.status }),
            });
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
    initLoginModal();
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
        case 'organizer-profile':
            loadOrganizerProfilePage();
            break;
        case 'organizer-events':
            loadOrganizerEventsBoard();
            break;
    }
}

document.addEventListener('DOMContentLoaded', init);
