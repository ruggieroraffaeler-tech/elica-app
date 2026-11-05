/* Corso: sh — vedi README per il formato degli esercizi */
ELICA.addCourse({id:'sh',order:50,name:'Bash',lang:'bash',tag:'Il terminale: dove vivono FASTQ, BAM, VCF e le pipeline.',units:[
 {title:'Terminale',lessons:[
  {id:'s1',title:'Muoversi nel sistema',sub:'pwd, ls, cd',ex:[
   {t:'info',title:'Dove sono?',text:'pwd mostra la cartella attuale, ls ne elenca il contenuto, cd ti sposta.',code:`pwd\nls -l\ncd dati/`},
   {t:'mc',q:'Quale comando mostra la cartella corrente?',opts:['pwd','ls','cd'],mono:1,a:0,why:'pwd = print working directory.'},
   {t:'fill',q:'Torna alla cartella superiore.',code:`cd ___`,bank:['..','.','~/'],ans:['..'],why:'.. è la cartella genitore, . quella attuale.'},
   {t:'mc',q:'Cosa mostra ls *.fa?',opts:['Tutti i file che finiscono in .fa','Il file chiamato *.fa','Le cartelle nascoste'],a:0,why:'* è un jolly che corrisponde a qualsiasi testo.'},
   {t:'mc',q:'Dove ti porta cd senza argomenti?',opts:['Nella tua cartella home','Nella cartella radice /','Da nessuna parte'],a:0,why:'cd da solo equivale a cd ~.'}
  ]},
  {id:'s4',title:'File e cartelle',sub:'mkdir, cp, mv, rm',ex:[
   {t:'info',title:'Organizzare i file',text:'mkdir crea cartelle, cp copia, mv sposta o rinomina, rm cancella. less mostra un file pagina per pagina (q per uscire).',code:`mkdir progetto\ncp dati.fa progetto/\nmv progetto/dati.fa progetto/geni.fa\nless progetto/geni.fa`},
   {t:'mc',q:'A cosa serve mv?',opts:['Spostare o rinominare','Copiare','Cancellare'],a:0,why:'Rinominare è uno spostamento con un nome nuovo.'},
   {t:'fill',q:'Cancella una cartella con tutto il contenuto.',code:`___ -r vecchia_cartella`,bank:['rm','del','erase'],ans:['rm'],why:'-r = ricorsivo.'},
   {t:'mc',q:'Cosa fa rm nel terminale?',opts:['Cancella definitivamente, senza cestino','Sposta nel cestino','Chiede sempre conferma'],a:0,why:'Non c’è annulla: attenzione con rm -r.'},
   {t:'mc',q:'Cosa fa cat a.fa b.fa > tutti.fa?',opts:['Unisce i due file in tutti.fa','Confronta i file','Conta le righe'],mono:0,a:0,why:'cat concatena, > scrive l’output nel file.'}
  ]}
 ]},
 {title:'Dati genomici',lessons:[
  {id:'s2',title:'FASTA e FASTQ',sub:'grep, head, wc',ex:[
   {t:'info',title:'Esplorare i file',text:'grep cerca del testo e con -c conta le righe trovate. head mostra l’inizio di un file.',code:`grep -c ">" geni.fa   # numero di sequenze\nhead -n 4 reads.fastq  # il primo record`},
   {t:'mc',q:'Come conti le sequenze in un FASTA?',opts:['grep -c ">" file.fa','wc -c file.fa','ls file.fa'],mono:1,a:0,why:'Ogni sequenza ha un header ">": basta contarli.'},
   {t:'fill',q:'Mostra le prime 10 righe.',code:`___ -n 10 reads.fastq`,bank:['head','tail','top'],ans:['head'],why:'head mostra l’inizio, tail la fine.'},
   {t:'mc',q:'Quante righe occupa un record FASTQ?',opts:['4','2','1'],mono:1,a:0,why:'Header @, sequenza, separatore +, qualità. È lo standard dei sequenziatori moderni (FASTQ molto vecchi potevano andare a capo, oggi è rarissimo).'},
   {t:'fill',q:'Calcola il numero di read.',code:`echo $(( $(wc -l < r.fastq) / ___ ))`,bank:['4','2','1'],ans:['4'],why:'Righe totali diviso 4 righe per record.'}
  ]},
  {id:'s3',title:'Pipe',sub:'Comandi in catena',ex:[
   {t:'info',title:'La pipe |',text:'La pipe passa l’output di un comando come input al successivo.',code:`cut -f1 varianti.tsv | sort | uniq -c`},
   {t:'mc',q:'uniq -c funziona correttamente solo se…',opts:['L’input è ordinato','Il file è FASTA','Si usa sudo'],a:0,why:'uniq unisce solo righe uguali adiacenti: per questo si mette sort prima.'},
   {t:'order',q:'Conta le varianti per cromosoma, saltando l’header del VCF.',lines:['grep -v "^#" varianti.vcf','| cut -f1','| sort','| uniq -c'],why:'Togli i commenti, prendi la colonna CHROM, ordina e conta.'},
   {t:'mc',q:'Cosa fa > risultati.txt alla fine di un comando?',opts:['Scrive l’output nel file','Legge dal file','Confronta l’output con il file'],a:0,why:'> redirige l’output in un file, sovrascrivendolo; >> aggiunge in fondo.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`echo "ATGC" | wc -c`,ans:['5'],why:'4 lettere più il carattere di a capo aggiunto da echo.'}
  ]},
  {id:'s5',title:'awk e sed',sub:'Colonne e sostituzioni',ex:[
   {t:'info',title:'Coltellini svizzeri',text:'awk lavora per colonne ($1, $2…). sed sostituisce testo con s/vecchio/nuovo/.',code:`awk '$6 > 30' varianti.tsv        # qualità > 30\nawk '{print $1, $2}' file.tsv\nsed 's/^chr//' file.bed            # toglie "chr"`},
   {t:'mc',q:'In awk, cosa indica $2?',opts:['La seconda colonna','Il secondo file','La seconda riga'],mono:0,a:0,why:'$0 è l’intera riga.'},
   {t:'fill',q:'Sostituisci T con U.',code:`sed '___/T/U/g' seq.txt`,bank:['s','r','x'],ans:['s'],why:'s = substitute.'},
   {t:'mc',q:'Cosa fa la g finale in sed \'s/T/U/g\'?',opts:['Sostituisce tutte le occorrenze nella riga','Solo la prima','Ignora maiuscole e minuscole'],a:0,why:'Senza g si sostituisce solo la prima occorrenza per riga.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`echo "chr1 100" | awk '{print $2}'`,ans:['100'],why:'Seconda colonna.'},
   {t:'mc',q:'Cosa imposta awk -F\'\\t\'?',opts:['Il separatore di colonna: tab','Il file di output','Un filtro'],a:0,why:'-F sceglie il separatore di campo.'}
  ]}
 ]},
 {title:'Automazione',lessons:[
  {id:'s6',title:'Cicli e script',sub:'for, variabili, chmod',ex:[
   {t:'info',title:'Ripetere su molti file',text:'Un ciclo for applica gli stessi comandi a ogni file. Salvato in un .sh diventa uno script.',code:`#!/bin/bash\nfor f in *.fastq; do\n    n=$(( $(wc -l < "$f") / 4 ))\n    echo "$f: $n read"\ndone`},
   {t:'mc',q:'A cosa serve #!/bin/bash all’inizio?',opts:['Indica quale interprete deve eseguire lo script','È un commento qualsiasi','Importa bash'],a:0,why:'Si chiama shebang.'},
   {t:'fill',q:'Completa il ciclo.',code:`for f in *.fa; ___\n    echo $f\ndone`,bank:['do','then','{'],ans:['do'],why:'for … ; do … done.'},
   {t:'mc',q:'Come rendi eseguibile uno script?',opts:['chmod +x script.sh','run script.sh','exec +x script.sh'],mono:1,a:0,why:'Poi lo lanci con ./script.sh.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`x=5\necho $x`,ans:['5'],why:'$x legge il valore della variabile.'},
   {t:'mc',q:'Cosa succede con x = 5 (con gli spazi) in bash?',opts:['Errore: in bash non vanno spazi attorno a =','Assegna 5','Stampa 5'],a:0,why:'Bash interpreta x come un comando con argomenti = e 5.'}
  ]},
  {id:'s7',title:'Strumenti NGS',sub:'zcat, bwa, samtools',ex:[
   {t:'info',title:'Una mini pipeline',text:'I FASTQ sono spesso compressi (.gz): zcat li legge senza scompattarli. Prima di allineare, il genoma di riferimento va indicizzato una volta con bwa index. Gli allineamenti si salvano in BAM e si gestiscono con samtools.',code:`zcat reads.fastq.gz | head -n 8\nbwa index ref.fa                  # una volta sola per riferimento\nbwa mem ref.fa reads.fq > aln.sam\nsamtools sort -o aln.bam aln.sam\nsamtools index aln.bam\nsamtools view -c aln.bam          # numero di righe di allineamento\nsamtools view -c -F 0x900 aln.bam # solo allineamenti primari`},
   {t:'mc',q:'Cos’è un file BAM?',opts:['La versione binaria compressa di un SAM','Un FASTA compresso','Una tabella di varianti'],a:0,why:'BAM = Binary Alignment Map.'},
   {t:'fill',q:'Leggi un file compresso.',code:`___ reads.fastq.gz | head`,bank:['zcat','cat','unzip'],ans:['zcat'],why:'zcat decomprime al volo verso lo standard output.'},
   {t:'mc',q:'Prima di indicizzare un BAM bisogna…',opts:['Ordinarlo per coordinate','Convertirlo in FASTA','Comprimerlo con zip'],a:0,why:'samtools index richiede un BAM ordinato.'},
   {t:'mc',q:'Quale strumento allinea le read a un genoma?',opts:['bwa / bowtie2','samtools index','grep'],mono:0,a:0,why:'Gli aligner mappano le read sul riferimento.'},
   {t:'order',q:'Indicizza il riferimento, allinea, ordina e indicizza il BAM.',lines:['bwa index ref.fa','bwa mem ref.fa reads.fq > aln.sam','samtools sort -o aln.bam aln.sam','samtools index aln.bam'],why:'Senza bwa index, bwa mem si ferma con “fail to locate the index files”. Poi: allineamento → ordinamento → indice.'},
   {t:'mc',q:'Cosa conta samtools view -c aln.bam?',opts:['Le righe di allineamento, compresi secondari e supplementari','Esattamente il numero di read sequenziate','I cromosomi'],a:0,why:'Una read può avere più righe. Per contare solo gli allineamenti primari: samtools view -c -F 0x900.'}
  ]}
 ]}
]});
