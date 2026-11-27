from pathlib import Path

from django.http import FileResponse
from django.shortcuts import render
from django.views.decorators.http import require_safe


@require_safe
def openapi_schema(request):
    schema = Path(__file__).with_name("openapi.json")
    return FileResponse(schema.open("rb"), content_type="application/json")


@require_safe
def swagger_ui(request):
    return render(request, "crm/swagger.html")
