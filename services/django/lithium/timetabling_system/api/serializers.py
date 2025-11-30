from rest_framework import serializers
from timetabling_system.models import Exam, ExamVenue, Venue


class ExamVenueSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source="venue.venue_name", read_only=True)
    exam_name = serializers.CharField(source="exam.exam_name", read_only=True)

    class Meta:
        model = ExamVenue
        fields = (
            "examvenue_id",
            "exam_name",
            "venue_name",
            "start_time",
            "exam_length",
            "core",
            "provision_capabilities",
        )

    def get_venue_name(self, obj):
        return obj.venue.venue_name if obj.venue else None


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


class VenueSerializer(serializers.ModelSerializer):
    exams = serializers.SerializerMethodField()
    exam_venues = ExamVenueSerializer(source="examvenue_set", many=True, read_only=True)

    class Meta:
        model = Venue
        fields = (
            "venue_name",
            "capacity",
            "venuetype",
            "is_accessible",
            "qualifications",
            "availability",
            "provision_capabilities",
            "exams",
            "exam_venues",
        )

    def get_exams(self, obj):
        """Return exam names associated with a venue via ExamVenue."""
        exam_venues = getattr(obj, "_prefetched_objects_cache", {}).get("examvenue_set")
        if exam_venues is None: exam_venues = obj.examvenue_set.select_related("exam").all()
        return [ev.exam.exam_name for ev in exam_venues]
