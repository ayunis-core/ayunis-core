# Ayunis Core — Outlook Add-in (Prototyp)

Prototyp zu [AYC-510](https://linear.app/ayunis/issue/AYC-510/outlook-add-in-email-forwarding-and-ai-assisted-reply).
Technische Einordnung: [`_docs/AYC-510--outlook-add-in/technical-spec.md`](../_docs/AYC-510--outlook-add-in/technical-spec.md).

Das Add-in bringt **kein eigenes Interface mit**. Outlook lädt die bestehende Ayunis-Core-Oberfläche
unter `/chat?embedded=1` — dieselben Komponenten wie im Browser, nur ohne `AppSidebar`. Der
Ordner hier enthält nur das Manifest, den Dev-Server und die Icons.

Bewusst nicht Teil des pnpm-Workspace — eigenes `node_modules`, damit Lockfile, CI und
Pre-Commit-Hooks des Monorepos unberührt bleiben.

## Wie `embedded` funktioniert

`EmbeddedContextProvider` (`ayunis-core-frontend/src/shared/contexts/embedded/`) liest beim Start
`?embedded=1`, merkt sich das in `sessionStorage` und stellt es als Context bereit. `AppLayout`
lässt daraufhin die Sidebar weg. Das Flag überlebt Navigation innerhalb der Pane und gilt nur für
diesen Tab bzw. Frame.

## Der Dev-Server

`server.mjs` ist ein HTTPS-Reverse-Proxy auf Port 3050:

| Pfad | Ziel |
| --- | --- |
| `/api/*` | Backend (`http://localhost:3030`) |
| `/addin/*` | Manifest-Assets aus diesem Ordner |
| alles andere | Frontend-Dev-Server (`http://localhost:3031`) |

Der Grund für den Proxy: App und API liegen dadurch auf **einer** Origin, die Session-Cookies
bleiben First-Party und CORS entfällt. Ohne das würde die Anmeldung in der Pane scheitern.

Ports über `PORT`, `FRONTEND_ORIGIN`, `BACKEND_ORIGIN` anpassbar.

## Starten

Backend und Frontend müssen laufen (Slot 3: Backend 3030, Frontend 3031). Dann einmalig das
Dev-Zertifikat installieren — Outlook lädt Add-ins nur über HTTPS, und in einem iframe lässt sich
eine Zertifikatswarnung nicht wegklicken:

```bash
cd ayunis-core-outlook-addin && npx office-addin-dev-certs install
```

Danach:

```bash
cd ayunis-core-outlook-addin && npm install && npm start
```

Die Pane liegt dann auf `https://localhost:3050/chat?embedded=1` — im Browser aufrufbar, um sie
ohne Outlook anzusehen.

## In Outlook laden (Sideloading)

1. Outlook im Browser öffnen, eine E-Mail anklicken.
2. Im Menüband auf das Apps-Symbol → **Add-ins abrufen**.
3. Links **Meine Add-Ins** → **Benutzerdefiniertes Add-In** → **Aus Datei hinzufügen**.
4. `manifest.xml` aus diesem Ordner wählen und die Warnung bestätigen.
5. Button **Ayunis Core** erscheint im Menüband bzw. unter **Apps**.

Der Store-Dialog läuft in einem fremden iframe und lässt sich nicht automatisieren — diese
Schritte bleiben Handarbeit.

Sideloading braucht ein Exchange- oder Microsoft-365-Postfach. Auf Outlook für Mac ist der
manuelle Upload inzwischen entfernt; „Add-Ins abrufen" öffnet dort nur noch AppSource.

## Dateien

| Datei | Zweck |
| --- | --- |
| `manifest.xml` | Add-in-only-Manifest (XML) — deckt Exchange Online **und** On-Prem ab |
| `server.mjs` | HTTPS-Reverse-Proxy auf Port 3050 |
| `addin/commands.html` | Function File, vom Manifest verlangt |
| `addin/assets/` | Icons fürs Menüband |
