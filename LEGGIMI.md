# Aggiornamento completo (sostituisce tutti gli ZIP precedenti)

Contiene: Visite in beta, Misurati da casa in beta, riduzione dello spazio del database, icona e colori verde/nero,
proporzioni più compatte sul telefono, i tasti per tornare indietro da Beta e Spazio e la nuova sezione Dieta
(database alimenti, ricerca CREA, piano alimentare, PDF, alternative e calcolatore nell'app atleta).
Nessun dato viene cancellato o modificato in automatico.

## File da caricare (stessi percorsi della repo, UN SOLO commit)

| File | Stato |
|---|---|
| `backend/server.py` | modificato |
| `backend/nutrition.py` | **NUOVO** |
| `backend/assets/lc-logo.png` | **NUOVO** (cartella nuova) |
| `frontend/public/index.html` | modificato |
| `frontend/public/manifest.json` | modificato |
| `frontend/public/service-worker.js` | modificato |
| `frontend/public/favicon.svg` | **NUOVO** |
| `frontend/public/favicon-light.svg` | **NUOVO** |
| `frontend/public/favicon-dark.svg` | **NUOVO** |
| `frontend/public/favicon.ico` | **NUOVO** |
| `frontend/public/apple-touch-icon.png` | **NUOVO** |
| `frontend/public/icon-192.png` | **NUOVO** |
| `frontend/public/icon-512.png` | **NUOVO** |
| `frontend/public/icon-maskable-512.png` | **NUOVO** |
| `frontend/public/logo-light.png` | **NUOVO** |
| `frontend/public/logo-dark.png` | **NUOVO** |
| `frontend/public/mediapipe/pose/` (10 file + LEGGIMI.txt) | **NUOVA cartella** |
| `frontend/src/index.css` | modificato |
| `frontend/src/App.js` | modificato |
| `frontend/src/api/index.js` | modificato |
| `frontend/src/pages/LoginPage.js` | modificato |
| `frontend/src/pages/admin/AdminDashboard.js` | modificato |
| `frontend/src/pages/admin/AthleteManagement.js` | modificato |
| `frontend/src/pages/athlete/AthleteDashboard.js` | modificato |
| `frontend/src/pages/athlete/AthletePhotos.js` | modificato |
| `frontend/src/pages/athlete/AthleteVideos.js` | modificato |
| `frontend/src/components/StoragePanel.js` | **NUOVO** |
| `frontend/src/components/BrandLogo.js` | **NUOVO** |
| `frontend/src/components/SelfMeasure.js` | **NUOVO** |
| `frontend/src/components/VisitsAdmin.js` | **NUOVO** |
| `frontend/src/components/VisitsAthlete.js` | **NUOVO** |
| `frontend/src/lib/media.js` | **NUOVO** |
| `frontend/src/lib/visits.js` | **NUOVO** |
| `frontend/src/lib/bodyMeasure.js` | **NUOVO** |
| `frontend/src/lib/foods.js` | **NUOVO** |
| `frontend/src/components/FoodDatabase.js` | **NUOVO** |
| `frontend/src/components/FoodPicker.js` | **NUOVO** |
| `frontend/src/components/DietPlanEditor.js` | **NUOVO** |
| `frontend/src/components/DietPlanAthlete.js` | **NUOVO** |

Non toccare `AthleteChecks.js`: resta quello che hai. Non serve installare niente (Pillow, httpx e reportlab sono già nel requirements.txt).
Su GitHub: **Add file → Upload files**, trascina le cartelle `backend` e `frontend` di questo ZIP, un solo commit.

## Cosa trovi
- **Dashboard admin**: schede Atleti · Alimenti · Esercizi · Beta · Spazio su una riga. Da Esercizi, Beta e Spazio torni alla lista con
  "← Torna agli atleti" oppure con il tasto Indietro del telefono.
- **Spazio**: foto e video nuovi ridotti sul telefono; pulsanti per alleggerire le foto vecchie, scaricare/eliminare i video
  condivisi che scegli tu, togliere il vecchio PDF dieta nascosto. I video privati degli atleti non si toccano.
- **Beta Visite** e **Beta Misurati da casa**: le attivi tu, atleta per atleta (di base nessuno).
- **Grafica**: icona LC con manubrio e rami verdi, palette verde/nero chiara e scura, schermate più compatte sul telefono.
  Su iPhone la pagina non resta più ingrandita dopo aver toccato un campo di testo.
- L'icona nella scheda del browser segue il tema: chiara in modalità chiara, scura in modalità scura.
- L'icona della schermata Home è quella scura (iPhone e Android non permettono di cambiarla col tema).
  Su iPhone compare dopo aver tolto e riaggiunto l'app alla schermata Home.
- **Dieta**: database alimenti come Notion (import CSV da Notion, ricerca sul sito CREA), piano alimentare a giorni e pasti
  con calcolo automatico, modalità "Solo macro", alternative a pari macro, PDF inviato all'atleta. L'atleta vede il piano
  solo quando premi "Invia all'atleta"; nell'app tocca un alimento per le alternative e usa il calcolatore delle porzioni.
- **Check e visite**: il coach può eliminare i check peso/altezza dalla scheda Check; eliminare le visite ora funziona
  anche con i dati delle versioni precedenti e, se qualcosa va storto, il messaggio dice il motivo.
