/* Corso: sh — vedi README per il formato degli esercizi */
ELICA.addCourse({
  id: "sh",
  order: 50,
  name: "Bash",
  lang: "bash",
  tag: "Il terminale: dove vivono FASTQ, BAM, VCF e le pipeline.",
  units: [
  { title: "Terminale", lessons: [
    { id: "s1", title: "Muoversi nel sistema", sub: "pwd, ls, cd", ex: [
        { t: "info", title: "Il terminale", text: "Il **terminale** è un programma in cui dai ordini al computer **scrivendo comandi** invece di cliccare. Il programma che interpreta i comandi si chiama **shell**; la più diffusa è **Bash**.\n\nIn bioinformatica si usa moltissimo: quasi tutti gli strumenti (allineatori, BLAST, samtools…) sono comandi da terminale, e lavorano su file troppo grandi per aprirli con un editor.", points: ["**Mac** e **Linux**: apri l’app “Terminale”.", "**Windows**: installa **WSL** (un Linux dentro Windows) oppure **Git Bash**.", "A sinistra del cursore vedi il **prompt** (spesso termina con `$`): significa “aspetto un comando”. Nei nostri esempi il `$` non va scritto."] },
        { t: "info", title: "Com’è fatto un comando", text: "Un comando è formato da: **nome**, eventuali **opzioni** (iniziano con `-` o `--`) e **argomenti** (su cosa agire), separati da spazi. Premi Invio per eseguirlo.", code: `ls                 # nome da solo: elenca i file
ls -l              # con un'opzione: elenco dettagliato
ls -l dati/        # con opzione e argomento
wc --help          # quasi ogni comando ha un aiuto`, note: "Usa il tasto **Tab** per completare automaticamente nomi di file e comandi, e le **frecce su/giù** per richiamare i comandi precedenti. Ti risparmiano un sacco di errori di battitura." },
        { t: "info", title: "Cartelle e percorsi", text: "I file sono organizzati in cartelle (*directory*) una dentro l’altra. In ogni momento il terminale “si trova” in una cartella, la **cartella di lavoro**.", points: ["`pwd` (*print working directory*): mostra dove sei.", "`ls`: elenca il contenuto della cartella.", "`cd nome`: entra nella cartella `nome`.", "`..` è la cartella **superiore**, `.` è quella **attuale**, `~` è la tua cartella **home**.", "`cd` da solo ti riporta nella home.", "Un percorso che inizia con `/` è **assoluto** (parte dalla radice del disco); altrimenti è **relativo** alla cartella in cui sei."], code: `pwd              # /home/raffaele
cd progetto/dati
cd ..            # torna su di un livello
cd               # torna alla home` },
        { t: "mc", q: "Quale comando mostra la cartella corrente?", opts: ["pwd", "ls", "cd"], mono: 1, a: 0, why: "pwd = print working directory." },
        { t: "fill", q: "Torna alla cartella superiore.", code: `cd ___`, bank: ["..", ".", "~/"], ans: [".."], why: ".. è la cartella genitore, . quella attuale." },
        { t: "info", title: "Il jolly *", text: "Nei nomi di file, `*` significa “qualsiasi sequenza di caratteri”. `*.fa` indica tutti i file che finiscono in `.fa`. È la shell a sostituire `*.fa` con l’elenco dei file corrispondenti, prima di eseguire il comando.", code: `ls *.fa            # tutti i FASTA della cartella
ls gene*           # tutti i file che iniziano con "gene"` },
        { t: "mc", q: "Cosa mostra ls *.fa?", opts: ["Tutti i file che finiscono in .fa", "Il file chiamato *.fa", "Le cartelle nascoste"], a: 0, why: "* è un jolly che corrisponde a qualsiasi testo." },
        { t: "mc", q: "Dove ti porta cd senza argomenti?", opts: ["Nella tua cartella home", "Nella cartella radice /", "Da nessuna parte"], a: 0, why: "cd da solo equivale a cd ~." }
    ]},
    { id: "s4", title: "File e cartelle", sub: "mkdir, cp, mv, rm", ex: [
        { t: "info", title: "Creare, copiare, spostare", text: "I comandi base per organizzare i file:", points: ["`mkdir nome`: crea una cartella.", "`cp origine destinazione`: copia un file (`cp -r` per copiare una cartella con tutto il contenuto).", "`mv origine destinazione`: **sposta**; se la destinazione è un nuovo nome nella stessa cartella, **rinomina**.", "`cat file`: stampa il contenuto di un file; `less file`: lo mostra pagina per pagina (frecce per scorrere, `q` per uscire)."], code: `mkdir progetto
cp dati.fa progetto/
mv progetto/dati.fa progetto/geni.fa    # rinomina
less progetto/geni.fa` },
        { t: "mc", q: "A cosa serve mv?", opts: ["Spostare o rinominare", "Copiare", "Cancellare"], a: 0, why: "Rinominare è uno spostamento con un nome nuovo." },
        { t: "info", title: "Cancellare (con attenzione)", text: "`rm file` cancella un file; `rm -r cartella` cancella una cartella **con tutto il contenuto** (`-r` = ricorsivo).\n\nNel terminale **non esiste il cestino**: quello che cancelli con `rm` è perso.", note: "Prima di un `rm` con il jolly (`rm *.tmp`), lancia lo stesso comando con `ls` (`ls *.tmp`) per vedere cosa verrà cancellato." },
        { t: "fill", q: "Cancella una cartella con tutto il contenuto.", code: `___ -r vecchia_cartella`, bank: ["rm", "del", "erase"], ans: ["rm"], why: "-r = ricorsivo." },
        { t: "mc", q: "Cosa fa rm nel terminale?", opts: ["Cancella definitivamente, senza cestino", "Sposta nel cestino", "Chiede sempre conferma"], a: 0, why: "Non c’è annulla: attenzione con rm -r." },
        { t: "info", title: "Mandare l’output in un file", text: "Normalmente un comando scrive il risultato sullo schermo. Con `>` lo mandi in un file, che viene **creato o sovrascritto**; con `>>` lo **aggiungi** in fondo a un file esistente.\n\n`cat` con più file li stampa uno dopo l’altro: con `>` ottieni un unico file che li unisce.", code: `cat a.fa b.fa > tutti.fa       # unisce i due FASTA
echo "fine" >> log.txt          # aggiunge una riga` },
        { t: "mc", q: "Cosa fa cat a.fa b.fa > tutti.fa?", opts: ["Unisce i due file in tutti.fa", "Confronta i file", "Conta le righe"], mono: 0, a: 0, why: "cat concatena, > scrive l’output nel file." }
    ]}
  ]},
  { title: "Dati genomici", lessons: [
    { id: "s2", title: "FASTA e FASTQ", sub: "grep, head, wc", ex: [
        { t: "info", title: "Guardare dentro un file", text: "I file di sequenze possono essere enormi. Invece di aprirli, se ne guarda un pezzo:", points: ["`head file` mostra le prime 10 righe; `head -n 4 file` le prime 4.", "`tail file` mostra le ultime righe.", "`wc -l file` conta le righe (*word count*, `-l` = *lines*)."], code: `head -n 4 reads.fastq
wc -l reads.fastq` },
        { t: "info", title: "Cercare con grep", text: "`grep testo file` stampa le righe che contengono `testo`. Opzioni utili: `-c` **conta** le righe trovate invece di stamparle; `-v` stampa le righe che **non** lo contengono.\n\nIn un FASTA ogni sequenza ha una riga che inizia con `>`: contarle con `grep -c` dice quante sequenze ci sono. Metti `\">\"` tra virgolette, perché da solo `>` significherebbe “manda l’output in un file”.", code: `grep -c ">" geni.fa      # numero di sequenze
grep "BRCA1" geni.fa     # trova l'header di BRCA1` },
        { t: "mc", q: "Come conti le sequenze in un FASTA?", opts: ["grep -c \">\" file.fa", "wc -c file.fa", "ls file.fa"], mono: 1, a: 0, why: "Ogni sequenza ha un header \">\": basta contarli." },
        { t: "fill", q: "Mostra le prime 10 righe.", code: `___ -n 10 reads.fastq`, bank: ["head", "tail", "top"], ans: ["head"], why: "head mostra l’inizio, tail la fine." },
        { t: "info", title: "Il formato FASTQ", text: "I sequenziatori producono file **FASTQ**: ogni *read* (frammento letto) occupa **4 righe**:", points: ["1. `@` + identificativo della read", "2. la sequenza", "3. `+` (riga separatrice)", "4. la **qualità** di ogni base, codificata con un carattere"], code: `@read1
ACGTTGCA
+
IIIIHHGG` },
        { t: "mc", q: "Quante righe occupa un record FASTQ?", opts: ["4", "2", "1"], mono: 1, a: 0, why: "Header @, sequenza, separatore +, qualità. È lo standard dei sequenziatori moderni (FASTQ molto vecchi potevano andare a capo, oggi è rarissimo)." },
        { t: "info", title: "Fare calcoli in Bash", text: "`$(comando)` esegue un comando e mette il suo **risultato** al suo posto (si chiama *command substitution*). `$(( … ))` calcola un’espressione aritmetica con numeri interi.\n\n`wc -l < file` legge il file senza stamparne il nome, così ottieni solo il numero. Diviso per 4 righe per read, dà il numero di read.", code: `echo $(( 10 / 4 ))                      # 2 (divisione intera)
echo $(( $(wc -l < reads.fastq) / 4 ))   # numero di read` },
        { t: "fill", q: "Calcola il numero di read.", code: `echo $(( $(wc -l < r.fastq) / ___ ))`, bank: ["4", "2", "1"], ans: ["4"], why: "Righe totali diviso 4 righe per record." }
    ]},
    { id: "s3", title: "Pipe", sub: "Comandi in catena", ex: [
        { t: "info", title: "La pipe |", text: "La **pipe** `|` collega due comandi: l’output del primo diventa l’input del secondo. Così si costruiscono catene di piccoli comandi, ognuno con un compito semplice.", code: `grep ">" geni.fa | wc -l      # come grep -c ">"
echo "ATGC" | wc -c           # conta i caratteri: 5`, note: "`echo` aggiunge un a capo alla fine, e anche quello è un carattere: per questo `wc -c` conta 5, non 4." },
        { t: "info", title: "cut, sort, uniq", text: "Tre comandi che si usano spesso insieme sui file a colonne (separati da tab):", points: ["`cut -f1 file` prende la colonna 1 (`-f2` la seconda, `-f1,3` la prima e la terza).", "`sort` ordina le righe.", "`uniq -c` unisce le righe **uguali e consecutive** e le conta."], code: `cut -f1 varianti.tsv | sort | uniq -c`, note: "`uniq` vede solo le righe uguali **adiacenti**: per contare correttamente, l’input va prima ordinato con `sort`." },
        { t: "mc", q: "uniq -c funziona correttamente solo se…", opts: ["L’input è ordinato", "Il file è FASTA", "Si usa sudo"], a: 0, why: "uniq unisce solo righe uguali adiacenti: per questo si mette sort prima." },
        { t: "info", title: "Un esempio: varianti per cromosoma", text: "Un file **VCF** elenca varianti genetiche: le righe che iniziano con `#` sono intestazioni, poi c’è una riga per variante con il cromosoma nella prima colonna.\n\n`grep -v \"^#\"` toglie le intestazioni (`^` = inizio riga); poi si prende la colonna 1, si ordina e si conta.", code: `grep -v "^#" varianti.vcf | cut -f1 | sort | uniq -c` },
        { t: "order", q: "Conta le varianti per cromosoma, saltando l’header del VCF.", lines: ["grep -v \"^#\" varianti.vcf", "| cut -f1", "| sort", "| uniq -c"], why: "Togli i commenti, prendi la colonna CHROM, ordina e conta." },
        { t: "mc", q: "Cosa fa > risultati.txt alla fine di un comando?", opts: ["Scrive l’output nel file", "Legge dal file", "Confronta l’output con il file"], a: 0, why: "> redirige l’output in un file, sovrascrivendolo; >> aggiunge in fondo." },
        { t: "type", q: "Scrivi cosa stampa.", code: `echo "ATGC" | wc -c`, ans: ["5"], why: "4 lettere più il carattere di a capo aggiunto da echo." }
    ]},
    { id: "s5", title: "awk e sed", sub: "Colonne e sostituzioni", ex: [
        { t: "info", title: "awk: lavorare per colonne", text: "**awk** legge un file riga per riga e divide ogni riga in **campi** (colonne). `$1` è il primo campo, `$2` il secondo, e così via; `$0` è la riga intera.\n\nUn programma awk si scrive tra apici singoli: `awk 'condizione {azione}'`. Se manca l’azione, stampa la riga; se manca la condizione, l’azione vale per tutte le righe.", code: `awk '{print $1, $2}' file.tsv     # prime due colonne
awk '$6 > 30' varianti.tsv         # righe con colonna 6 > 30
echo "chr1 100" | awk '{print $2}' # 100` },
        { t: "mc", q: "In awk, cosa indica $2?", opts: ["La seconda colonna", "Il secondo file", "La seconda riga"], mono: 0, a: 0, why: "$0 è l’intera riga." },
        { t: "info", title: "sed: trovare e sostituire", text: "**sed** modifica il testo riga per riga. Il comando più usato è la sostituzione: `s/vecchio/nuovo/`. Senza niente dopo l’ultima `/` sostituisce solo la **prima** occorrenza in ogni riga; con `g` (*global*) le sostituisce tutte.\n\nAnche `vecchio` può essere un pattern: `^chr` significa “chr all’inizio della riga”.", code: `echo "ATTG" | sed 's/T/U/'     # AUTG  (solo la prima)
echo "ATTG" | sed 's/T/U/g'    # AUUG  (tutte)
sed 's/^chr//' file.bed         # toglie "chr" a inizio riga` },
        { t: "fill", q: "Sostituisci T con U.", code: `sed '___/T/U/g' seq.txt`, bank: ["s", "r", "x"], ans: ["s"], why: "s = substitute." },
        { t: "mc", q: "Cosa fa la g finale in sed 's/T/U/g'?", opts: ["Sostituisce tutte le occorrenze nella riga", "Solo la prima", "Ignora maiuscole e minuscole"], a: 0, why: "Senza g si sostituisce solo la prima occorrenza per riga." },
        { t: "type", q: "Scrivi cosa stampa.", code: `echo "chr1 100" | awk '{print $2}'`, ans: ["100"], why: "Seconda colonna." },
        { t: "info", title: "Il separatore di awk", text: "Di default awk divide su spazi **e** tab. Se un valore contiene spazi (es. una descrizione), conviene dire esplicitamente che il separatore è il tab con `-F'\\t'`.", code: `awk -F'\\t' '{print $3}' tabella.tsv` },
        { t: "mc", q: "Cosa imposta awk -F'\\t'?", opts: ["Il separatore di colonna: tab", "Il file di output", "Un filtro"], a: 0, why: "-F sceglie il separatore di campo." }
    ]}
  ]},
  { title: "Automazione", lessons: [
    { id: "s6", title: "Cicli e script", sub: "for, variabili, chmod", ex: [
        { t: "info", title: "Variabili in Bash", text: "Una variabile si crea con `nome=valore`, **senza spazi** attorno all’uguale. Per leggerne il valore si mette `$` davanti: `$nome`.\n\nCon gli spazi (`x = 5`) Bash penserebbe che `x` sia un comando da eseguire con argomenti `=` e `5`, e darebbe errore.", code: `campione=paziente01
echo $campione              # paziente01
echo "file: \${campione}.fq"  # le graffe delimitano il nome`, note: "Metti le variabili tra virgolette doppie (`\"$f\"`) quando possono contenere spazi." },
        { t: "mc", q: "A cosa serve #!/bin/bash all’inizio?", opts: ["Indica quale interprete deve eseguire lo script", "È un commento qualsiasi", "Importa bash"], a: 0, why: "Si chiama shebang." },
        { t: "info", title: "Il ciclo for", text: "Il ciclo `for` ripete gli stessi comandi per ogni elemento di un elenco, spesso un elenco di file ottenuto con il jolly. La struttura è sempre `for … in …; do … done`.", code: `for f in *.fastq; do
    n=$(( $(wc -l < "$f") / 4 ))
    echo "$f: $n read"
done` },
        { t: "fill", q: "Completa il ciclo.", code: `for f in *.fa; ___
    echo $f
done`, bank: ["do", "then", "{"], ans: ["do"], why: "for … ; do … done." },
        { t: "info", title: "Script: salvare i comandi in un file", text: "Uno **script** è un file di testo con dei comandi, di solito con estensione `.sh`. La prima riga `#!/bin/bash` (si chiama *shebang*) dice al sistema quale programma deve eseguirlo.\n\nPer poterlo lanciare direttamente devi renderlo **eseguibile** una volta con `chmod +x`, poi lo avvii con `./nome.sh`, dove `./` significa “nella cartella attuale”.", code: `#!/bin/bash
# conta_reads.sh
for f in *.fastq; do
    echo "$f: $(( $(wc -l < "$f") / 4 ))"
done

# nel terminale:
# chmod +x conta_reads.sh
# ./conta_reads.sh` },
        { t: "mc", q: "Come rendi eseguibile uno script?", opts: ["chmod +x script.sh", "run script.sh", "exec +x script.sh"], mono: 1, a: 0, why: "Poi lo lanci con ./script.sh." },
        { t: "type", q: "Scrivi cosa stampa.", code: `x=5
echo $x`, ans: ["5"], why: "$x legge il valore della variabile." },
        { t: "mc", q: "Cosa succede con x = 5 (con gli spazi) in bash?", opts: ["Errore: in bash non vanno spazi attorno a =", "Assegna 5", "Stampa 5"], a: 0, why: "Bash interpreta x come un comando con argomenti = e 5." }
    ]},
    { id: "s7", title: "Strumenti NGS", sub: "zcat, bwa, samtools", ex: [
        { t: "info", title: "File compressi", text: "I file di sequenziamento sono grandi e quasi sempre **compressi** con gzip (estensione `.gz`). Non serve scompattarli per guardarli: `zcat` li decomprime al volo e manda il risultato sullo schermo o in una pipe.", code: `zcat reads.fastq.gz | head -n 8      # le prime 2 read
zcat reads.fastq.gz | wc -l           # righe totali` },
        { t: "info", title: "Allineare le read: SAM e BAM", text: "**Allineare** significa trovare da quale punto del genoma di riferimento proviene ogni read. Lo fanno programmi come **bwa** o **bowtie2**.\n\nIl risultato è un file **SAM**: una riga per allineamento, con la posizione nel genoma e altre informazioni. Il **BAM** è la stessa cosa in versione binaria compressa: molto più piccolo e veloce da leggere. Si gestiscono con **samtools**.", points: ["`bwa index ref.fa`: prepara l’indice del riferimento (**una volta sola**, prima di allineare).", "`bwa mem ref.fa reads.fq > aln.sam`: allinea.", "`samtools sort -o aln.bam aln.sam`: ordina per posizione e salva in BAM.", "`samtools index aln.bam`: crea l’indice per accedere velocemente a una regione (richiede un BAM **ordinato**)."] },
        { t: "mc", q: "Cos’è un file BAM?", opts: ["La versione binaria compressa di un SAM", "Un FASTA compresso", "Una tabella di varianti"], a: 0, why: "BAM = Binary Alignment Map." },
        { t: "fill", q: "Leggi un file compresso.", code: `___ reads.fastq.gz | head`, bank: ["zcat", "cat", "unzip"], ans: ["zcat"], why: "zcat decomprime al volo verso lo standard output." },
        { t: "mc", q: "Prima di indicizzare un BAM bisogna…", opts: ["Ordinarlo per coordinate", "Convertirlo in FASTA", "Comprimerlo con zip"], a: 0, why: "samtools index richiede un BAM ordinato." },
        { t: "mc", q: "Quale strumento allinea le read a un genoma?", opts: ["bwa / bowtie2", "samtools index", "grep"], mono: 0, a: 0, why: "Gli aligner mappano le read sul riferimento." },
        { t: "order", q: "Indicizza il riferimento, allinea, ordina e indicizza il BAM.", lines: ["bwa index ref.fa", "bwa mem ref.fa reads.fq > aln.sam", "samtools sort -o aln.bam aln.sam", "samtools index aln.bam"], why: "Senza bwa index, bwa mem si ferma con “fail to locate the index files”. Poi: allineamento → ordinamento → indice." },
        { t: "info", title: "Contare gli allineamenti", text: "`samtools view -c aln.bam` conta le **righe di allineamento**. Una read può averne più di una: allineamenti *secondari* (altre posizioni possibili) e *supplementari* (read spezzate in più punti).\n\nPer contare solo gli allineamenti **primari**, uno per read allineata, si escludono gli altri con il filtro `-F 0x900`.", code: `samtools view -c aln.bam            # tutte le righe
samtools view -c -F 0x900 aln.bam   # solo primari` },
        { t: "mc", q: "Cosa conta samtools view -c aln.bam?", opts: ["Le righe di allineamento, compresi secondari e supplementari", "Esattamente il numero di read sequenziate", "I cromosomi"], a: 0, why: "Una read può avere più righe. Per contare solo gli allineamenti primari: samtools view -c -F 0x900." }
    ]},
    { id: "s8s", kind: "sfida", title: "Missione · Il terminale sul tuo computer", sub: "File, grep e pipe dal vivo", ex: [
        { t: "info", title: "Come funziona una missione", text: "Le missioni si svolgono **sul tuo computer**, perché il terminale non può girare dentro l’app. Segui le istruzioni, esegui i comandi e **incolla il risultato** nel riquadro: l’app controlla se è corretto.\n\nCome nelle sfide hai a disposizione suggerimenti e, dopo un paio di tentativi, la soluzione." },
        { t: "info", title: "Aprire il terminale", text: "**Mac**: apri l’app Terminale (la trovi con Spotlight). **Linux**: apri il Terminale. **Windows**: installa **Git Bash** (con Git, da git-scm.com) oppure **WSL**, e apri quello.\n\nCrea una cartella per gli esercizi e spostati dentro:", code: `mkdir -p ~/elica-missioni
cd ~/elica-missioni`, note: "Copia solo i comandi: le righe che iniziano con `#`, che altrove indicano l’output atteso, non vanno eseguite. Sul Mac il terminale usa zsh, che per questi comandi funziona come Bash." },
        {
          t: "task",
          q: "Conta le sequenze",
          text: "Questo comando crea un file FASTA chiamato `prova.fa`. Eseguilo, poi usa **grep** per contare quante sequenze contiene.",
          points: ["Controlla il contenuto con `cat prova.fa`.", "Conta le righe di intestazione con l’opzione giusta di `grep`.", "Scrivi nel riquadro solo il numero."],
          code: `printf ">s1\\nATGC\\n>s2\\nGGCC\\n>s3\\nTTAA\\n" > prova.fa`,
          ans: ["3"],
          hints: ["Ogni sequenza ha una riga che inizia con `>`.", "`grep -c` conta le righe che contengono un testo.", "`grep -c \">\" prova.fa` (le virgolette attorno a `>` sono importanti)."],
          solution: `grep -c ">" prova.fa`,
          why: "Il comando stampa `3`: le righe che contengono `>` sono le tre intestazioni. Senza virgolette, `>` verrebbe interpretato come “manda l’output in un file”."
        },
        {
          t: "task",
          q: "Varianti per cromosoma",
          text: "Questo comando crea un piccolo file di varianti, `v.vcf`, separato da tab, con una riga di intestazione che inizia con `#`.\n\nScrivi una **pipe** che toglie l’intestazione, prende la prima colonna e conta le varianti per cromosoma. Incolla l’output completo.",
          points: ["`grep -v` tiene le righe che **non** contengono il testo; `^#` significa “# all’inizio della riga”.", "Ti servono anche `cut`, `sort` e `uniq -c`."],
          code: `printf "#CHROM\\tPOS\\nchr1\\t10\\nchr2\\t20\\nchr1\\t30\\nchr1\\t40\\n" > v.vcf`,
          ans: ["3 chr1\n1 chr2"],
          multiline: true,
          hints: ["Il primo pezzo è `grep -v \"^#\" v.vcf`.", "Poi `| cut -f1` per la prima colonna.", "Poi `| sort | uniq -c`: `uniq` conta solo le righe uguali consecutive, per questo serve `sort` prima."],
          solution: `grep -v "^#" v.vcf | cut -f1 | sort | uniq -c`,
          why: "L’output è `3 chr1` e `1 chr2`, su due righe (gli spazi prima dei numeri non contano). Ogni comando fa una cosa sola e la pipe li collega: filtra, taglia, ordina, conta."
        }
    ]}
  ]}
  ]
});
