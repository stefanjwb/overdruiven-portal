import os
from typing import Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build

from app.core.config import settings
from app.models.activity import Activity

SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _get_service():
    """Bouw de Google Calendar API client."""
    if not os.path.exists(settings.SERVICE_ACCOUNT_FILE):
        raise FileNotFoundError(
            f"Service account bestand niet gevonden: {settings.SERVICE_ACCOUNT_FILE}"
        )
    creds = service_account.Credentials.from_service_account_file(
        settings.SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return build("calendar", "v3", credentials=creds)


def create_calendar_event(activity: Activity) -> Optional[str]:
    """Maak een Google Calendar event aan. Geeft het event_id terug."""
    try:
        service = _get_service()
        date_str = activity.date.isoformat()

        event_body = {
            "summary": activity.name,
            "location": activity.location or "",
            "description": activity.description or "",
            "start": {"timeZone": "Europe/Amsterdam"},
            "end": {"timeZone": "Europe/Amsterdam"},
        }

        if activity.start_time and activity.end_time:
            event_body["start"]["dateTime"] = f"{date_str}T{activity.start_time}:00"
            event_body["end"]["dateTime"] = f"{date_str}T{activity.end_time}:00"
        else:
            event_body["start"]["date"] = date_str
            event_body["end"]["date"] = date_str

        created = (
            service.events()
            .insert(calendarId=settings.GOOGLE_CALENDAR_ID, body=event_body)
            .execute()
        )
        return created["id"]
    except Exception as e:
        print(f"Google Calendar create error: {e}")
        return None


def update_calendar_event(activity: Activity) -> bool:
    """Werk een bestaand Google Calendar event bij."""
    if not activity.google_event_id:
        return False
    try:
        service = _get_service()
        event = (
            service.events()
            .get(
                calendarId=settings.GOOGLE_CALENDAR_ID,
                eventId=activity.google_event_id,
            )
            .execute()
        )

        date_str = activity.date.isoformat()
        event["summary"] = activity.name
        event["description"] = activity.description or ""
        event["location"] = activity.location or ""

        if activity.start_time and activity.end_time:
            event["start"]["dateTime"] = f"{date_str}T{activity.start_time}:00"
            event["end"]["dateTime"] = f"{date_str}T{activity.end_time}:00"
        else:
            event["start"]["date"] = date_str
            event["end"]["date"] = date_str

        service.events().update(
            calendarId=settings.GOOGLE_CALENDAR_ID,
            eventId=activity.google_event_id,
            body=event,
        ).execute()
        return True
    except Exception as e:
        print(f"Google Calendar update error: {e}")
        return False


def delete_calendar_event(event_id: str) -> bool:
    """Verwijder een Google Calendar event."""
    try:
        service = _get_service()
        service.events().delete(
            calendarId=settings.GOOGLE_CALENDAR_ID, eventId=event_id
        ).execute()
        return True
    except Exception as e:
        print(f"Google Calendar delete error: {e}")
        return False
