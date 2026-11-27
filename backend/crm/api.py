from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    asignado_a = serializers.SlugRelatedField(
        slug_field="username", required=False, allow_null=True,
        queryset=get_user_model().objects.filter(is_active=True, groups__name="Vendedor"),
    )

    class Meta:
        model = Lead
        fields = (
            "id", "nombre", "correo", "telefono", "interes", "mensaje", "fuente",
            "estado", "asignado_a", "creado_en", "actualizado_en",
        )
        read_only_fields = ("id", "estado", "creado_en", "actualizado_en")


class LeadFilters(serializers.Serializer):
    estado = serializers.ChoiceField(choices=Lead.Estado.choices, required=False, allow_blank=True)
    fuente = serializers.ChoiceField(choices=Lead.Fuente.choices, required=False, allow_blank=True)
    q = serializers.CharField(required=False, allow_blank=True, max_length=120)


class LeadsView(generics.ListCreateAPIView):
    queryset = Lead.objects.select_related("asignado_a")
    serializer_class = LeadSerializer

    def get_queryset(self):
        filters = LeadFilters(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data
        leads = super().get_queryset()
        for field in ("estado", "fuente"):
            if params.get(field):
                leads = leads.filter(**{field: params[field]})
        if query := params.get("q"):
            leads = leads.filter(
                Q(nombre__icontains=query) | Q(correo__icontains=query)
                | Q(telefono__icontains=query) | Q(interes__icontains=query)
            )
        return leads


class LeadDetailView(generics.RetrieveUpdateAPIView):
    queryset = Lead.objects.select_related("asignado_a")
    serializer_class = LeadSerializer
    http_method_names = ("get", "put", "head", "options")


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})
