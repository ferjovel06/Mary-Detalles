from datetime import timedelta

from django.contrib.auth import authenticate
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import issue_token


class LoginInput(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        data = LoginInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = authenticate(request=request, **data.validated_data)
        if user is None:
            return Response(
                {"detail": "Usuario o contraseña incorrectos."},
                status=status.HTTP_401_UNAUTHORIZED,
                headers={"WWW-Authenticate": "Bearer"},
            )
        groups = set(user.groups.values_list("name", flat=True))
        if user.is_superuser or "Administrador" in groups:
            role = "administrador"
        elif "Vendedor" in groups:
            role = "vendedor"
        else:
            raise PermissionDenied("La cuenta no tiene un rol en el CRM.")
        return Response({
            "access": issue_token(user, "access", timedelta(minutes=30)),
            "usuario": {"username": user.get_username(), "rol": role},
        })
