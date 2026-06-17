# Branding

Place client-specific branding here. `build.sh` picks everything up automatically.

## Files

| File | Required | Description |
|---|---|---|
| `theme.json` | yes | Colors, texts, institution name — see structure below |
| `logo.svg` | no | Logo shown in the header (SVG preferred, max ~200 × 60 px) |
| `favicon.ico` | no | Browser tab icon |

## theme.json structure

```jsonc
{
  "institution": {
    "name": "HKA",           // short name shown in header
    "fullName": "Hochschule Karlsruhe"
  },
  "colors": {
    "primary":   "#e20000",  // header background, buttons, accents
    "secondary": "#E2001A",
    "accent":    "#E2001A",
    "dark":      "#333333",  // body text
    "gray":      "#666666",  // secondary text
    "lightGray": "#F5F5F5"   // page background
  },
  "text": {
    "appTitle":            "Wahlsystem",
    "loginSubtitle":       "Bitte melden Sie sich mit Ihren Anmeldedaten an",
    "welcomeTitle":        "Willkommen im Wahlsystem",
    "welcomeSubtitle":     "BSI-konformes Online-Wahlsystem",
    "checkVote":           "Ihre Auswahl zur Kontrolle",
    "confirmationInvalid": "Ihr Stimmzettel wird ungültig abgegeben!",
    "confirmVote":         "Abstimmung bestätigen",
    "checkBoxConfirm":     "Ich möchte meinen Stimmzettel ungültig abgeben!",
    "auditSearch":         "Suche (Aktion, Akteur, ID)..."
  },
  "roles": {
    "admin":     "Administrator",
    "committee": "Wahlausschuss",
    "voter":     "Wähler"
  },
  "placeholders": {
    "loginUsername": "Ihr Benutzername",
    "loginPassword": "Ihr Passwort"
  }
}
```

## How it works

`build.sh` copies `theme.json` into each frontend's `config/` directory before building
and passes `--build-arg CONFIG_PROFILE=client` so Vite picks it up at compile time.
Tailwind CSS class names are generated from the colors at build time — no runtime CSS
variables are needed.

Logo and favicon are copied into the frontend's `public/` directory, so they are served
as static files by nginx.
