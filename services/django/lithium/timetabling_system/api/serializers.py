from rest_framework import serializers
from timetabling_system.models import Exam, ExamVenue, Venue


class ExamVenueSerializer(serializers.ModelSerializer):
    venue_name = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source="exam.exam_name", read_only=True)

    class Meta:
        model = ExamVenue
        fields = (
            "examvenue_id",
            "exam_name",
            "exam",
            "venue_name",
            "start_time",
            "exam_length",
            "core",
            "provision_capabilities",
        )

    def get_venue_name(self, obj):
        # Some ExamVenue rows act as placeholders before a venue is allocated.
        return obj.venue.venue_name if obj.venue else None


class ExamVenueWriteSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(
        allow_blank=True,
        allow_null=True,
        required=False,
        help_text="Name of an existing venue; leave blank for an unassigned placeholder.",
    )

    class Meta:
        model = ExamVenue
        fields = (
            "examvenue_id",
            "exam",
            "venue_name",
            "start_time",
            "exam_length",
            "core",
            "provision_capabilities",
        )
        read_only_fields = ("examvenue_id",)

    def _resolve_venue(self, venue_name: str | None) -> Venue | None:
        """Translate a venue name string into a Venue instance or None."""
        if not venue_name:
            return None
        try:
            return Venue.objects.get(venue_name=venue_name)
        except Venue.DoesNotExist:
            raise serializers.ValidationError({"venue_name": f"Venue '{venue_name}' does not exist."})

    def validate(self, attrs):
        if self.instance and self.instance.core:
            raise serializers.ValidationError("Core exam venues cannot be modified via this endpoint.")
        return super().validate(attrs)

    def create(self, validated_data):
        venue = self._resolve_venue(validated_data.pop("venue_name", None))
        validated_data["venue"] = venue
        return super().create(validated_data)

    def update(self, instance, validated_data):
        venue = self._resolve_venue(validated_data.pop("venue_name", None))
        validated_data["venue"] = venue
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        """Reuse the read serializer shape for responses."""
        return ExamVenueSerializer(instance).data


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
        return [ev.venue.venue_name for ev in exam_venues if ev.venue]


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
