import urllib3
from locust import HttpUser, task, between, events, constant

# Deaktiviert Warnungen für selbstsignierte Zertifikate
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class WAFSecurityTester(HttpUser):
    # Wartezeit zwischen 0.1 und 0.5 Sekunden
    wait_time = between(0.1, 0.5)

    def on_start(self):
        self.login()

    def login(self):
        # Passe die URL ("/login") und die Felder (username/password)
        # an deine echte App an!
        payload = {"username": "u001", "password": "p"}
        with self.client.post(
            "/api/auth/login/ldap", json=payload, verify=False, catch_response=True
        ) as response:
            if response.status_code == 200:
                print("Login erfolgreich")
                response.success()
            else:
                print(f"Login fehlgeschlagen: {response.status_code}")
                response.failure("Could not log in")

    @task(10)
    def test_regular_traffic(self):
        """Normaler Traffic"""
        with self.client.get("/", verify=False, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate Limit Hit (429)")

    @task(2)
    def test_xss_attack(self):
        """XSS Angriff Simulation"""
        payload = "<script>alert('WAF_TEST')</script>"
        with self.client.get(
            f"/?search={payload}", verify=False, catch_response=True
        ) as response:
            # WAF sollte mit 403 blocken
            if response.status_code == 403:
                response.success()
            else:
                response.failure(f"WAF bypassed! Status: {response.status_code}")

    @task(2)
    def test_sql_injection(self):
        """SQL Injection Simulation"""
        payload = "1' OR '1'='1"
        with self.client.get(
            f"/?id={payload}", verify=False, catch_response=True
        ) as response:
            if response.status_code == 403:
                response.success()
            else:
                response.failure(f"WAF bypassed! Status: {response.status_code}")


class RateLimitTester(HttpUser):
    # Keine Pausen, um das Limit sofort zu sprengen
    wait_time = constant(0)

    @task
    def hammering(self):
        with self.client.get("/", verify=False, catch_response=True) as r:
            # Hier ist 429 das Ziel!
            if r.status_code == 429:
                r.success()
            elif r.status_code == 200:
                # Wir markieren 200 als Fehler, weil wir das Limit TESTEN wollen
                # In einem echten Monitoring wäre das natürlich ein Erfolg.
                r.failure("Limit noch nicht erreicht (200 OK)")
            else:
                r.failure(f"Unerwarteter Status: {r.status_code}")


# Korrigierter Event-Handler für den Teststart
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("--- Starte WAF & Rate-Limit Belastungstest ---")
