"""
Lasttest: Parallele Wähler (Simulate Mode)
==========================================
Simuliert echte Wähler, die sich einloggen und zufällig abstimmen.
Der Simulationsmodus muss im Admin-Bereich (*Wahlen testen*) aktiv sein –
Passwörter werden dann nicht geprüft.

Jeder Wähler kommt genau einmal dran (Queue). Sind alle abgearbeitet,
beendet sich der Test automatisch.

Voraussetzungen
---------------
* Simulationsmodus ist im Admin-Bereich aktiviert
* Wähler sind im Wählerverzeichnis eingetragen

Starten (2 parallele User, alle Wähler einmal):

    docker run --rm \\
      -v $(pwd)/backend/.extras/compose/locust:/mnt/locust \\
      --network host \\
      locustio/locust \\
      -f /mnt/locust/locustfile_voting.py \\
      --host http://localhost:8081 \\
      --users 2 --spawn-rate 2 \\
      --headless --only-summary

Kein --run-time nötig: der Test endet sobald die Queue leer ist.
"""

import queue
import random
import urllib3
import requests
from locust import HttpUser, task, between, events

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------------------------------------------------------------------
# Thread-sichere Queue — wird beim Teststart mit allen Wähler-UIDs befüllt
# ---------------------------------------------------------------------------

_voter_queue: queue.Queue[str] = queue.Queue()


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    host = environment.host or "http://localhost"
    try:
        resp = requests.get(f"{host}/api/simulate/voters", verify=False, timeout=10)
        if resp.status_code == 403:
            print("[FEHLER] Simulationsmodus ist nicht aktiv. Bitte im Admin-Bereich unter 'Wahlen testen' aktivieren.")
            environment.runner.quit()
            return
        resp.raise_for_status()
        uids = [v["uid"] for v in resp.json()]
        for uid in uids:
            _voter_queue.put(uid)
        print(f"[INFO] {_voter_queue.qsize()} Wähler in Queue geladen.")
    except Exception as e:
        print(f"[FEHLER] Wähler konnten nicht geladen werden: {e}")
        environment.runner.quit()


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------


def _random_vote(candidates: list, votes_per_ballot: int, max_cumulative: int) -> list:
    """
    Verteilt ``votes_per_ballot`` Stimmen zufällig auf die übergebenen Kandidaten.
    Kein Kandidat erhält mehr als ``max_cumulative`` Stimmen.
    """
    if not candidates or votes_per_ballot <= 0:
        return []

    pool = random.sample(candidates, k=random.randint(1, len(candidates)))
    budget = votes_per_ballot
    allocation: dict[int, int] = {}

    for cand in pool:
        if budget <= 0:
            break
        cap = min(max_cumulative if max_cumulative > 0 else budget, budget)
        votes = random.randint(1, cap)
        allocation[cand["listnum"]] = votes
        budget -= votes

    return [{"listnum": ln, "votes": v} for ln, v in allocation.items()]


# ---------------------------------------------------------------------------
# Locust User
# ---------------------------------------------------------------------------


class VoterUser(HttpUser):
    """
    Ein virtueller Wähler: holt eine UID aus der Queue, loggt sich ein,
    stimmt ab, und beendet sich. Wenn die Queue leer ist, stoppt der Test.
    """

    wait_time = between(0.5, 2.0)

    def on_start(self):
        self.voter_uid = None
        self.csrf_token = None
        self._next_voter()

    # ------------------------------------------------------------------ Queue

    def _next_voter(self):
        """Nächste UID aus der Queue holen und einloggen."""
        try:
            uid = _voter_queue.get_nowait()
        except queue.Empty:
            # Queue leer → Test beenden
            print("[INFO] Alle Wähler abgearbeitet – Test wird beendet.")
            self.environment.runner.quit()
            return
        self._login(uid)

    # ------------------------------------------------------------------ Auth

    def _login(self, uid: str):
        with self.client.post(
            "/api/auth/login/ldap",
            json={"username": uid, "password": "simulate"},
            verify=False,
            catch_response=True,
            name="/api/auth/login/ldap",
        ) as resp:
            if resp.status_code == 200:
                self.voter_uid = uid
                self.csrf_token = resp.json().get("csrfToken")
                resp.success()
            else:
                resp.failure(f"Login fehlgeschlagen ({resp.status_code})")
                # Wähler übersprungen, nächsten holen
                self._next_voter()

    # ------------------------------------------------------------------ Task

    @task
    def vote_in_active_elections(self):
        if not self.voter_uid:
            return

        # 1. Aktive + Testwahlen abrufen
        elections = []
        for status in ("active", "test"):
            with self.client.get(
                f"/api/voter/{self.voter_uid}/elections",
                params={"status": status, "alreadyVoted": "false"},
                verify=False,
                catch_response=True,
                name="/api/voter/{uid}/elections",
            ) as resp:
                if resp.status_code == 401:
                    resp.failure("Session abgelaufen")
                    self._next_voter()
                    return
                if resp.status_code == 200:
                    elections.extend(resp.json())
                    resp.success()
                else:
                    resp.failure(f"Wahlen laden fehlgeschlagen ({resp.status_code})")
                    return

        # Duplikate entfernen
        seen: set[str] = set()
        elections = [e for e in elections if not (e["id"] in seen or seen.add(e["id"]))]

        if not elections:
            # Keine Wahlen für diesen Wähler → nächsten holen
            self._next_voter()
            return

        election = random.choice(elections)
        election_id = election["id"]

        # 2. Kandidaten laden
        with self.client.get(
            f"/api/voter/elections/{election_id}",
            verify=False,
            catch_response=True,
            name="/api/voter/elections/{id}",
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"Kandidaten laden fehlgeschlagen ({resp.status_code})")
                return
            election_detail = resp.json()
            resp.success()

        candidates = election_detail.get("candidates", [])
        votes_per_ballot = election_detail.get("votes_per_ballot", 1)
        max_cumulative = election_detail.get("max_cumulative_votes", 1)

        if not candidates:
            self._next_voter()
            return

        vote_decision = _random_vote(candidates, votes_per_ballot, max_cumulative)
        if not vote_decision:
            self._next_voter()
            return

        # 3. Stimmzettel abgeben
        with self.client.post(
            f"/api/voter/{self.voter_uid}/ballot",
            json={"electionId": election_id, "valid": True, "voteDecision": vote_decision},
            headers={"X-CSRF-Token": self.csrf_token or ""},
            verify=False,
            catch_response=True,
            name="/api/voter/{uid}/ballot",
        ) as resp:
            if resp.status_code == 201:
                resp.success()
            elif resp.status_code == 409:
                resp.success()  # bereits gewählt – ok
            elif resp.status_code == 401:
                resp.failure("Session abgelaufen")
            else:
                resp.failure(f"Stimmabgabe fehlgeschlagen ({resp.status_code}): {resp.text[:120]}")

        # Wähler abgearbeitet → nächsten aus der Queue holen
        self._next_voter()
