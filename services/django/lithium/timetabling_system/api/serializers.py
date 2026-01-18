from rest_framework import serializers
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db import transaction
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
    Announcement,
    SlotChoices,
    Diet,
)

# Backwards-compat attribute so older tests that patch DIET_DATE_RANGES don't crash.
DIET_DATE_RANGES: dict = {}


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
        extra_kwargs = {
            "school_contact": {"required": False, "allow_null": True, "allow_blank": True}
        }

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
    triggered_by = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ("id", "type", "message", "timestamp", "triggered_by")

    def get_triggered_by(self, obj):
        user = getattr(obj, "triggered_by", None)
        if not user:
            return None
        return {
            "id": user.id,
            "email": getattr(user, "email", None),
            "username": getattr(user, "username", None),
        }


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = (
            "id",
            "title",
            "body",
            "image",
            "audience",
            "published_at",
            "expires_at",
            "is_active",
            "priority",
        )
        read_only_fields = ("id",)


class InvigilatorAssignmentSerializer(serializers.ModelSerializer):
    invigilator_name = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source="exam_venue.exam.exam_name", read_only=True)
    venue_name = serializers.SerializerMethodField()
    exam_start = serializers.DateTimeField(source="exam_venue.start_time", read_only=True)
    exam_length = serializers.IntegerField(source="exam_venue.exam_length", read_only=True)
    cover_filled = serializers.SerializerMethodField()

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
            "break_time_minutes",
            "cancel",
            "cancel_cause",
            "cover",
            "cover_for",
            "cover_filled",
            "confirmed",
            "notes",
        )

    def get_invigilator_name(self, obj):
        invigilator = obj.invigilator
        return invigilator.preferred_name or invigilator.full_name

    def get_venue_name(self, obj):
        venue = getattr(obj.exam_venue, "venue", None)
        return venue.venue_name if venue else None

    def get_cover_filled(self, obj):
        return obj.cover_assignments.filter(cancel=False).exists()


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


class DietSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diet
        fields = (
            "id",
            "code",
            "name",
            "start_date",
            "end_date",
            "restriction_cutoff",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_code(self, value: str):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Code is required.")
        return value

class InvigilatorSerializer(serializers.ModelSerializer):
    assignments = InvigilatorAssignmentSerializer(many=True, read_only=True)
    qualifications = InvigilatorQualificationSerializer(many=True, required=False)
    restrictions = InvigilatorRestrictionSerializer(many=True, required=False)
    availabilities = InvigilatorAvailabilitySerializer(many=True, read_only=True)
    user = serializers.DictField(write_only=True, required=False, allow_null=True)
    user_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Invigilator
        fields = (
            "id",
            "user",
            "user_id",
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

    def validate_user(self, value):
        if value in (None, {}):
            return None
        username = (value.get("username") or "").strip()
        email = (value.get("email") or "").strip() or None
        password = value.get("password") or None

        if not username:
            raise serializers.ValidationError("username is required when providing user details.")

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with that email already exists.")

        return {"username": username, "email": email, "password": password}

    def _create_user_for_invigilator(self, user_data):
        if not user_data:
            return None
        User = get_user_model()
        password = user_data.get("password") or User.objects.make_random_password()
        return User.objects.create_user(
            username=user_data["username"],
            email=user_data.get("email"),
            password=password,
        )

    def create(self, validated_data):
        user_data = validated_data.pop("user", None)
        qualifications_data = validated_data.pop("qualifications", [])
        restrictions_data = validated_data.pop("restrictions", [])

        with transaction.atomic():
            user = self._create_user_for_invigilator(user_data)
            invigilator = Invigilator.objects.create(user=user, **validated_data)

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

        diet_map = self._get_diet_map(diets)
        self._generate_availability(invigilator, diet_map)

        return invigilator

    def _get_diet_map(self, diet_codes: list[str]) -> dict[str, Diet]:
        unique_codes = list({code for code in diet_codes if code})
        if not unique_codes:
            return {}
        diet_map: dict[str, Diet] = {}
        db_diets = {d.code: d for d in Diet.objects.filter(code__in=unique_codes)}
        # Silently skip missing diet codes; availability won't be generated for them.
        diet_map.update(db_diets)
        return diet_map

    def _generate_availability(self, invigilator, diet_map: dict[str, Diet]):
        availability_objects = []

        for diet in diet_map.values():
            start_date = diet.start_date
            end_date = diet.end_date
            if not start_date or not end_date:
                continue
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
        user_data = validated_data.pop("user", None)
        qualifications_data = validated_data.pop("qualifications", None)
        restrictions_data = validated_data.pop("restrictions", None)

        with transaction.atomic():
            if user_data and instance.user is None:
                instance.user = self._create_user_for_invigilator(user_data)
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
            diet_map = self._get_diet_map(diets)
            self._generate_availability(instance, diet_map)

        return instance
