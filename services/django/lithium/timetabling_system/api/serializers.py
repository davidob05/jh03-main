from rest_framework import serializers
from datetime import timedelta
from timetabling_system.models import (
    Exam,
    Venue,
    ExamVenue,
    Invigilator,
    InvigilatorQualification,
    InvigilatorRestriction,
    InvigilatorAvailability,
    InvigilatorAssignment,
    Notification,
    SlotChoices
)
from timetabling_system.constants import DIET_DATE_RANGES

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


class VenueWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = (
            "venue_name",
            "capacity",
            "venuetype",
            "is_accessible",
            "provision_capabilities",
            "qualifications",
            "availability",
        )

    def to_representation(self, instance):
        return VenueSerializer(instance).data


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "type", "message", "timestamp")


class InvigilatorAssignmentSerializer(serializers.ModelSerializer):
    invigilator_name = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source="exam_venue.exam.exam_name", read_only=True)
    venue_name = serializers.SerializerMethodField()
    exam_start = serializers.DateTimeField(source="exam_venue.start_time", read_only=True)
    exam_length = serializers.IntegerField(source="exam_venue.exam_length", read_only=True)

    class Meta:
        model = InvigilatorAssignment
        fields = (
            "id",
            "invigilator",
            "invigilator_name",
            "exam_venue",
            "exam_name",
            "venue_name",
            "exam_start",
            "exam_length",
            "role",
            "assigned_start",
            "assigned_end",
            "notes",
        )

    def get_invigilator_name(self, obj):
        invigilator = obj.invigilator
        return invigilator.preferred_name or invigilator.full_name

    def get_venue_name(self, obj):
        venue = getattr(obj.exam_venue, "venue", None)
        return venue.venue_name if venue else None


class InvigilatorQualificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvigilatorQualification
        fields = ("qualification",)


class InvigilatorRestrictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvigilatorRestriction
        fields = ("diet", "restrictions", "notes")


class InvigilatorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = InvigilatorAvailability
        fields = ("date", "slot", "available")


class InvigilatorSerializer(serializers.ModelSerializer):
    assignments = InvigilatorAssignmentSerializer(many=True, read_only=True)
    qualifications = InvigilatorQualificationSerializer(many=True, required=False)
    restrictions = InvigilatorRestrictionSerializer(many=True, required=False)
    availabilities = InvigilatorAvailabilitySerializer(many=True, read_only=True)

    class Meta:
        model = Invigilator
        fields = (
            "id",
            "preferred_name",
            "full_name",
            "mobile",
            "mobile_text_only",
            "janet_txt",
            "alt_phone",
            "university_email",
            "personal_email",
            "notes",
            "resigned",
            "contracted_hours",
            "qualifications",
            "restrictions",
            "assignments",
            "availabilities",
        )

    def create(self, validated_data):
        qualifications_data = validated_data.pop("qualifications", [])
        restrictions_data = validated_data.pop("restrictions", [])
        invigilator = Invigilator.objects.create(**validated_data)

        for q in qualifications_data:
            InvigilatorQualification.objects.create(
                invigilator=invigilator,
                **q
            )

        diets = []
        for r in restrictions_data:
            InvigilatorRestriction.objects.create(
                invigilator=invigilator,
                **r
            )
            diets.append(r["diet"])

        self._generate_availability(invigilator, diets)

        return invigilator
    def _generate_availability(self, invigilator, diets):
        availability_objects = []

        for diet in diets:
            if diet not in DIET_DATE_RANGES:
                continue

            start_date, end_date = DIET_DATE_RANGES[diet]
            current_date = start_date

            while current_date <= end_date:
                for slot in SlotChoices.values:
                    availability_objects.append(
                        InvigilatorAvailability(
                            invigilator=invigilator,
                            date=current_date,
                            slot=slot,
                            available=True,
                        )
                    )
                current_date += timedelta(days=1)

        InvigilatorAvailability.objects.bulk_create(
            availability_objects,
            ignore_conflicts=True,
        )

    def update(self, instance, validated_data):
        qualifications_data = validated_data.pop("qualifications", None)
        restrictions_data = validated_data.pop("restrictions", None)

        instance = super().update(instance, validated_data)

        if qualifications_data is not None:
            InvigilatorQualification.objects.filter(invigilator=instance).delete()
            for q in qualifications_data:
                InvigilatorQualification.objects.create(invigilator=instance, **q)

        if restrictions_data is not None:
            InvigilatorRestriction.objects.filter(invigilator=instance).delete()
            InvigilatorAvailability.objects.filter(invigilator=instance).delete()
            diets = []
            for r in restrictions_data:
                InvigilatorRestriction.objects.create(invigilator=instance, **r)
                diets.append(r["diet"])
            self._generate_availability(instance, diets)

        return instance
