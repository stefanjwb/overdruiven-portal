import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)


def _sanitize_header(value: str) -> str:
    """Verwijder newlines om e-mailheader-injectie te voorkomen."""
    return value.replace("\r", "").replace("\n", "").strip()


def send_email(subject: str, recipients: List[str], body: str) -> bool:
    """Verstuur een plain-text e-mail via SMTP."""
    try:
        safe_subject = _sanitize_header(subject)
        safe_recipients = [_sanitize_header(r) for r in recipients if r.strip()]

        msg = MIMEMultipart()
        msg["From"] = f"{_sanitize_header(settings.MAIL_FROM_NAME)} <{_sanitize_header(settings.MAIL_USERNAME)}>"
        msg["To"] = ", ".join(safe_recipients)
        msg["Subject"] = safe_subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            server.starttls()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        logger.error("E-mail versturen mislukt: %s", e)
        return False


def send_payment_approved_email(
    username: str, email: str, activity_name: str, activity_date: str,
    start_time: str | None = None, location: str | None = None,
):
    subject = f"Je betaling voor '{activity_name}' is goedgekeurd!"
    body = f"""Beste {username},

Geweldig nieuws! Je betaling voor de activiteit '{activity_name}' is ontvangen en goedgekeurd.
Je aanmelding is nu definitief.

Activiteit: {activity_name}
Datum: {activity_date}
"""
    if start_time:
        body += f"Tijd: {start_time}\n"
    if location:
        body += f"Locatie: {location}\n"
    body += """
We kijken ernaar uit je te zien!

Met vriendelijke groet,
Het team van Chateau Overdruiven
"""
    send_email(subject, [email], body)


def send_payment_rejected_email(
    username: str, email: str, activity_name: str, activity_date: str,
    cost: float | None = None, activity_url: str = "",
):
    subject = f"Status van je betaling voor '{activity_name}'"
    kosten_str = f"€{cost:.2f}" if cost else "Gratis"
    body = f"""Beste {username},

We moeten je helaas informeren dat je betaling voor de activiteit '{activity_name}' niet kon worden geverifieerd of is afgewezen.

Controleer alsjeblieft je betalingsgegevens en probeer het opnieuw via de activiteitspagina:
{activity_url}

Activiteit: {activity_name}
Datum: {activity_date}
Kosten: {kosten_str}

Met vriendelijke groet,
Het bestuur van Chateau Overdruiven
"""
    send_email(subject, [email], body)


def send_magic_link_email(name: str, email: str, link: str):
    subject = "Jouw inloglink voor Chateau Overdruiven"
    body = f"""Beste {name},

Klik op de onderstaande link om in te loggen bij Chateau Overdruiven:

{link}

Deze link is 15 minuten geldig en kan slechts één keer gebruikt worden.
Als je deze aanvraag niet hebt gedaan, kun je deze e-mail negeren.

Met vriendelijke groet,
Het team van Chateau Overdruiven
"""
    send_email(subject, [email], body)


def send_verification_code(first_name: str, email: str, code: str):
    subject = "Jouw verificatiecode voor Chateau Overdruiven"
    body = f"""Beste {first_name},

Gebruik de onderstaande code om je registratie te voltooien:

    {code}

Deze code is 15 minuten geldig.

Met vriendelijke groet,
Het team van Chateau Overdruiven
"""
    send_email(subject, [email], body)


def send_contact_email(name: str, email: str, message: str | None = None):
    subject = f"Nieuwe aanvraag lidmaatschap van {name}"
    body = f"""Je hebt een nieuwe aanvraag voor lidmaatschap ontvangen.

Naam: {name}
E-mailadres: {email}

Bericht:
{message or '(geen bericht)'}
"""
    send_email(subject, [settings.ADMIN_EMAIL], body)
