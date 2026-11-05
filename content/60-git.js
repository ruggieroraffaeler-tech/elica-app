/* Corso: Git e GitHub */
ELICA.addCourse({id:'git',order:60,name:'Git',lang:'bash',tag:'Versionare il codice e pubblicarlo su GitHub: le basi per trasformare il tuo progetto in una repository.',units:[
 {title:'Le basi',lessons:[
  {id:'gt1',title:'Cos’è Git',sub:'repository, add, commit',ex:[
   {t:'info',title:'Fotografie del progetto',text:'Git registra la storia del progetto come una serie di fotografie, i commit. Prima scegli cosa fotografare (git add, la “staging area”), poi scatti (git commit).',code:`git init                     # crea la repository nella cartella\ngit status                   # cosa è cambiato?\ngit add pipeline.py          # metti nello staging\ngit commit -m "Prima versione della pipeline"`},
   {t:'mc',q:'Cosa fa git init?',opts:['Crea una nuova repository nella cartella corrente','Scarica un progetto da GitHub','Salva le modifiche'],a:0,why:'Crea la cartella nascosta .git dove vive tutta la storia.'},
   {t:'mc',q:'Qual è l’ordine giusto?',opts:['modifichi → git add → git commit','git commit → git add → modifichi','git add → modifichi → git commit'],a:0,why:'Prima cambi, poi scegli cosa includere, poi registri.'},
   {t:'fill',q:'Registra le modifiche con un messaggio.',code:`git ___ -m "Aggiunge il calcolo del GC"`,bank:['commit','save','push'],ans:['commit'],why:'push invia i commit online, ma prima bisogna crearli.'},
   {t:'mc',q:'Cosa mostra git status?',opts:['I file modificati, quelli nello staging e quelli non tracciati','La storia dei commit','Il contenuto dei file'],a:0,why:'È il comando da lanciare quando non sai a che punto sei.'},
   {t:'order',q:'Crea una repository e fai il primo commit.',lines:['git init','git add README.md','git commit -m "Primo commit"'],why:'init una volta sola, poi add e commit.'},
   {t:'mc',q:'Cosa va fatto una volta sola, prima del primo commit?',opts:['git config --global user.name "Nome"','git setup name "Nome"','git user "Nome"'],mono:1,a:0,why:'Nome ed email (user.email) firmano ogni commit.'}
  ]},
  {id:'gt2',title:'Storia e differenze',sub:'log, diff, restore',ex:[
   {t:'info',title:'Guardarsi indietro',text:'Git ti fa vedere cosa è cambiato e quando, e ti permette di annullare le modifiche non ancora salvate.',code:`git log --oneline        # storia compatta\ngit diff                 # modifiche non ancora in staging\ngit diff --staged        # cosa entrerà nel prossimo commit\ngit restore file.py      # annulla le modifiche non salvate`},
   {t:'mc',q:'Cosa mostra git log --oneline?',opts:['Un commit per riga, con ID breve e messaggio','Solo l’ultimo commit','I file cambiati'],a:0,why:'È il modo più rapido per vedere la storia.'},
   {t:'mc',q:'Dopo git add, git diff senza opzioni mostra ancora quelle modifiche?',opts:['No: per vederle serve git diff --staged','Sì, sempre','Solo dopo il commit'],a:0,why:'git diff confronta i file con lo staging, non con l’ultimo commit.'},
   {t:'fill',q:'Annulla le modifiche non salvate a un file.',code:`git ___ pipeline.py`,bank:['restore','undo','revert-file'],ans:['restore'],why:'Attenzione: le modifiche annullate non si recuperano.'},
   {t:'mc',q:'Quale messaggio di commit è migliore?',opts:['"Aggiunge filtro per identità minima"','"modifiche"','"asdf"'],a:0,why:'Un buon messaggio dice cosa fa il commit, al presente.'},
   {t:'mc',q:'Ogni commit ha un ID come a1b2c3d. Cos’è?',opts:['Un hash che identifica quel commit in modo univoco','Un numero progressivo','La data'],a:0,why:'Puoi usarlo per tornare a quel punto, per esempio con git show a1b2c3d.'}
  ]},
  {id:'gt3',title:'.gitignore',sub:'Cosa NON versionare',ex:[
   {t:'info',title:'Non tutto va nella repository',text:'Genomi e risultati sono file grandi e rigenerabili: non vanno nella repository. Il file .gitignore elenca cosa ignorare.',code:`# .gitignore\ndata/\nresults/\n*.fna\n*.faa\n__pycache__/\n.env`},
   {t:'mc',q:'Perché non versionare i genomi scaricati?',opts:['Sono grandi e si possono riscaricare con lo script','Git non legge i file FASTA','Sono segreti'],a:0,why:'Nella repository va il codice che li scarica, non i dati.'},
   {t:'fill',q:'Ignora tutti i file .zip.',code:`___.zip`,bank:['*','%','?'],ans:['*'],why:'* corrisponde a qualsiasi nome.'},
   {t:'mc',q:'Una password o una chiave API nel codice…',opts:['Non va mai committata: usa variabili d’ambiente o un file .env ignorato','Va bene se la repo è privata','Va nel README'],a:0,why:'Una volta nella storia di Git, è difficile toglierla davvero.'},
   {t:'type',q:'Quale riga aggiungi al .gitignore per ignorare la cartella results?',ans:['results/','results','/results/','/results'],why:'La barra finale indica che è una cartella.'},
   {t:'mc',q:'Un file già committato, poi aggiunto al .gitignore…',opts:['Resta tracciato finché non lo togli con git rm --cached','Sparisce dalla storia','Viene cancellato dal disco'],a:0,why:'.gitignore vale solo per i file non ancora tracciati.'}
  ]}
 ]},
 {title:'Branch',lessons:[
  {id:'gt4',title:'Branch e merge',sub:'Provare idee senza rompere nulla',ex:[
   {t:'info',title:'Linee parallele',text:'Un branch è una linea di sviluppo parallela. Provi una nuova funzione in un branch e, quando funziona, la unisci a main con merge.',code:`git switch -c filtro-identita   # crea il branch e ci passa\n# ...modifichi e fai commit...\ngit switch main\ngit merge filtro-identita\ngit branch -d filtro-identita   # cancella il branch unito`},
   {t:'mc',q:'Cosa fa git switch -c nome?',opts:['Crea un branch e ci passa','Cancella un branch','Unisce due branch'],a:0,why:'Senza -c passa a un branch che esiste già.'},
   {t:'order',q:'Sviluppa una funzione in un branch e uniscila.',lines:['git switch -c nuova-analisi','git add analisi.py','git commit -m "Aggiunge nuova analisi"','git switch main','git merge nuova-analisi'],why:'Il merge si fa stando sul branch che riceve le modifiche.'},
   {t:'mc',q:'Quando avviene un conflitto di merge?',opts:['Quando due branch modificano le stesse righe in modo diverso','Quando fai troppi commit','Quando il branch ha un nome lungo'],a:0,why:'Git non sa quale versione tenere e chiede a te.'},
   {t:'mc',q:'Nel file in conflitto vedi <<<<<<<, ======= e >>>>>>>. Cosa fai?',opts:['Tieni o combini il codice giusto, togli i marcatori, poi git add e git commit','Cancelli il file','Rifai git init'],a:0,why:'I marcatori delimitano le due versioni in conflitto.'},
   {t:'fill',q:'Elenca i branch.',code:`git ___`,bank:['branch','list','show'],ans:['branch'],why:'L’asterisco indica il branch su cui sei.'}
  ]}
 ]},
 {title:'GitHub',lessons:[
  {id:'gt5',title:'Remote, push e pull',sub:'Mettere il progetto online',ex:[
   {t:'info',title:'La copia online',text:'GitHub ospita la tua repository online. origin è il nome abituale del remote.',code:`git remote add origin https://github.com/tuonome/genome-diff.git\ngit push -u origin main     # la prima volta\ngit push                    # le volte successive\ngit pull                    # scarica le modifiche dal remote\ngit clone https://github.com/tuonome/genome-diff.git`},
   {t:'mc',q:'Cosa fa git push?',opts:['Invia i tuoi commit al remote','Scarica i commit','Crea un commit'],a:0,why:'git pull fa il contrario.'},
   {t:'mc',q:'A cosa serve git clone?',opts:['Scarica una copia completa di una repository, storia compresa','Duplica un branch','Copia un file'],a:0,why:'È il modo per lavorare sul progetto da un altro computer.'},
   {t:'fill',q:'Invia main a GitHub.',code:`git ___ origin main`,bank:['push','send','upload'],ans:['push'],why:'origin = dove, main = quale branch.'},
   {t:'mc',q:'Perché -u alla prima push?',opts:['Collega il branch locale a quello remoto, così poi basta git push','Rende la repo pubblica','Cancella il remote'],a:0,why:'-u sta per --set-upstream.'},
   {t:'mc',q:'Per autenticarti su GitHub da terminale si usa…',opts:['Un token personale o una chiave SSH, non la password','La password dell’account','Nessuna autenticazione'],a:0,why:'GitHub non accetta più la password per le operazioni Git.'}
  ]},
  {id:'gt6',title:'Una buona repository',sub:'README, licenza, versioni',ex:[
   {t:'info',title:'Una repo che si fa capire',text:'Una repository curata ha un README (cosa fa, come si installa, un esempio), una licenza, un file con le dipendenze e dei tag per le versioni.',code:`genome-diff/\n├── README.md\n├── LICENSE\n├── environment.yml      # dipendenze conda\n├── .gitignore\n├── src/genome_diff/\n└── tests/\n\ngit tag v0.1.0\ngit push --tags`},
   {t:'mc',q:'Cosa deve dire per prima cosa il README?',opts:['Cosa fa il tool e un esempio d’uso','La storia dei commit','Chi sei'],a:0,why:'Chi arriva sulla repo deve capire in 10 secondi se gli serve.'},
   {t:'mc',q:'Senza licenza, gli altri possono riusare il tuo codice?',opts:['Legalmente no: senza licenza vale il diritto d’autore pieno','Sì, tutto ciò che è pubblico è libero','Solo per uso personale'],a:0,why:'Licenze comuni per progetti aperti: MIT, Apache 2.0, GPL.'},
   {t:'mc',q:'Cosa indica v1.2.0 nel versionamento semantico?',opts:['MAGGIORE.MINORE.PATCH','anno.mese.giorno','numero di commit'],a:0,why:'PATCH = correzioni, MINORE = novità compatibili, MAGGIORE = cambiamenti incompatibili.'},
   {t:'fill',q:'Segna questa versione.',code:`git ___ v0.1.0`,bank:['tag','label','version'],ans:['tag'],why:'Su GitHub, da un tag puoi creare una release.'},
   {t:'mc',q:'Cos’è una pull request?',opts:['Una proposta di unire un branch, con revisione e commenti','Un modo per scaricare','Un commit urgente'],a:0,why:'È il modo standard per contribuire ai progetti degli altri.'}
  ]}
 ]}
]});
