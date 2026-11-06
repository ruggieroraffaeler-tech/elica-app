# Elica

App per imparare a programmare 10–15 minuti al giorno, con un occhio alla bioinformatica.
Funziona su telefono, iPad e PC, anche offline, e si aggiorna da sola quando pubblichi una nuova versione.

**Corsi:** Python (allineato alle 10 settimane di CS50P), Palestra della logica, Python × Bio, R, Bash, Git e il percorso Progetto: una pipeline per confrontare due genomi batterici.

---

## 1. Usarla subito (PC)

- Doppio clic su `index.html`, oppure su `dist/elica-portable.html` (tutta l’app in un solo file).
- I progressi restano salvati nel browser di quel computer.

## 2. Installarla su iPad, telefono e PC (consigliato)

Per installarla serve un indirizzo web. Il modo più semplice e gratuito è **GitHub Pages**, e non serve ancora saper usare Git:

1. Crea un account su [github.com](https://github.com).
2. In alto a destra: **+ → New repository**. Nome: `elica`. Visibilità: **Public** (GitHub Pages gratuito richiede una repository pubblica). Clicca **Create repository**.
3. Nella pagina della repository: **Add file → Upload files**. Trascina **il contenuto** della cartella `elica` (non la cartella stessa), poi **Commit changes**.
4. **Settings → Pages**. In “Build and deployment” scegli **Deploy from a branch**, branch **main**, cartella **/ (root)**, poi **Save**.
5. Dopo un minuto l’app è online su `https://TUONOME.github.io/elica/`.

Poi installala su ogni dispositivo:

- **iPhone e iPad:** apri il link in Safari → Condividi → **Aggiungi alla schermata Home**.
- **Android:** apri il link in Chrome → menu → **Installa app**.
- **PC e Mac:** apri il link in Chrome o Edge → icona **Installa** nella barra degli indirizzi.

Dopo la prima apertura funziona anche senza internet. Il Lab Python richiede internet solo la prima volta che lo usi.

### Chi può vedere cosa

- **L’app e il suo codice sono pubblici.** Con l’account gratuito, GitHub Pages richiede una repository pubblica, e il sito è raggiungibile da chiunque abbia il link. La pagina chiede ai motori di ricerca di non indicizzarla (`noindex`), ma questo non la rende privata.
- **I tuoi progressi no:** restano nel browser di ogni dispositivo. Non vengono inviati da nessuna parte, tranne al Gist se attivi la sincronizzazione.
- **Per un’app accessibile solo a te** si può pubblicare con Cloudflare Pages e proteggerla con Cloudflare Access, gratuito fino a 50 utenti, con accesso tramite email.

## 3. Progressi su più dispositivi

Ogni dispositivo salva i propri progressi. Per portarli altrove hai due strade, dalla pagina **Profilo**:

- **Backup manuale:** “Scarica backup” (o “Copia codice”) e poi, sull’altro dispositivo, “Ripristina da file o codice”. Il ripristino **unisce** i progressi, non li sovrascrive.
- **Sincronizzazione automatica con GitHub:** i progressi vengono salvati in un *Gist segreto* del tuo account, senza server né database. Un Gist segreto non compare nelle ricerche né sul profilo, ma **non è privato**: chi conosce il link può aprirlo. Contiene solo i progressi (XP, lezioni fatte, errori), mai il token.
  1. Su GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**.
  2. Spunta **solo** il permesso `gist`, scegli una scadenza e genera il token.
  3. In Elica → Profilo → incolla il token → **Collega e sincronizza**. Ripeti con lo stesso token sugli altri dispositivi.

  L’app si sincronizza all’apertura e alla fine di ogni lezione. Il token resta solo sul dispositivo e non finisce nei backup né nel Gist.

## 4. Aggiornare l’app

Quando modifichi o aggiungi contenuti:

```bash
node tools/check.js        # controlla che gli esercizi siano scritti bene
# in js/version.js: alza APP_VERSION e aggiungi una voce in cima a CHANGELOG
python3 tools/build.py     # aggiorna sw.js e crea dist/elica-portable.html
git add .
git commit -m "Aggiunge la lezione X"
git push
```

Su ogni dispositivo comparirà l’avviso **“È disponibile una nuova versione → Aggiorna”**, poi la finestra delle novità. I progressi non si perdono: ogni esercizio ha una chiave stabile e lo stato salvato ha un numero di versione con migrazione automatica.

> Senza Git puoi anche ricaricare i file modificati con **Add file → Upload files**. Ricordati comunque di lanciare prima `tools/build.py`.

## 5. Struttura

```
index.html              pagina dell'app
manifest.webmanifest    nome, icone e colori per l'installazione
sw.js                   offline e aggiornamenti (generato in parte da tools/build.py)
css/style.css           grafica
js/core.js              registro dei corsi
js/version.js           versione e novità
js/app.js               motore: percorso, sessione, lezioni, sfide, ripasso, Lab, profilo, sync
js/pyharness.js         correttore delle sfide (generato da tools/build.py)
content/NN-nome.js      un file per corso (NN = ordine)
fonts/                  Geist e Geist Mono (licenza OFL)
icons/                  icone dell'app
tools/check.js          controllo dei contenuti (esegue anche le sfide con tools/check_sfide.py)
tools/harness.py        correttore delle sfide (gira nel browser; copiato in js/pyharness.js da build.py)
tools/build.py          preparazione per la pubblicazione
```

## 6. Scrivere contenuti

Ogni file in `content/` chiama `ELICA.addCourse({...})`. Per aggiungere un corso nuovo crea il file e aggiungilo in `index.html` prima di `js/version.js`.

```js
ELICA.addCourse({
  id: 'sql', order: 80, name: 'SQL', lang: 'sql',
  tag: 'Descrizione breve del corso.',
  req: { lesson: 'p6b', label: 'Python fino alla Settimana 6' },   // facoltativo: blocca il corso
  units: [
    { title: 'Le basi', lessons: [
      { id: 'q1', title: 'SELECT', sub: 'Leggere una tabella', ex: [ /* esercizi */ ] }
    ]}
  ]
});
```

Gli `id` delle lezioni devono essere unici e **non vanno mai cambiati**, perché i progressi sono legati a loro. Puoi aggiungere esercizi in fondo alle lezioni esistenti senza problemi.

**Tipi di esercizio**, tutti con `why`, la spiegazione mostrata dopo la risposta (tranne `info`):

| tipo | campi | cosa fa |
|---|---|---|
| `info` | `title`, `text`, `points`?, `code`?, `note`?, `cpp`? | scheda di teoria: nel testo una riga vuota separa i paragrafi, `` `codice` `` e `**grassetto**` sono formattati; `points` è un elenco puntato, `note` un riquadro “Attenzione”, `cpp` un riquadro “Se vieni dal C++” |
| `mc` | `q`, `code`?, `opts`, `a` (indice), `mono`? | scelta multipla |
| `fill` | `q`, `code` con `___`, `bank`, `ans` | completa gli spazi toccando i pezzi |
| `order` | `q`, `lines` (in ordine giusto) | riordina le righe |
| `type` | `q`, `code`?, `ans` (lista di risposte accettate) | scrivi la risposta; spazi e a capo non contano |
| `bug` | `q`, `lines`, `bad` (indice) | tocca la riga sbagliata |
| `code` | `q`, `text`, `points`?, `mode`, `starter`, `hints`, `solution` + i campi della modalità | sfida di codice con correttore automatico (solo nelle lezioni `kind: 'sfida'`) |
| `task` | `q`, `text`, `code`? (comandi da copiare), `points`?, `ans` (lista), `multiline`?, `hints`, `solution` | missione da svolgere sul proprio computer: si incolla il risultato |

Nelle stringhe di codice usa `\n` per andare a capo e `\\n` per mostrare un `\n` letterale.

**Sfide e missioni.** Una lezione con `kind: 'sfida'` non blocca il percorso, non consuma vite e si apre quando sono finite le lezioni che la precedono. Le modalità del correttore (`code`), eseguito da `tools/harness.py` dentro Python nel browser:

| `mode` | campi | cosa controlla |
|---|---|---|
| `func` | `func`, `tests: [{ call, expect | raises, desc?, files? }]`, `files`? | chiama la funzione dell’utente: `call` ed `expect` sono espressioni Python; `raises` è il nome di un’eccezione attesa |
| `io` | `tests: [{ stdin?, argv?, out, desc? }]` | esegue il programma intero con l’input e gli argomenti dati e confronta l’output riga per riga |
| `tests` | `module`, `impl`, `mutants: [{ desc, code }]`, `min_tests` | l’utente scrive le funzioni `test_…`; devono passare su `impl` e fallire su ogni versione in `mutants` |

`node tools/check.js` esegue ogni sfida con Python 3, se installato: la soluzione deve superare tutti i test, il codice iniziale (`starter`) no. Con `--no-python` salta questo passaggio.

**Regola d’oro:** ogni esercizio deve poter essere risolto con le schede di teoria che lo precedono, nella stessa lezione o in quelle prima. Metti la scheda subito prima del primo esercizio che usa quel concetto.

## 7. Scorciatoie (PC e iPad con tastiera)

`1`–`9` scelgono l’opzione, `Invio` verifica e prosegue, `Esc` chiude la lezione. Nel Lab: `Ctrl/⌘ + Invio` esegue il codice.

---

Font: Geist e Geist Mono, © Vercel, SIL Open Font License (`fonts/OFL-Geist.txt`). Il Lab usa Pyodide, caricato da jsDelivr.
