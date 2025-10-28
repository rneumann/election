1. Terminal starten
2. cd /deinOrdner/.extras/compose/postgres
3. docker compose up --profile dev | docker compose up --profile prod
4. in einem Webbrowser deiner Wahl localhost:8080
5. Email Passwort aus der .pgadmin.env entnehmen
6. Rechtsklick auf Server und "register" drücken
7. Name ist egal
8. Unter Connection: Host name: postgres;
                     Port: 5432
                     Maintainance DB: postgres
                     Username: election