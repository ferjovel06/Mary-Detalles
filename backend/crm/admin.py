from django.contrib import admin

from .models import Interaccion, Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("nombre", "correo", "interes", "fuente", "estado", "asignado_a", "creado_en")
    list_filter = ("estado", "fuente")
    search_fields = ("nombre", "correo")


@admin.register(Interaccion)
class InteraccionAdmin(admin.ModelAdmin):
    list_display = ("lead", "tipo", "fecha", "registrada_por")
    list_filter = ("tipo",)
    search_fields = ("lead__nombre", "lead__correo", "nota")
