# Chateau Overdruiven — Backend (FastAPI)

REST API voor de Chateau Overdruiven wijnclub applicatie.

## Snelle start

```bash
# 1. Clone en ga naar de backend map
cd backend

# 2. Virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Dependencies
pip install -r requirements.txt

# 4. Configuratie
cp .env.example .env
# Pas de waarden aan in .env

# 5. Start de server (development)
uvicorn app.main:app --reload

# 6. Maak een admin gebruiker aan
python cli.py create-user admin admin@example.com WachtwoordHier123 --role admin
```

De API draait nu op `http://localhost:8000`.
Interactieve docs: `http://localhost:8000/docs`

## Docker

```bash
docker-compose up --build
```

## API Overzicht

| Methode | Endpoint                        | Auth      | Beschrijving                          |
|---------|---------------------------------|-----------|---------------------------------------|
| GET     | `/`                             | -         | Openbare activiteiten                 |
| GET     | `/bank-info`                    | -         | Bankgegevens                          |
| POST    | `/contact`                      | -         | Lidmaatschapsaanvraag                 |
| POST    | `/auth/login`                   | -         | Inloggen → JWT token                  |
| POST    | `/auth/register`                | -         | Registreren met invite code           |
| GET     | `/auth/me`                      | User      | Huidige gebruiker                     |
| GET     | `/activities/`                  | User      | Alle activiteiten                     |
| GET     | `/activities/{id}`              | -         | Detail activiteit                     |
| GET     | `/activities/{id}/signups`      | User      | Aanmeldingen voor activiteit          |
| GET     | `/activities/organizers`        | Organizer | Lijst van organisatoren               |
| POST    | `/activities/`                  | Organizer | Nieuwe activiteit                     |
| PUT     | `/activities/{id}`              | Organizer | Activiteit bewerken                   |
| DELETE  | `/activities/{id}`              | Admin     | Activiteit verwijderen                |
| POST    | `/signups/{activity_id}`        | User      | Aanmelden                             |
| DELETE  | `/signups/{signup_id}`          | Admin     | Aanmelding verwijderen                |
| POST    | `/payments/confirm/{act_id}`    | User      | Betaling bevestigen                   |
| GET     | `/payments/status/{act_id}`     | User      | Betalingsstatus ophalen               |
| POST    | `/payments/approve/{pay_id}`    | Admin     | Betaling goedkeuren                   |
| POST    | `/payments/reject/{pay_id}`     | Admin     | Betaling afwijzen                     |
| GET     | `/admin/users`                  | Admin     | Alle gebruikers                       |
| PUT     | `/admin/users/{id}`             | Admin     | Gebruiker bewerken                    |
| DELETE  | `/admin/users/{id}`             | Admin     | Gebruiker verwijderen                 |
| GET     | `/admin/invite-codes`           | Admin     | Alle uitnodigingscodes                |
| POST    | `/admin/invite-codes`           | Admin     | Nieuwe uitnodigingscode               |
| DELETE  | `/admin/invite-codes/{id}`      | Admin     | Uitnodigingscode verwijderen          |
| GET     | `/admin/activities`             | Admin     | Alle activiteiten (incl. verleden)    |

## Projectstructuur

```
backend/
├── app/
│   ├── core/           # Config, database, security
│   ├── models/         # SQLModel database modellen
│   ├── routers/        # API endpoints
│   ├── schemas/        # Pydantic request/response schemas
│   ├── services/       # Google Calendar, e-mail
│   └── main.py         # FastAPI app entry point
├── cli.py              # CLI voor user/code beheer
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```
