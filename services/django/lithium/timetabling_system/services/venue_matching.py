from typing import Iterable, List

from django.db import transaction

from timetabling_system.models import (
    ExamVenue,
    ExamVenueProvisionType,
    StudentExam,
    Venue,
    VenueType,
)


def venue_supports_caps(venue: Venue, required_caps: Iterable[str]) -> bool:
    """Return True if the venue satisfies all required provision capabilities."""
    caps_needed: List[str] = list(required_caps or [])
    venue_caps = venue.provision_capabilities or []

    for cap in caps_needed:
        # If the venue explicitly lists the capability, accept it.
        if cap in venue_caps:
            continue

        # Otherwise fall back to inference from attributes/venue type.
        if cap == ExamVenueProvisionType.ACCESSIBLE_HALL:
            if not venue.is_accessible:
                return False
        elif cap == ExamVenueProvisionType.USE_COMPUTER:
            if venue.venuetype not in (VenueType.COMPUTER_CLUSTER, VenueType.PURPLE_CLUSTER):
                return False
        elif cap in (
            ExamVenueProvisionType.SEPARATE_ROOM_ON_OWN,
            ExamVenueProvisionType.SEPARATE_ROOM_NOT_ON_OWN,
        ):
            if venue.venuetype != VenueType.SEPARATE_ROOM:
                return False
        else:
            return False
    return True


@transaction.atomic
def attach_placeholders_to_venue(venue: Venue) -> None:
    """
    When a Venue gains provision capabilities, upgrade any placeholder ExamVenue
    records (venue is NULL) that the room can now satisfy.
    """
    if not venue:
        return

    placeholders = ExamVenue.objects.select_related("exam").filter(venue__isnull=True)
    for ev in placeholders:
        required_caps = ev.provision_capabilities or []
        if not venue_supports_caps(venue, required_caps):
            continue

        # If an ExamVenue already exists for this exam+venue, reuse it and re-point students.
        existing = (
            ExamVenue.objects.filter(exam=ev.exam, venue=venue)
            .exclude(pk=ev.pk)
            .first()
        )
        if existing:
            StudentExam.objects.filter(exam_venue=ev).update(exam_venue=existing)
            ev.delete()
            continue

        ev.venue = venue
        ev.save(update_fields=["venue"])
