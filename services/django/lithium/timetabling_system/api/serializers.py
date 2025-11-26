from rest_framework import serializers
from timetabling_system.models import Exam


class ExamSerializer(serializers.ModelSerializer):
    venues = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = "__all__"

    def get_venues(self, obj):
        """Return venue names associated with an exam via ExamVenue."""
        exam_venues = getattr(obj, "_prefetched_objects_cache", {}).get("examvenue_set")
        if exam_venues is None: exam_venues = obj.examvenue_set.select_related("venue").all()
        return [ev.venue.venue_name for ev in exam_venues]
