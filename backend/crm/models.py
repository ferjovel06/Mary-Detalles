from django.conf import settings
from django.db import models


class Lead(models.Model):
    class Estado(models.TextChoices):
        NUEVO = "nuevo", "Nuevo"
        CONTACTADO = "contactado", "Contactado"
        COTIZADO = "cotizado", "Cotizado"
        GANADO = "ganado", "Ganado"
        PERDIDO = "perdido", "Perdido"

    class Fuente(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"
        INSTAGRAM = "instagram", "Instagram"
        FACEBOOK = "facebook", "Facebook"
        WEB = "web", "Formulario web"
        PRESENCIAL = "presencial", "Presencial"
        REFERIDO = "referido", "Referido"
        OTRO = "otro", "Otro"

    nombre = models.CharField(max_length=120)
    correo = models.EmailField()
    telefono = models.CharField(max_length=25)
    interes = models.CharField(max_length=200)
    mensaje = models.TextField(blank=True, max_length=2000)
    fuente = models.CharField(max_length=16, choices=Fuente.choices)
    estado = models.CharField(max_length=12, choices=Estado.choices, default=Estado.NUEVO)
    asignado_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="leads_asignados",
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-creado_en", "-pk")
        indexes = [models.Index(fields=["estado", "fuente"], name="crm_lead_estado_fuente_idx")]

    def __str__(self):
        return self.nombre


class Interaccion(models.Model):
    class Tipo(models.TextChoices):
        LLAMADA = "llamada", "Llamada"
        WHATSAPP = "whatsapp", "WhatsApp"
        CORREO = "correo", "Correo"
        REUNION = "reunion", "Reunión"

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="interacciones")
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    nota = models.TextField(max_length=2000)
    fecha = models.DateTimeField()
    registrada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
        related_name="interacciones_registradas",
    )

    class Meta:
        ordering = ("-fecha", "-pk")
        verbose_name = "interacción"
        verbose_name_plural = "interacciones"

    def __str__(self):
        return f"{self.get_tipo_display()} · {self.lead}"
