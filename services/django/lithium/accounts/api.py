from django.contrib.auth import get_user_model
from django.db.models import Q
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle


def _derive_role(user):
    if user.is_staff or user.is_superuser:
        return "admin"
    try:
        if user.invigilator_profile:
            return "invigilator"
    except Exception:
        pass
    return "invigilator"


class AuthTokenSerializer(serializers.Serializer):
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    default_error_messages = {
        "invalid_credentials": "Unable to log in with provided credentials.",
        "inactive": "User account is disabled.",
    }

    def validate(self, attrs):
        username_or_email = attrs.get("username")
        password = attrs.get("password")
        if not username_or_email or not password:
            raise serializers.ValidationError(self.error_messages["invalid_credentials"], code="authorization")

        user_model = get_user_model()
        user = (
            user_model.objects.filter(Q(username=username_or_email) | Q(email__iexact=username_or_email))
            .order_by("id")
            .first()
        )
        if not user or not user.check_password(password):
            raise serializers.ValidationError(self.error_messages["invalid_credentials"], code="authorization")
        if not user.is_active:
            raise serializers.ValidationError(self.error_messages["inactive"], code="authorization")

        attrs["user"] = user
        return attrs


class ObtainAuthTokenView(ObtainAuthToken):
    """
    Issue an auth token for any active user (admin or invigilator).
    Accepts either username or email in the "username" field.
    """

    permission_classes = [AllowAny]
    serializer_class = AuthTokenSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        if not getattr(token, "key", None):
            token.delete()
            token = Token.objects.create(user=user)
        return Response(
            {
                "token": token.key,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                    "role": _derive_role(user),
                    "avatar": getattr(user, "avatar", None),
                },
            },
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *_args, **_kwargs):
        user = request.user
        phone = getattr(user, "phone", None)
        avatar = getattr(user, "avatar", None)
        try:
            if not phone and hasattr(user, "invigilator_profile") and user.invigilator_profile:
                phone = user.invigilator_profile.alt_phone
        except Exception:
            phone = phone
        return Response(
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "role": _derive_role(user),
                "phone": phone,
                "avatar": avatar,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, *_args, **_kwargs):
        user = request.user
        user_model = get_user_model()

        username = request.data.get("username")
        email = request.data.get("email")
        phone = request.data.get("phone")
        avatar = request.data.get("avatar")
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        # Basic validation
        if username is not None:
            username = username.strip()
            if not username:
                return Response({"detail": "Username cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
            if user_model.objects.exclude(pk=user.pk).filter(username__iexact=username).exists():
                return Response({"detail": "Username is already taken."}, status=status.HTTP_400_BAD_REQUEST)

        if email is not None:
            email = email.strip()
            if email and user_model.objects.exclude(pk=user.pk).filter(email__iexact=email).exists():
                return Response({"detail": "Email is already in use."}, status=status.HTTP_400_BAD_REQUEST)

        updated = False
        update_fields = []
        if username is not None and username != user.username:
            user.username = username
            updated = True
            update_fields.append("username")
        if email is not None and email != user.email:
            user.email = email
            updated = True
            update_fields.append("email")

        phone_updated = False
        if phone is not None:
            phone = phone.strip()
            if getattr(user, "phone", None) != phone:
                user.phone = phone
                updated = True
                update_fields.append("phone")
                phone_updated = True
            try:
                if hasattr(user, "invigilator_profile") and user.invigilator_profile:
                    if user.invigilator_profile.alt_phone != phone:
                        user.invigilator_profile.alt_phone = phone
                        user.invigilator_profile.save(update_fields=["alt_phone"])
            except Exception:
                pass

        if avatar is not None and avatar != getattr(user, "avatar", None):
            user.avatar = avatar
            updated = True
            update_fields.append("avatar")

        password_updated = False
        if current_password or new_password or confirm_password:
            # Ensure all fields are present
            if not current_password or not new_password:
                return Response({"detail": "Current password and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
            if new_password != confirm_password:
                return Response({"detail": "New passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)
            if not user.check_password(current_password):
                return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                validate_password(new_password, user)
            except ValidationError as exc:
                return Response({"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            updated = True
            password_updated = True
            # set_password handles hashing; ensure password updated even if no other fields change
            update_fields.append("password")

        if updated:
            # Remove duplicates if any
            update_fields = list(dict.fromkeys(update_fields))
            user.save(update_fields=update_fields)

        return Response(
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "role": _derive_role(user),
                "phone": phone if phone is not None else getattr(getattr(user, "invigilator_profile", None), "alt_phone", None),
                "phone_updated": phone_updated,
                "avatar": getattr(user, "avatar", None),
                "password_updated": password_updated,
            },
            status=status.HTTP_200_OK,
        )
