# LDAP Test Container Setup

Dieses Projekt richtet einen **OpenLDAP-Testserver** mit **phpLDAPadmin** als Web-Oberfläche ein. Es eignet sich für Entwicklung, Test und Lernzwecke, um LDAP-Benutzer, Gruppen und Authentifizierung zu testen.

---

## Voraussetzungen

- Docker ≥ 20.10
- Docker Compose ≥ 1.29

---

## Projektstruktur

```text
.
├── docker-compose.yml     # Definition der Container
├── .env                   # Umgebungsvariablen für LDAP
├── .env.ui                # Umgebungsvariablen für phpLDAPadmin
└── README.md
```

## Umgebungsvariablen

### .env – LDAP-Server

```bash
LDAP_ORGANISATION="ADS Hochschule Karlsruhe"   # Name der Organisation
LDAP_DOMAIN="ads.hs-karlsruhe.de"              # Domain, wird als Base-DN genutzt
LDAP_ADMIN_PASSWORD="p"                        # Passwort für LDAP-Admin
LDAP_TLS=false                                 # true für TLS, false für Klartext
```

```text
Erklärung:

LDAP_ORGANISATION – Wird beim Setup als o=... verwendet.

LDAP_DOMAIN – Legt die Base-DN für die Directory-Struktur fest.
Beispiel: ads.hs-karlsruhe.de → Base-DN: dc=ads,dc=hs-karlsruhe,dc=de

LDAP_ADMIN_PASSWORD – Admin-Passwort für cn=admin,<Base-DN>

LDAP_TLS – Ob LDAP über TLS läuft. Für Tests false empfohlen.
```

### .env.ui – phpLDAPadmin

```bash
PHPLDAPADMIN_LDAP_HOSTS="ldap"
PHPLDAPADMIN_HTTPS=false
PHPLDAPADMIN_LOGIN_DN="cn=admin,dc=ads,dc=hs-karlsruhe,dc=de"
PHPLDAPADMIN_LDAP_ADMIN_PASSWORD="p"
PHPLDAPADMIN_HTTPS_PORT=6443
```

```text
Erklärung:

PHPLDAPADMIN_LDAP_HOSTS – Hostname des LDAP-Servers im Docker-Netzwerk (ldap).

PHPLDAPADMIN_HTTPS – Ob HTTPS aktiviert werden soll. Für Tests false ist einfacher.

PHPLDAPADMIN_LOGIN_DN – DN des Admins zum Login in phpLDAPadmin.

PHPLDAPADMIN_LDAP_ADMIN_PASSWORD – Passwort des Admins (muss identisch mit LDAP_Admin_Password sein).
```

## Server-Start

```bash
+ docker compose up   #starten des docker containers
- docker compose down #stoppen des docker containers
```

## phpLDAPadmin

```text
nache dem Login in LDAP im Browser:
http://localhost:6443/
solltenfolgende Schritte ausgeführt werden:
  - Oben Links gibt es einen reiter import, dort kann man zuerst die ou.ldif datei hochladen um das grundgerueste setup zu erzeugen.
  - Dann kann man die users.ldif datei hochladen um die normalen LDAP-Benutzer zu erstellen.
  - jetzt sollte man auf jeden angelegten user und das passwort updaten. Z.B. p eintragen auf updaten klicken und dann commiten.
  jetzt kann man sich anmelden, mit der uid und dem passwort.
```
