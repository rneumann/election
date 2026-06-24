# Security Policy

## Unterstützte Versionen

Sicherheitsupdates werden ausschließlich für den aktuellen `main`-Branch bereitgestellt.

| Branch | Unterstützt |
|--------|-------------|
| `main` | ✓           |
| Ältere | ✗           |

---

## Sicherheitslücke melden

**Bitte öffne für Sicherheitslücken KEIN öffentliches GitHub-Issue.**

Da es sich um ein Wahlsystem handelt, ist vertrauliche Behandlung besonders wichtig.

### Meldeweg

Sende eine E-Mail an: **rainer.neumann@h-ka.de**

Bitte füge folgende Informationen bei:

- Beschreibung der Schwachstelle und mögliche Auswirkungen
- Betroffene Komponente (Backend, Frontend, Admin-Frontend, Keycloak-Integration, …)
- Schritte zur Reproduktion
- Falls vorhanden: Proof-of-Concept oder Screenshots

### Reaktionszeit

| Schritt | Ziel |
|---|---|
| Eingangsbestätigung | innerhalb von 3 Werktagen |
| Erstbewertung (CVSS) | innerhalb von 7 Werktagen |
| Patch / Workaround | je nach Schwere, i.d.R. ≤ 30 Tage |

---

## Sicherheitsarchitektur (Überblick)

Das System richtet sich nach dem BSI-Schutzprofil **CC-PP-0121** (nicht-politische E-Wahlen) und berücksichtigt:

- **Authentifizierung:** SAML 2.0 / Keycloak mit LDAP-Anbindung
- **Autorisierung:** Rollenbasiert (Wählende / Wahlvorstand / Admin)
- **Transport:** TLS für alle externen Verbindungen (WAF vorgelagert)
- **Datensparsamkeit:** Keine dauerhafte Speicherung von Wahlentscheidungen mit Personenbezug
- **Logging:** Protokollierung sicherheitsrelevanter Ereignisse (ohne Wahlgeheimnis zu verletzen)
- **Containerisierung:** Docker-Isolation; Produktivbetrieb hinter Reverse Proxy / WAF

---

## Bekannte Risikobereiche (für Prüfer / Auditoren)

- LDAP-Abfragen → Eingabevalidierung beachten
- Export-Routen (`/api/export`) → nur für authentifizierte Admins erreichbar
- Umgebungsvariablen / Secrets → nicht im Repository, nur über `.env`-Dateien

---

## Responsible Disclosure

Wir folgen dem Prinzip der **koordinierten Offenlegung**: Sicherheitslücken werden erst nach Verfügbarkeit eines Patches oder Workarounds veröffentlicht. Meldende Personen werden auf Wunsch in den Release-Notes erwähnt.
