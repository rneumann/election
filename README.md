# 🗳️ Online-Wahlsystem HKA

## Überblick

Das Projekt **Online-Wahlsystem für die Hochschule Karlsruhe (HKA)** dient der Entwicklung einer sicheren, BSI-konformen Plattform zur Durchführung hochschulinterner Wahlen (nicht-politische E-Wahlen).

Die Plattform wird **modular**, **dockerized** und **open-source** bereitgestellt, sodass sie auch an anderen Hochschulen eingesetzt werden kann.

---

## 🏛️ Wahlarten an der HKA

Laut Wahlsystematik der Hochschule umfasst das System folgende Wahlarten:

...

Diese Wahlarten unterscheiden sich in:

- Wählergruppen (Studierende, Mitarbeitende)
- Wahlmodus (Direktwahl, Listenwahl)
- Auszählungslogik (nach Satzung und Wahlordnung)

---

## 🧩 Systemarchitektur

- **Backend:** Node.js + PostgreSQL
- **Frontend:** React + TailwindCSS (responsive Web-App)
- **Containerisierung:** Docker
- **Umgebungen:** Entwicklung / Produktion

---

## ⚙️ Funktionale Kernmodule

| Modul                    | Beschreibung                                             |
| ------------------------ | -------------------------------------------------------- |
| **Benutzermanagement**   | Authentifizierung, Rollen- und Rechteverwaltung          |
| **Wahlverwaltung**       | Erstellung, Konfiguration und Terminierung von Wahlen    |
| **Kandidatenmanagement** | Verwaltung von Listen und Einzelkandidaturen             |
| **Stimmabgabe**          | Verschlüsselte, verifizierbare Online-Stimmabgabe        |
| **Auswertung**           | Automatisierte und nachvollziehbare Auszählung           |
| **Audit & Logging**      | Nachvollziehbarkeit, Integrität und Export der Wahldaten |
| **Testmodus**            | Simulierte Wahlumgebung zu Prüf- und Demo-Zwecken        |

---

## 🧠 Compliance und Konformität

- **BSI-CC-PP-0121:** Schutzprofil für nicht-politische E-Wahlen
- **DSGVO-Konformität:** Verarbeitung personenbezogener Daten nur zweckgebunden
- **Nachvollziehbarkeit:** Protokollierung aller sicherheitsrelevanten Ereignisse
- **Barrierefreiheit:** Nutzung durch alle Wählergruppen

---

## Deployment
