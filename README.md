CityEvents – galutinė versija
Ši versija sujungia PHP API ir „vanilla" HTML/CSS/JS sąsają, kuri išlaiko pirminę spalvų paletę. API veikia XAMPP (PHP/MySQL) aplinkoje, o SQL schema pateikiama api/schema.sql faile.

Kaip paleisti lokaliai (XAMPP)
Paleiskite Apache ir MySQL per XAMPP.
Importuokite SQL struktūrą ir pavyzdinius duomenis:
SOURCE /path/iki/projekto/api/schema.sql;
Jei reikia, pakoreguokite api/config.php (DB host, vartotojas, slaptažodis, DB pavadinimas).
Įkelkite projekto katalogą į htdocs (arba sukurkite „VirtualHost“) ir atidarykite http://localhost/Miesto-Renginiai/.
Pagrindiniai API endpoint'ai
GET api/index.php?resource=events – gauti patvirtintus renginius. Filtrai: category, location, search, organizer_id, include_all, id.
POST api/index.php?resource=events – sukurti naują renginį (JSON laukai: title, description, category, location, event_date, price?, lat?, lng?, organizer_id?).
PUT api/index.php?resource=events&id={id} – atnaujinti renginį.
DELETE api/index.php?resource=events&id={id} – pašalinti renginį.
POST api/index.php?resource=users – registruoti vartotoją (laukas role gali būti user arba organizer).
POST api/index.php?resource=favorites – pažymėti renginį kaip mėgstamą ar „going“ (laukas tag).
GET api/index.php?resource=recommendations&user_id={id} – rekomendacijos pagal pamėgtas kategorijas.
POST api/index.php?resource=admin – administratoriaus veiksmai (action=update_status su event_id ir status, arba action=block_user).
Funkcijos pagal reikalavimus
US-1/US-4/US-9: renginių registracija ir peržiūra per formą „Sukurti renginį“; organizatoriaus sąrašas rodo būsenas.
US-2/US-10/US-11: administratoriaus lentelė (admin.html) leidžia patvirtinti, atmesti ar blokuoti.
US-3: statuso pakeitimas generuoja įrašą notifications lentelėje.
US-5/US-8: „Įsiminti“ ir „Dalyvausiu“ veiksmai kuria įrašus favorites; rekomendacijų skyrius naudoja šias kategorijas.
US-6: žemėlapio skiltis (Leaflet + OpenStreetMap) rodo renginių taškus pagal lat/lng.
US-7: event-details.html puslapis parodo pilną informaciją ir leidžia pažymėti renginį.
US-12: registracijos forma (signup.html) kuria vartotoją API pagalba ir išsaugo ID localStorage.
Pastaba: CSS paletė (oranžiniai ir rožiniai gradientai) išlaikyta iš pradinio prototipo.
Komandos nariai:
Edmundas Kaminskas
Amelija Petkutė
Erenestas Granauskas
