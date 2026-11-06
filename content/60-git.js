/* Corso: Git e GitHub */
ELICA.addCourse({
  id: "git",
  order: 60,
  name: "Git",
  lang: "bash",
  tag: "Versionare il codice e pubblicarlo su GitHub: le basi per trasformare il tuo progetto in una repository.",
  units: [
  { title: "Le basi", lessons: [
    { id: "gt1", title: "Cos’è Git", sub: "repository, add, commit", ex: [
        { t: "info", title: "A cosa serve Git", text: "Quando lavori a un progetto, prima o poi ti capita di rompere qualcosa che funzionava, o di non ricordare cosa hai cambiato. **Git** è un programma che tiene la **storia completa** del progetto: puoi vedere ogni modifica, tornare indietro, provare idee senza paura.\n\n**Git** e **GitHub** non sono la stessa cosa: Git è il programma che usi sul tuo computer, GitHub è un sito che ospita online le repository Git per condividerle e farne una copia di sicurezza.", points: ["**Repository** (o *repo*): la cartella del progetto più la sua storia, salvata in una cartella nascosta `.git`.", "**Commit**: una “fotografia” del progetto in un certo momento, con un messaggio che descrive cosa è cambiato."] },
        { t: "info", title: "Il ciclo base: modifica, add, commit", text: "Il lavoro con Git ha tre momenti:", points: ["**modifichi** i file normalmente;", "con `git add` scegli **quali** modifiche includere nella prossima fotografia: le metti nella *staging area*, una zona di preparazione;", "con `git commit -m \"messaggio\"` **scatti** la fotografia."], code: `git init                      # una volta: trasforma la cartella in repository
git status                    # cosa è cambiato?
git add pipeline.py           # prepara questo file
git commit -m "Prima versione della pipeline"`, note: "La staging area serve a fare commit “puliti”: se hai cambiato tre file ma solo due riguardano la stessa modifica, aggiungi solo quei due." },
        { t: "mc", q: "Cosa fa git init?", opts: ["Crea una nuova repository nella cartella corrente", "Scarica un progetto da GitHub", "Salva le modifiche"], a: 0, why: "Crea la cartella nascosta .git dove vive tutta la storia." },
        { t: "mc", q: "Qual è l’ordine giusto?", opts: ["modifichi → git add → git commit", "git commit → git add → modifichi", "git add → modifichi → git commit"], a: 0, why: "Prima cambi, poi scegli cosa includere, poi registri." },
        { t: "fill", q: "Registra le modifiche con un messaggio.", code: `git ___ -m "Aggiunge il calcolo del GC"`, bank: ["commit", "save", "push"], ans: ["commit"], why: "push invia i commit online, ma prima bisogna crearli." },
        { t: "info", title: "git status", text: "`git status` è il comando da lanciare ogni volta che non sai a che punto sei. Ti mostra:", points: ["i file **modificati** ma non ancora aggiunti;", "i file **nella staging area**, pronti per il commit;", "i file **non tracciati** (*untracked*): nuovi file che Git non sta ancora seguendo."] },
        { t: "mc", q: "Cosa mostra git status?", opts: ["I file modificati, quelli nello staging e quelli non tracciati", "La storia dei commit", "Il contenuto dei file"], a: 0, why: "È il comando da lanciare quando non sai a che punto sei." },
        { t: "order", q: "Crea una repository e fai il primo commit.", lines: ["git init", "git add README.md", "git commit -m \"Primo commit\""], why: "init una volta sola, poi add e commit." },
        { t: "info", title: "Prima configurazione", text: "Ogni commit è firmato con un nome e un’email. Si impostano **una volta per computer**:", code: `git config --global user.name "Raffaele Ruggiero"
git config --global user.email "tua@email.it"`, note: "Se vuoi tenere privata la tua email su GitHub, nelle impostazioni (Settings → Emails) trovi un indirizzo “noreply” da usare qui." },
        { t: "mc", q: "Cosa va fatto una volta sola, prima del primo commit?", opts: ["git config --global user.name \"Nome\"", "git setup name \"Nome\"", "git user \"Nome\""], mono: 1, a: 0, why: "Nome ed email (user.email) firmano ogni commit." }
    ]},
    { id: "gt2", title: "Storia e differenze", sub: "log, diff, restore", ex: [
        { t: "info", title: "Vedere la storia", text: "`git log` mostra i commit, dal più recente; `git log --oneline` ne mostra uno per riga: un **ID** breve e il messaggio.\n\nL’ID (es. `a1b2c3d`) è l’inizio di un **hash**: un codice calcolato dal contenuto del commit, che lo identifica in modo univoco. Lo usi per riferirti a quel commit, per esempio `git show a1b2c3d`.", code: `git log --oneline
# 3f2a9c1 Aggiunge filtro per identità minima
# a1b2c3d Prima versione della pipeline` },
        { t: "mc", q: "Cosa mostra git log --oneline?", opts: ["Un commit per riga, con ID breve e messaggio", "Solo l’ultimo commit", "I file cambiati"], a: 0, why: "È il modo più rapido per vedere la storia." },
        { t: "info", title: "Vedere le differenze", text: "`git diff` mostra **riga per riga** cosa hai cambiato: le righe tolte iniziano con `-`, quelle aggiunte con `+`.", points: ["`git diff`: modifiche **non ancora** aggiunte con `git add`;", "`git diff --staged`: modifiche già aggiunte, cioè quello che entrerà nel prossimo commit."], note: "Dopo `git add`, `git diff` senza opzioni non mostra più quelle modifiche: non sono sparite, sono nella staging area." },
        { t: "mc", q: "Dopo git add, git diff senza opzioni mostra ancora quelle modifiche?", opts: ["No: per vederle serve git diff --staged", "Sì, sempre", "Solo dopo il commit"], a: 0, why: "git diff confronta i file con lo staging, non con l’ultimo commit." },
        { t: "info", title: "Annullare modifiche", text: "`git restore file` riporta un file com’era all’ultimo commit, buttando via le modifiche **non salvate** in un commit. È utile quando hai fatto un pasticcio e vuoi ripartire.\n\n`git restore --staged file` toglie un file dalla staging area senza perdere le modifiche.", note: "Le modifiche annullate con `git restore file` non si possono recuperare: usalo con attenzione." },
        { t: "fill", q: "Annulla le modifiche non salvate a un file.", code: `git ___ pipeline.py`, bank: ["restore", "undo", "revert-file"], ans: ["restore"], why: "Attenzione: le modifiche annullate non si recuperano." },
        { t: "info", title: "Buoni messaggi di commit", text: "Il messaggio deve far capire **cosa fa** il commit a chi leggerà la storia, compreso te tra sei mesi. Regole pratiche: frase breve, al presente, specifica.", points: ["Sì: `\"Aggiunge filtro per identità minima\"`, `\"Corregge il conteggio delle read\"`.", "No: `\"modifiche\"`, `\"fix\"`, `\"asdf\"`.", "Commit piccoli e frequenti: uno per ogni modifica che ha senso da sola."] },
        { t: "mc", q: "Quale messaggio di commit è migliore?", opts: ["\"Aggiunge filtro per identità minima\"", "\"modifiche\"", "\"asdf\""], a: 0, why: "Un buon messaggio dice cosa fa il commit, al presente." },
        { t: "mc", q: "Ogni commit ha un ID come a1b2c3d. Cos’è?", opts: ["Un hash che identifica quel commit in modo univoco", "Un numero progressivo", "La data"], a: 0, why: "Puoi usarlo per tornare a quel punto, per esempio con git show a1b2c3d." }
    ]},
    { id: "gt3", title: ".gitignore", sub: "Cosa NON versionare", ex: [
        { t: "info", title: "Cosa non mettere nella repository", text: "Nella repository va il **codice** e ciò che serve per usarlo, non tutto quello che c’è nella cartella. Restano fuori:", points: ["**dati grandi e rigenerabili** (genomi scaricati, risultati): si possono ricreare con il codice;", "**segreti**: password, token, chiavi API. Una volta finiti nella storia di Git è difficile toglierli davvero, e se la repo è pubblica chiunque può leggerli;", "file temporanei del sistema o dell’editor (`__pycache__/`, `.DS_Store`)."] },
        { t: "info", title: "Il file .gitignore", text: "`.gitignore` è un file di testo nella cartella principale del progetto. Ogni riga è un nome o un **pattern** di file da ignorare: Git non li mostrerà più tra i file non tracciati e `git add` non li aggiungerà.", points: ["`results/` ignora la cartella `results` (la `/` finale indica una cartella);", "`*.fna` ignora tutti i file che finiscono in `.fna` (`*` = qualsiasi testo);", "`#` inizia un commento."], code: `# .gitignore
data/
results/
*.fna
*.faa
*.zip
__pycache__/
.env` },
        { t: "mc", q: "Perché non versionare i genomi scaricati?", opts: ["Sono grandi e si possono riscaricare con lo script", "Git non legge i file FASTA", "Sono segreti"], a: 0, why: "Nella repository va il codice che li scarica, non i dati." },
        { t: "fill", q: "Ignora tutti i file .zip.", code: `___.zip`, bank: ["*", "%", "?"], ans: ["*"], why: "* corrisponde a qualsiasi nome." },
        { t: "mc", q: "Una password o una chiave API nel codice…", opts: ["Non va mai committata: usa variabili d’ambiente o un file .env ignorato", "Va bene se la repo è privata", "Va nel README"], a: 0, why: "Una volta nella storia di Git, è difficile toglierla davvero." },
        { t: "type", q: "Quale riga aggiungi al .gitignore per ignorare la cartella results?", ans: ["results/", "results", "/results/", "/results"], why: "La barra finale indica che è una cartella." },
        { t: "info", title: "File già tracciati", text: "`.gitignore` vale solo per i file **non ancora tracciati**. Se un file era già stato committato, Git continua a seguirlo anche dopo averlo aggiunto a `.gitignore`.\n\nPer smettere di tracciarlo senza cancellarlo dal disco: `git rm --cached file`, poi un commit.", code: `git rm --cached results/tabella.tsv
git commit -m "Smette di tracciare i risultati"` },
        { t: "mc", q: "Un file già committato, poi aggiunto al .gitignore…", opts: ["Resta tracciato finché non lo togli con git rm --cached", "Sparisce dalla storia", "Viene cancellato dal disco"], a: 0, why: ".gitignore vale solo per i file non ancora tracciati." }
    ]}
  ]},
  { title: "Branch", lessons: [
    { id: "gt4", title: "Branch e merge", sub: "Provare idee senza rompere nulla", ex: [
        { t: "info", title: "I branch", text: "Un **branch** (ramo) è una linea di sviluppo parallela. Il ramo principale di solito si chiama `main`.\n\nQuando vuoi provare una nuova funzione crei un branch, ci lavori e fai i tuoi commit lì: `main` resta intatto. Se l’idea funziona la unisci a `main` (*merge*), altrimenti cancelli il branch.", points: ["`git branch`: elenca i branch (l’asterisco indica quello attuale);", "`git switch -c nome`: crea un branch e ci passa;", "`git switch nome`: passa a un branch esistente;", "`git merge nome`: unisce il branch `nome` in quello in cui ti trovi;", "`git branch -d nome`: cancella un branch già unito."] },
        { t: "mc", q: "Cosa fa git switch -c nome?", opts: ["Crea un branch e ci passa", "Cancella un branch", "Unisce due branch"], a: 0, why: "Senza -c passa a un branch che esiste già." },
        { t: "info", title: "Un esempio completo", text: "Il merge si fa stando sul branch che **riceve** le modifiche, quindi prima si torna su `main`.", code: `git switch -c filtro-identita      # nuovo branch
# ...modifichi i file...
git add filtro.py
git commit -m "Aggiunge filtro per identità"
git switch main                    # torna su main
git merge filtro-identita          # porta dentro le modifiche
git branch -d filtro-identita      # pulizia` },
        { t: "order", q: "Sviluppa una funzione in un branch e uniscila.", lines: ["git switch -c nuova-analisi", "git add analisi.py", "git commit -m \"Aggiunge nuova analisi\"", "git switch main", "git merge nuova-analisi"], why: "Il merge si fa stando sul branch che riceve le modifiche." },
        { t: "info", title: "I conflitti", text: "Un **conflitto** succede quando due branch hanno modificato **le stesse righe** in modi diversi: Git non può sapere quale versione tenere e chiede a te. Nel file trovi dei marcatori:", code: `<<<<<<< HEAD
versione del branch in cui sei
=======
versione del branch che stai unendo
>>>>>>> filtro-identita`, note: "Per risolvere: modifica il file tenendo il codice giusto (una delle due versioni o un mix), **cancella i marcatori**, poi `git add file` e `git commit`. Non è un disastro: succede a tutti." },
        { t: "mc", q: "Quando avviene un conflitto di merge?", opts: ["Quando due branch modificano le stesse righe in modo diverso", "Quando fai troppi commit", "Quando il branch ha un nome lungo"], a: 0, why: "Git non sa quale versione tenere e chiede a te." },
        { t: "mc", q: "Nel file in conflitto vedi <<<<<<<, ======= e >>>>>>>. Cosa fai?", opts: ["Tieni o combini il codice giusto, togli i marcatori, poi git add e git commit", "Cancelli il file", "Rifai git init"], a: 0, why: "I marcatori delimitano le due versioni in conflitto." },
        { t: "fill", q: "Elenca i branch.", code: `git ___`, bank: ["branch", "list", "show"], ans: ["branch"], why: "L’asterisco indica il branch su cui sei." }
    ]}
  ]},
  { title: "GitHub", lessons: [
    { id: "gt5", title: "Remote, push e pull", sub: "Mettere il progetto online", ex: [
        { t: "info", title: "Remote: la copia online", text: "Un **remote** è una copia della repository su un server, per esempio GitHub. Il nome abituale del remote principale è `origin`.", points: ["`git remote add origin URL`: collega la repo locale a quella su GitHub (una volta);", "`git push`: **invia** i tuoi commit al remote;", "`git pull`: **scarica** i commit nuovi dal remote e li unisce ai tuoi;", "`git clone URL`: scarica una copia completa di una repository, con tutta la storia (si usa per iniziare a lavorare da un altro computer)."], code: `git remote add origin https://github.com/tuonome/genome-diff.git
git push -u origin main     # la prima volta
git push                    # le volte successive` },
        { t: "mc", q: "Cosa fa git push?", opts: ["Invia i tuoi commit al remote", "Scarica i commit", "Crea un commit"], a: 0, why: "git pull fa il contrario." },
        { t: "mc", q: "A cosa serve git clone?", opts: ["Scarica una copia completa di una repository, storia compresa", "Duplica un branch", "Copia un file"], a: 0, why: "È il modo per lavorare sul progetto da un altro computer." },
        { t: "fill", q: "Invia main a GitHub.", code: `git ___ origin main`, bank: ["push", "send", "upload"], ans: ["push"], why: "origin = dove, main = quale branch." },
        { t: "info", title: "Perché -u la prima volta", text: "`-u` (forma breve di `--set-upstream`) collega il tuo branch locale `main` a `origin/main`. Da quel momento basta scrivere `git push` e `git pull`, senza ripetere dove e quale branch." },
        { t: "mc", q: "Perché -u alla prima push?", opts: ["Collega il branch locale a quello remoto, così poi basta git push", "Rende la repo pubblica", "Cancella il remote"], a: 0, why: "-u sta per --set-upstream." },
        { t: "info", title: "Autenticarsi su GitHub", text: "Quando fai `push` su GitHub devi dimostrare chi sei. La **password dell’account non funziona** per i comandi Git: si usa un **token personale**, che inserisci quando ti chiede la password, oppure una **chiave SSH**.\n\nIn alternativa puoi usare **GitHub Desktop** o il comando `gh auth login`, che gestiscono l’accesso per te." },
        { t: "mc", q: "Per autenticarti su GitHub da terminale si usa…", opts: ["Un token personale o una chiave SSH, non la password", "La password dell’account", "Nessuna autenticazione"], a: 0, why: "GitHub non accetta più la password per le operazioni Git." }
    ]},
    { id: "gt6", title: "Una buona repository", sub: "README, licenza, versioni", ex: [
        { t: "info", title: "Il README", text: "Il file `README.md` è la prima cosa che si vede aprendo una repository su GitHub. È scritto in **Markdown**: testo semplice in cui `#` crea un titolo, `-` un elenco, e i blocchi tra tre apici inversi sono codice.\n\nDeve dire per prima cosa **cosa fa** il progetto e **come si usa**, con un esempio. Poi: come si installa, da cosa dipende, come citarlo o contribuire." },
        { t: "mc", q: "Cosa deve dire per prima cosa il README?", opts: ["Cosa fa il tool e un esempio d’uso", "La storia dei commit", "Chi sei"], a: 0, why: "Chi arriva sulla repo deve capire in 10 secondi se gli serve." },
        { t: "info", title: "La licenza", text: "Senza un file di licenza, il codice resta coperto dal **diritto d’autore**: anche se è pubblico, gli altri non hanno il permesso legale di riusarlo o modificarlo. Una licenza dice cosa è permesso.\n\nLe più comuni per progetti aperti: **MIT** (molto permissiva), **Apache 2.0** (permissiva, con clausole sui brevetti), **GPL** (chi distribuisce versioni modificate deve renderle aperte con la stessa licenza). GitHub ti fa scegliere quando crei la repo." },
        { t: "mc", q: "Senza licenza, gli altri possono riusare il tuo codice?", opts: ["Legalmente no: senza licenza vale il diritto d’autore pieno", "Sì, tutto ciò che è pubblico è libero", "Solo per uso personale"], a: 0, why: "Licenze comuni per progetti aperti: MIT, Apache 2.0, GPL." },
        { t: "info", title: "Versioni e tag", text: "Il **versionamento semantico** usa tre numeri, `MAGGIORE.MINORE.PATCH` (es. `1.2.0`):", points: ["**PATCH** (`1.2.1`): correzioni di bug;", "**MINORE** (`1.3.0`): funzioni nuove che non rompono l’uso precedente;", "**MAGGIORE** (`2.0.0`): cambiamenti incompatibili."], code: `git tag v0.1.0
git push --tags      # i tag vanno inviati a parte`, note: "Su GitHub, da un tag puoi creare una **Release**: una pagina con le note della versione e i file da scaricare." },
        { t: "mc", q: "Cosa indica v1.2.0 nel versionamento semantico?", opts: ["MAGGIORE.MINORE.PATCH", "anno.mese.giorno", "numero di commit"], a: 0, why: "PATCH = correzioni, MINORE = novità compatibili, MAGGIORE = cambiamenti incompatibili." },
        { t: "fill", q: "Segna questa versione.", code: `git ___ v0.1.0`, bank: ["tag", "label", "version"], ans: ["tag"], why: "Su GitHub, da un tag puoi creare una release." },
        { t: "info", title: "Pull request", text: "Una **pull request** (PR) è una proposta di unire un branch in un altro su GitHub. Mostra le differenze, permette di commentarle riga per riga, e si unisce con un clic quando va bene.\n\nÈ il modo standard per contribuire ai progetti degli altri, ma è utile anche da soli: ti obbliga a rileggere le modifiche prima di portarle su `main`." },
        { t: "mc", q: "Cos’è una pull request?", opts: ["Una proposta di unire un branch, con revisione e commenti", "Un modo per scaricare", "Un commit urgente"], a: 0, why: "È il modo standard per contribuire ai progetti degli altri." }
    ]}
  ]}
  ]
});
