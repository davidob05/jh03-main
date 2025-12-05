from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from timetabling_system.models import Venue, VenueType, ExamVenueProvisionType
from timetabling_system.services.venue_matching import attach_placeholders_to_venue


@receiver(pre_save, sender=Venue)
def ensure_computer_cluster_for_use_computer(sender, instance: Venue, **kwargs):
    # If the venue advertises computer capability, default it to a computer cluster type
    # unless it is already a computer-friendly type.
    caps = instance.provision_capabilities or []
    if (
        ExamVenueProvisionType.USE_COMPUTER in caps
        and instance.venuetype not in (VenueType.COMPUTER_CLUSTER, VenueType.PURPLE_CLUSTER)
    ):
        instance.venuetype = VenueType.COMPUTER_CLUSTER


@receiver(post_save, sender=Venue)
def update_placeholders_on_venue_save(sender, instance: Venue, **kwargs):
    # When a venue is created or its capabilities change, try to upgrade any
    # placeholder ExamVenue rows that this venue can now satisfy.
    attach_placeholders_to_venue(instance)
