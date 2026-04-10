# Château Overdruiven

Een webapplicatie voor het beheren van een privé wijnclub. Leden kunnen zich aanmelden voor proefsessies, bijhouden welke wijnen ze geproefd hebben, declaraties indienen en betalingen afhandelen — alles op één plek.

## Functionaliteiten

**Voor leden**
- Activiteiten bekijken en je aanmelden (proefsessies, wijnreizen, thema-avonden)
- Persoonlijke wijnbibliotheek — bekijk wijnen van sessies waarbij je aanwezig was, voeg eigen notities en beoordelingen toe (0,5–5 sterren)
- Volledige wijnbibliotheek — blader door de hele collectie van alle sessies
- Betalingsflow met automatische betalingsreferentie voor de bank
- Declaraties indienen met bonnetje uploaden en statusopvolging
- Inloggen via magic link (zonder wachtwoord) of gebruikersnaam/wachtwoord

**Voor organisatoren**
- Activiteiten aanmaken en beheren, inclusief capaciteitslimiet en kosten
- Wijnen per activiteit beheren (type, producent, oogstjaar, proefnotities, spijsadvies, foto's)
- Google Agenda-integratie — activiteiten worden automatisch gesynchroniseerd

**Voor beheerders**
- Volledig gebruikersbeheer (registratie alleen op uitnodiging via unieke codes)
- Betalingen goedkeuren of afwijzen met automatische bevestigingsmail
- Declaraties beoordelen en afhandelen
- Voorraadbeheer
- Statistieken dashboard
- Wijnbibliotheek beheren inclusief uitgelichte wijn op de homepage

## Technologie

| Laag | Technologie |
|---|---|
| Frontend | React 18, TypeScript, Mantine UI, React Router |
| Backend | FastAPI, SQLModel, SQLite |
| Authenticatie | JWT (HttpOnly cookies), bcrypt, magic links |
| E-mail | SMTP (Gmail) |
| Agenda | Google Calendar API |
| Deployment | Docker, Nginx, Let's Encrypt |

## Beveiliging

- HttpOnly + SameSite cookies (geen tokens in localStorage)
- Kortlevende access tokens (30 min) met refresh token rotatie
- Serversijdige token-intrekking
- Account vergrendeling na 5 mislukte inlogpogingen
- Registratie uitsluitend via uitnodigingscode met vervaldatum
- Rate limiting op alle gevoelige endpoints
- HMAC constante-tijd vergelijking voor verificatiecodes
- Beveiligingsheaders: CSP, HSTS, X-Frame-Options, etc.
- Docker-container draait zonder rootrechten

## Projectstructuur

```
├── backend/          # FastAPI applicatie
│   ├── app/
│   │   ├── core/     # Configuratie, database, beveiliging
│   │   ├── models/   # SQLModel databasemodellen
│   │   ├── routers/  # API endpoints
│   │   ├── schemas/  # Pydantic request/response modellen
│   │   └── services/ # E-mail, Google Agenda
│   └── Dockerfile
├── frontend/         # React applicatie
│   ├── src/
│   │   ├── api/      # Axios API client
│   │   ├── context/  # Auth context
│   │   ├── pages/    # Paginacomponenten
│   │   └── hooks/    # Custom hooks
│   └── Dockerfile
├── nginx/
│   ├── Dockerfile    # Multi-stage: bouwt frontend + serveert via Nginx
│   └── nginx.conf    # Reverse proxy + SSL configuratie
└── docker-compose.yml
```

## Lokale ontwikkeling

**Vereisten:** Node 20+, Python 3.12+

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # vul je eigen waarden in
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

De frontend draait op `http://localhost:5173` en stuurt `/api`-verzoeken door naar de backend op poort 8000.

## Productie deployment

De productieomgeving gebruikt:
- Nginx als reverse proxy en static file server
- Let's Encrypt voor automatische SSL-certificaten
- Certbot container voor automatische certificaatverlenging

```bash
cp backend/.env.example backend/.env
# vul productiewaarden in, zet SECURE_COOKIES=True

docker compose up -d
```
