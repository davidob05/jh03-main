from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


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

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
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
                },
            },
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *_args, **_kwargs):
        user = request.user
        return Response(
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "role": _derive_role(user),
            },
            status=status.HTTP_200_OK,
        )
