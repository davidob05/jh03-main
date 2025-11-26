from rest_framework import serializers
from timetabling_system.models import Exam, ExamVenue


class ExamVenueSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source="venue.venue_name", read_only=True)

    class Meta:
        model = ExamVenue
        fields = (
            "examvenue_id",
            "venue_name",
            "start_time",
            "exam_length",
            "core",
            "provision_capabilities",
        )



class ExamSerializer(serializers.ModelSerializer):
    venues = serializers.SerializerMethodField()
    exam_venues = ExamVenueSerializer(source="examvenue_set", many=True, read_only=True)

    class Meta:
        model = Exam
        fields = (
            "exam_id",
            "exam_name",
            "course_code",
            "exam_type",
            "no_students",
            "exam_school",
            "school_contact",
            "venues",
            "exam_venues",
        )

    def get_venues(self, obj):
        """Return venue names associated with an exam via ExamVenue."""
        exam_venues = getattr(obj, "_prefetched_objects_cache", {}).get("examvenue_set")
        if exam_venues is None: exam_venues = obj.examvenue_set.select_related("venue").all()
        return [ev.venue.venue_name for ev in exam_venues]
