from django.contrib import admin
from django.urls import path

from crm.api import LeadDetailView, LeadsView, health
from crm.documentation import openapi_schema, swagger_ui
from crm.login import LoginView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", openapi_schema, name="openapi-schema"),
    path("api/docs/", swagger_ui, name="swagger-ui"),
    path("api/health/", health),
    path("api/auth/token/", LoginView.as_view()),
    path("api/leads/", LeadsView.as_view()),
    path("api/leads/<int:pk>/", LeadDetailView.as_view()),
]
