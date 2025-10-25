// Sample event data
const events = [
    {
        id: 1,
        title: "Vasaros muzikos festivalis 2025",
        date: "Šešt, Birž. 15",
        time: "14:00",
        location: "Centrinis parkas, Niujorkas",
        price: "€45",
        category: "music",
        image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80"
    },
    {
        id: 2,
        title: "Technologijų konferencija: DI ir ateitis",
        date: "Pir, Liep. 8",
        time: "9:00",
        location: "Konferencijų centras, San Franciskas",
        price: "€299",
        category: "business",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80"
    },
    {
        id: 3,
        title: "Meno galerijos atidarymo vakaras",
        date: "Pen, Birž. 21",
        time: "19:00",
        location: "Šiuolaikinio meno muziejus, Čikaga",
        price: "Nemokamai",
        category: "arts",
        image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&q=80"
    }
];

let currentFilter = null;

function renderEvents(eventsToRender) {
    const grid = document.getElementById('eventsGrid');

    if (eventsToRender.length === 0) {
        grid.innerHTML = '<div class="loading">Renginiai nerasti</div>';
        return;
    }

    grid.innerHTML = eventsToRender.map(event => `
    <div class="event-card" onclick="viewEvent(${event.id})">
      <div class="event-card-wrapper">
        <img src="${event.image}" alt="${event.title}" class="event-image">
        <span class="event-price">${event.price}</span>
      </div>
      <div class="event-content">
        <h3 class="event-title">${event.title}</h3>
        <div class="event-detail">
          <span>📅</span>
          <span>${event.date}</span>
        </div>
        <div class="event-detail">
          <span>🕐</span>
          <span>${event.time}</span>
        </div>
        <div class="event-detail">
          <span>📍</span>
          <span>${event.location}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function filterByCategory(category) {
    currentFilter = category;
    const filtered = events.filter(event => event.category === category);
    renderEvents(filtered);
}

function searchEvents() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const location = document.getElementById('locationInput').value.toLowerCase();

    const filtered = events.filter(event => {
        const matchesSearch =
            !searchTerm ||
            event.title.toLowerCase().includes(searchTerm) ||
            event.category.toLowerCase().includes(searchTerm);

        const matchesLocation =
            !location ||
            event.location.toLowerCase().includes(location);

        return matchesSearch && matchesLocation;
    });

    renderEvents(filtered);

    if (searchTerm || location) {
        document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
    }
}

function viewEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (event) {
        alert(`Renginys: ${event.title}\nData: ${event.date}\nLaikas: ${event.time}\nVieta: ${event.location}\nKaina: ${event.price}`);
    }
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchEvents();
});
document.getElementById('locationInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchEvents();
});

window.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => renderEvents(events), 500);
});
