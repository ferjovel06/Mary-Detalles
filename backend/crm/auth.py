from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed


ISSUER = "mary-detalles-crm"
AUDIENCE = "mary-detalles-api"
ALGORITHM = "HS256"


def issue_token(user, token_type, duration):
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user.pk), "type": token_type, "iat": now, "exp": now + duration,
        "iss": ISSUER, "aud": AUDIENCE,
    }
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=ALGORITHM)


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts or parts[0].lower() != b"bearer":
            return None
        if len(parts) != 2:
            raise AuthenticationFailed("Token inválido.")
        try:
            token = jwt.decode(
                parts[1], settings.SECRET_KEY, algorithms=[ALGORITHM],
                issuer=ISSUER, audience=AUDIENCE,
                options={"require": ["exp", "iat", "sub", "type"]},
            )
            if token["type"] != "access":
                raise AuthenticationFailed("Se requiere un token de acceso.")
            user = get_user_model().objects.get(pk=token["sub"], is_active=True)
        except (jwt.InvalidTokenError, get_user_model().DoesNotExist, ValueError):
            raise AuthenticationFailed("Token inválido o vencido.") from None
        return user, token

    def authenticate_header(self, request):
        return "Bearer"
