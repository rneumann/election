# 🗳️ Dockerized Election-Stack Setup

Diese README fasst die Startprozedur und die Komponenten des gesamten Docker Compose Stacks zusammen. Für detaillierte Konfigurationsanweisungen verweisen wir auf die jeweiligen Unterverzeichnisse.

Die gesamte Anwendung wird über die zentrale Datei **`compose.yml`** im Include-Verfahren gestartet.

## 🛠️ 0. Prerequisites

- Docker >= 20.10
- Docker Compose >= 1.29

---

## Informationen zur Anwendung

Das Frontend läuft über einen Nginx Docker-Container. Um eine erhöte Sicherheit zu garantieren wird eine Web-Applicatio-Firewall (WAF) verwendet. Dieser schaltet die Anfragen an den Nginx-Container weiter. Der WAF (<https://github.com/coreruleset/modsecurity-crs-docker>) ist ein Open Source Web Application Firewall (WAF) basierend auf der OWASP-CRS.
Die Architektur hat die folgenden Komponenten:
Client (Browser) -> Nginx -> WAF -> Nginx -> Frontend (React) -> Backend (Node.js)

---

## 🚀 1. Übersicht & Architektur

Der Stack besteht aus mehreren modularen Diensten, die über dedizierte Docker-Netzwerke (`frontend_net`, `backend_net`, `admin_net`) miteinander verbunden sind.

| Service        | Rolle                                                 | Netzwerk       | Detail-Anleitung                         |
| :------------- | :---------------------------------------------------- | :------------- | :--------------------------------------- |
| **`frontend`** | Web-Interface (React)                                 | `frontend_net` | [frontend/README.md](frontend/README.md) |
| **`waf`**      | Web Application Firewall (ModSecurity), Reverse Proxy | `frontend_net` | [waf/compose.yml](waf/compose.yml)       |
| **`backend`**  | API & Geschäftslogik (Node.js)                        | `backend_net`  | [backend/README.md](backend/README.md)   |
| **`postgres`** | Datenbank (PostgreSQL) & pgAdmin                      | `backend_net`  | [postgres/README.md](postgres/README.md) |
| **`keycloak`** | Identity Management (OIDC)                            | `backend_net`  | [keycloak/README.md](keycloak/README.md) |
| **`ldap`**     | Test-Verzeichnisdienst (OpenLDAP)                     | `backend_net`  | [ldap/README.md](ldap/README.md)         |

---

## 🛠️ 2. Einmaliges Setup (Vorbereitung)

Vor dem ersten Start müssen einige Artefakte erstellt werden. Führen Sie diese Schritte **im Hauptverzeichnis** (`compose/`) aus.

## Start

- Vorausgesetzt das alle einzelnen Requirements erfuellt sind, kann die Anwendung jetzt gestartet werden.

```bash
- cd /backend/.extras/compose
+ docker compose up   #starten des docker containers
- docker compose down #stoppen des docker containers
```
