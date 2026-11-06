/* Versione dell'app e novità.
   Quando pubblichi un aggiornamento: alza APP_VERSION, aggiungi una voce in cima
   a CHANGELOG e lancia `python3 tools/build.py` (aggiorna anche sw.js). */
ELICA.APP_VERSION = '3.2.0';
ELICA.CHANGELOG = [
  { v: '3.2.0', date: '2026-11-06', items: [
    'Sfide di codice alla fine dei blocchi di Python, Palestra, Python × Bio e Progetto: scrivi tu il programma da zero, come in laboratorio (17 esercizi in 10 sfide)',
    'Correttore automatico: prova il tuo codice su vari casi e ti mostra cosa si aspettava e cosa ha ottenuto',
    'Suggeritore: errori di Python spiegati in italiano, suggerimenti a livelli e soluzione solo dopo un paio di tentativi',
    'Python Settimana 5: sfida in cui scrivi tu i test, come in CS50, e il correttore controlla che scovino i difetti',
    'Missioni sul tuo computer per R, Bash e Git: esegui i comandi e incolli il risultato da controllare',
    'Lab più robusto: Python gira in un thread separato, un ciclo infinito viene fermato dopo 10 secondi, e c’è un riquadro per l’input',
    'Le sfide in cui hai guardato la soluzione restano nel Ripasso da rifare'
  ]},
  { v: '3.1.0', date: '2026-11-06', items: [
    'Teoria riscritta e molto più completa in tutti i corsi: 2–5 schede per lezione, alternate agli esercizi',
    'R, Bash, Biopython e pandas spiegati da zero, senza dare nulla per scontato',
    'Riquadri “Attenzione” sugli errori tipici e “Se vieni dal C++” sulle differenze con Python',
    'Pulsante per rileggere la teoria di ogni lezione dal percorso e dopo una risposta sbagliata',
    'Controllo di copertura: ogni esercizio usa solo concetti già spiegati'
  ]},
  { v: '3.0.2', date: '2026-11-05', items: [
    'Sincronizzazione: chiarito che il Gist è “segreto” (non elencato), non privato',
    'La pagina chiede ai motori di ricerca di non indicizzarla'
  ]},
  { v: '3.0.1', date: '2026-11-04', items: [
    'Contenuti verificati eseguendo il codice con Python, R, Bash, Git, BLAST, DIAMOND, bwa e samtools',
    'Bash: aggiunto “bwa index”, necessario prima di bwa mem',
    'Bash: chiarito cosa conta samtools view -c (righe di allineamento, non read)',
    'Teoria resa eseguibile in alcune lezioni; precisazioni su RefSeq, VFDB e ORF'
  ]},
  { v: '3.0.0', date: '2026-11-04', items: [
    'App installabile su PC e iPad, funziona anche offline',
    'Sessione del giorno: 10–15 minuti tra lezione nuova, errori e ripasso',
    'Palestra della logica: booleani, flag, return anticipato e controlli carattere per carattere',
    'Corso Git: dal primo commit a GitHub',
    'Percorso Progetto: la pipeline sui genomi batterici, passo dopo passo',
    'Nuovo esercizio “Trova il bug”',
    'Ripasso programmato: gli esercizi tornano a intervalli crescenti',
    'Backup e ripristino dei progressi, scorciatoie da tastiera'
  ]},
  { v: '2.0.0', date: '2026-11-04', items: [
    'Python allineato alle 10 settimane di CS50P',
    'Corsi più lunghi per Python × Bio, R e Bash',
    'Ripasso errori ed esercizi “Scrivi l’output”'
  ]},
  { v: '1.0.0', date: '2026-11-04', items: ['Prima versione'] }
];
