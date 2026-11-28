from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APITestCase

from .models import Lead


class Week4Cases(APITestCase):
    def setUp(self):
        group = Group.objects.get(name="Vendedor")
        self.user = get_user_model().objects.create_user(
            username="vendedor_prueba", password="solo-prueba-local",
        )
        self.user.groups.add(group)
        self.payload = {
            "nombre": "Andrea Prueba", "correo": "andrea@example.test",
            "telefono": "80000001", "interes": "Taza con nombre", "fuente": "instagram",
        }

    def login(self, password="solo-prueba-local"):
        return self.client.post(
            "/api/auth/token/", {"username": self.user.username, "password": password},
            format="json",
        )

    def authenticate(self):
        token = self.login().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_cp01_login(self):
        result = self.login()
        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.data["access"])
        self.assertEqual(result.data["usuario"]["rol"], "vendedor")

    def test_cp02_wrong_password(self):
        self.assertEqual(self.login("incorrecta").status_code, 401)

    def test_cp03_list_without_token(self):
        self.assertEqual(self.client.get("/api/leads/").status_code, 401)

    def test_cp04_valid_lead(self):
        self.authenticate()
        result = self.client.post("/api/leads/", self.payload, format="json")
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.data["estado"], "nuevo")
        self.assertTrue(Lead.objects.filter(pk=result.data["id"]).exists())

    def test_cp05_missing_email(self):
        self.authenticate()
        del self.payload["correo"]
        result = self.client.post("/api/leads/", self.payload, format="json")
        self.assertEqual(result.status_code, 400)
        self.assertIn("correo", result.data)

    def test_cp06_filter_status(self):
        self.authenticate()
        Lead.objects.create(**self.payload)
        Lead.objects.create(**self.payload, estado=Lead.Estado.COTIZADO)
        result = self.client.get("/api/leads/?estado=cotizado")
        self.assertEqual(result.status_code, 200)
        self.assertEqual([item["estado"] for item in result.data], ["cotizado"])

    def test_detail_update_and_health(self):
        self.assertEqual(self.client.get("/api/health/").data, {"status": "ok"})
        self.authenticate()
        lead = Lead.objects.create(**self.payload, estado=Lead.Estado.COTIZADO)
        url = f"/api/leads/{lead.pk}/"
        self.assertEqual(self.client.get(url).status_code, 200)
        result = self.client.put(url, {**self.payload, "interes": "Caja sorpresa"}, format="json")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["estado"], "cotizado")
        self.assertEqual(result.data["interes"], "Caja sorpresa")
        self.assertEqual(self.client.get("/api/leads/999999/").status_code, 404)
