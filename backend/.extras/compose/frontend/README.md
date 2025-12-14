# Frontend Dockerized starten

## Anleitung Dockerized Setup

```text
- In ./frontend das Frontend-Image basierend auf dem Dockerfile bauen:
    - docker build -t frontend_image .

- FAKE CERTS erzeugen:
  In ./backend/.extras/compose/waf die Certs erzeugen:
    - mkdir certs
    - openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout dev.key -out dev.crt -subj "/CN=wahlenwahl-local"
    !!! Sicherstellen das in der gitignore !!!

- Logfiles erzeugen:
    - mkdir tmp # Logfiles erzeugen
    - touch tmp/host-fs-auditlog.log
    - touch tmp/host-fs-errorlog.log
```
