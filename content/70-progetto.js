/* Percorso: Progetto pipeline genomi batterici
   Si sblocca completando la lezione p6b (Python, Settimana 6). */
ELICA.addCourse({
  id: "proj",
  order: 70,
  name: "Progetto",
  lang: "bash",
  req: {"lesson":"p6b","label":"Python fino alla Settimana 6 (File I/O)"},
  tag: "Costruisci la tua pipeline: due genomi batterici, confronto delle proteine, ricerche iterative e classificazione. Esempio guida: E. coli K-12 (innocuo) contro O157:H7 Sakai (patogeno).",
  units: [
  { title: "Il progetto", lessons: [
    { id: "pr1", title: "Il piano", sub: "Cosa costruiremo", ex: [
        { t: "info", title: "L’obiettivo", text: "Vogliamo confrontare due **genomi batterici**, per esempio un ceppo patogeno e uno innocuo della stessa specie, e trovare le **proteine che ha uno e non l’altro**. Sono i primi candidati per spiegare le differenze: tossine, sistemi di adesione, resistenze.\n\nEsempio guida: *E. coli* K-12, il ceppo innocuo dei laboratori, contro *E. coli* O157:H7 Sakai, che causa gravi infezioni intestinali. Quando fu sequenziato Sakai, il confronto mostrò circa 4,1 Mb di genoma in comune e circa 1,4 Mb presenti solo in O157 (Hayashi et al., 2001)." },
        { t: "info", title: "Le parole da conoscere", text: "Prima di costruire la pipeline:", points: ["**Genoma assemblato** (*assembly*): la sequenza di DNA di un organismo ricostruita dalle read; per un batterio di solito un cromosoma più eventuali **plasmidi** (piccoli DNA circolari).", "**Annotazione**: l’elenco dei geni trovati nel genoma, con le loro posizioni e le proteine che codificano.", "**Omologhe**: proteine che derivano da un antenato comune; si riconoscono perché le loro sequenze si somigliano.", "**Allineamento**: mettere due sequenze una sotto l’altra per far corrispondere le parti simili e misurare quanto si somigliano.", "**Pipeline**: una serie di passaggi automatici in cui l’output di uno diventa l’input del successivo."] },
        { t: "info", title: "La pipeline in un colpo d’occhio", text: "Partiamo dalle proteine del genoma A e le cerchiamo tra quelle di B. Quelle senza corrispondenza passano a ricerche via via più sensibili. Ciò che resta alla fine è specifico di A, e lo classifichiamo con banche dati curate.", code: `genomi A e B
 └─ proteine di A (.faa)
     └─ DIAMOND blastp contro le proteine di B  → con match: comuni
         └─ senza match: candidate
             └─ ricerche più sensibili (tblastn sul DNA di B) → falsi positivi
                 └─ restano le specifiche di A
                     └─ DIAMOND contro VFDB/CARD → classificazione` },
        { t: "mc", q: "Perché ripetere la ricerca delle candidate contro il DNA di B?", opts: ["Per ritrovare geni presenti in B ma non annotati o molto divergenti", "Per tradurre il DNA", "Per velocizzare DIAMOND"], a: 0, why: "Senza questo passaggio molte “proteine uniche” sarebbero falsi positivi." },
        { t: "mc", q: "Nel confronto K-12 contro O157:H7 Sakai cosa ci aspettiamo?", opts: ["Uno scheletro comune di circa 4,1 Mb e circa 1,4 Mb di sequenze specifiche di O157", "Genomi identici", "Nessuna proteina in comune"], a: 0, why: "È il risultato dell’articolo che ha sequenziato Sakai (Hayashi et al., 2001)." },
        { t: "info", title: "Due direzioni, due risposte", text: "Il confronto **non è simmetrico**: “cosa ha A che B non ha” e “cosa ha B che A non ha” sono due domande diverse, con due liste diverse. La pipeline va quindi eseguita in entrambe le direzioni (A→B e B→A)." },
        { t: "mc", q: "In quante direzioni va fatto il confronto?", opts: ["In entrambe: A contro B e B contro A", "Solo A contro B", "Non importa"], a: 0, why: "Le specifiche di A e quelle di B sono due liste diverse." },
        { t: "info", title: "Perché le proteine", text: "Il codice genetico è **ridondante**: più codoni codificano lo stesso amminoacido. Molte mutazioni del DNA (*sinonime*) non cambiano la proteina, quindi due geni omologhi possono differire parecchio nel DNA ma poco nella proteina. Confrontare le proteine trova somiglianze anche tra sequenze più lontane." },
        { t: "mc", q: "Perché confrontare proteine e non solo DNA?", opts: ["Le proteine sono più conservate: le mutazioni sinonime non cambiano gli amminoacidi", "Il DNA non si può allineare", "Le proteine sono più lunghe"], a: 0, why: "Due geni omologhi possono differire molto nel DNA ma poco nella proteina." }
    ]},
    { id: "pr2", title: "Ambiente e cartelle", sub: "conda, bioconda, git", ex: [
        { t: "info", title: "Installare gli strumenti: conda", text: "Gli strumenti bioinformatici (DIAMOND, BLAST…) sono programmi separati, non pacchetti Python. Il modo più semplice per installarli tutti è **conda** (o la sua versione più veloce, **mamba**): un gestore che installa programmi e librerie in **ambienti** separati.\n\nUn **ambiente** è un insieme isolato di programmi con versioni precise: progetti diversi non si disturbano a vicenda. I programmi vengono da **canali**: `conda-forge` (software generale) e `bioconda` (bioinformatica)." },
        { t: "info", title: "environment.yml", text: "Invece di installare a mano, si scrive un file `environment.yml` con l’elenco di cosa serve. Chiunque, compreso te su un altro computer, può ricreare **lo stesso ambiente** con un comando: è la base della **riproducibilità**.", code: `# environment.yml
name: genome-diff
channels:
  - conda-forge
  - bioconda
dependencies:
  - python=3.12
  - biopython
  - pandas
  - ncbi-datasets-cli
  - diamond
  - blast
  - pytest

# nel terminale
conda env create -f environment.yml
conda activate genome-diff`, note: "`conda activate` va ripetuto **ogni volta** che apri un nuovo terminale; prima di attivare l’ambiente, i programmi installati lì non si trovano." },
        { t: "mc", q: "Da quale canale conda arrivano DIAMOND e BLAST?", opts: ["bioconda", "pip", "apt-get"], a: 0, why: "bioconda raccoglie migliaia di strumenti bioinformatici." },
        { t: "info", title: "La struttura del progetto", text: "Una struttura ordinata fin dall’inizio ti risparmia fatica:", points: ["`src/`: il codice;", "`tests/`: i test;", "`data/`: i dati scaricati (fuori da Git);", "`results/`: i risultati (fuori da Git);", "`environment.yml`, `README.md`, `.gitignore` nella cartella principale."] },
        { t: "order", q: "Prepara il progetto da zero.", lines: ["mkdir genome-diff && cd genome-diff", "git init", "mkdir data results src tests", "conda env create -f environment.yml", "conda activate genome-diff"], why: "Cartella, repository, struttura, ambiente." },
        { t: "mc", q: "Perché data/ e results/ vanno nel .gitignore?", opts: ["Sono rigenerabili e spesso grandi", "Git non accetta cartelle", "Per sicurezza"], a: 0, why: "Nella repository va il codice che li produce." },
        { t: "fill", q: "Attiva l’ambiente.", code: `conda ___ genome-diff`, bank: ["activate", "start", "use"], ans: ["activate"], why: "Da quel momento il terminale usa gli strumenti dell’ambiente." }
    ]}
  ]},
  { title: "I dati", lessons: [
    { id: "pr3", title: "Scaricare i genomi", sub: "NCBI datasets e subprocess", ex: [
        { t: "info", title: "NCBI e gli accession", text: "L’**NCBI** (National Center for Biotechnology Information, USA) gestisce le principali banche dati pubbliche di sequenze. Ogni genoma assemblato ha un codice univoco, l’**accession**:", points: ["*E. coli* K-12 MG1655: `GCF_000005845.2`", "*E. coli* O157:H7 Sakai: `GCF_000008865.2`", "Il numero dopo il punto è la **versione** dell’assembly.", "`GCA_` indica un assembly di **GenBank** (depositato da chi l’ha sequenziato); `GCF_` uno di **RefSeq**, la raccolta selezionata e annotata da NCBI. Spesso esistono entrambi con lo stesso numero."] },
        { t: "info", title: "Scaricare con datasets", text: "Lo strumento a riga di comando `datasets` di NCBI scarica un “pacchetto” zip. Con `--include` scegli cosa ci va dentro:", points: ["`genome`: il DNA (`..._genomic.fna`);", "`protein`: le proteine annotate (`protein.faa`);", "`gff3`: le coordinate dei geni (`genomic.gff`)."], code: `datasets download genome accession GCF_000005845.2 \\
    --include genome,protein,gff3 --filename data/k12.zip
unzip data/k12.zip -d data/k12
ls data/k12/ncbi_dataset/data/GCF_000005845.2/`, note: "Il `\\` a fine riga dice al terminale che il comando continua sulla riga dopo." },
        { t: "mc", q: "Cosa contiene protein.faa?", opts: ["Le sequenze delle proteine annotate, in FASTA", "Il genoma", "Le coordinate dei geni"], a: 0, why: "Le coordinate stanno nel .gff, il DNA nel _genomic.fna." },
        { t: "fill", q: "Chiedi anche le proteine.", code: `datasets download genome accession GCF_000008865.2 \\
    --include genome,___,gff3`, bank: ["protein", "aa", "prot"], ans: ["protein"], why: "Si possono chiedere anche cds, rna, gtf." },
        { t: "mc", q: "Cosa indica il prefisso GCF_?", opts: ["Un assembly RefSeq: una copia di un assembly GenBank, selezionata e annotata da NCBI", "Un assembly GenBank", "Un gene"], a: 0, why: "GCA_ = GenBank (depositato da chi ha sequenziato), GCF_ = RefSeq (gestito e annotato da NCBI). Spesso hanno lo stesso numero, come GCA_000008865.2 e GCF_000008865.2." },
        { t: "info", title: "Lanciare programmi da Python", text: "Per automatizzare la pipeline, Python deve poter lanciare i programmi esterni. Si usa `subprocess.run`, passando il comando come **lista di stringhe**: ogni elemento è una parola del comando, così non ci sono problemi con spazi e virgolette.\n\nCon `check=True`, se il programma fallisce Python solleva un’eccezione (`CalledProcessError`) invece di andare avanti come se niente fosse.", code: `import subprocess
risultato = subprocess.run(["echo", "ciao"], check=True, capture_output=True, text=True)
print(risultato.stdout)   # ciao` },
        { t: "order", q: "Lancia il download da Python.", lines: ["import subprocess", "acc = \"GCF_000008865.2\"", "cmd = [\"datasets\", \"download\", \"genome\", \"accession\", acc,", "       \"--include\", \"genome,protein\", \"--filename\", f\"data/{acc}.zip\"]", "subprocess.run(cmd, check=True)"], why: "Il comando è una lista di stringhe: niente problemi con spazi e virgolette." },
        { t: "mc", q: "Cosa fa check=True in subprocess.run?", opts: ["Solleva un’eccezione se il comando fallisce", "Controlla la sintassi", "Chiede conferma"], a: 0, why: "Senza, un download fallito passerebbe in silenzio." }
    ]},
    { id: "pr4", title: "Conoscere i genomi", sub: "Statistiche con Biopython", ex: [
        { t: "info", title: "Prima guarda i dati", text: "Prima di qualsiasi analisi, controlla cosa hai scaricato: è il modo più rapido per scoprire errori, come il genoma sbagliato o un file vuoto. Le domande da farsi:", points: ["quante sequenze contiene il `.fna`? (cromosoma + plasmidi)", "quanto è lungo in totale?", "qual è il contenuto GC?", "quante proteine ci sono nel `.faa`?"] },
        { t: "info", title: "Un riassunto con Biopython", text: "Con `SeqIO.parse` leggi tutte le sequenze del genoma e calcoli le statistiche. Per contare le proteine non serve tenerle tutte in memoria: `sum(1 for _ in …)` aggiunge 1 per ogni record mentre li legge.", code: `from Bio import SeqIO

with open("mini.fna", "w") as f:
    f.write(">chr\\nATGCGCATTA\\n>plasmide\\nGGCC\\n")
with open("mini.faa", "w") as f:
    f.write(">p1\\nMKV\\n>p2\\nMAL\\n")

def riassunto(fna, faa):
    contig = list(SeqIO.parse(fna, "fasta"))
    tot = sum(len(r.seq) for r in contig)
    gc = sum(r.seq.count("G") + r.seq.count("C") for r in contig) / tot
    n_prot = sum(1 for _ in SeqIO.parse(faa, "fasta"))
    return {"contig": len(contig), "bp": tot, "gc": round(gc, 3), "proteine": n_prot}

print(riassunto("mini.fna", "mini.faa"))` },
        { t: "mc", q: "L’assembly di Sakai ha 3 sequenze: un cromosoma e…", opts: ["Due plasmidi (pO157 e pOSAK1)", "Due cromosomi", "Due geni"], a: 0, why: "Anche i plasmidi possono portare geni di virulenza: non dimenticarli." },
        { t: "mc", q: "Perché sum(1 for _ in …) invece di len(list(…))?", opts: ["Conta senza tenere in memoria tutte le sequenze", "È obbligatorio", "Conta solo le proteine lunghe"], a: 0, why: "Con migliaia di record la memoria conta." },
        { t: "fill", q: "Leggi il genoma.", code: `SeqIO.parse(fna, ___)`, bank: ["\"fasta\"", "\"fna\"", "\"dna\""], ans: ["\"fasta\""], why: ".fna e .faa sono entrambi formato FASTA." },
        { t: "type", q: "Scrivi cosa stampa.", code: `tot = 4000 + 1000
gc_bp = 2000 + 500
print(gc_bp / tot)`, ans: ["0.5"], why: "2500 / 5000." },
        { t: "info", title: "Ordini di grandezza", text: "Avere in mente qualche numero aiuta a capire se un risultato è sensato: il genoma di K-12 è di circa **4,6 Mb**, quello di Sakai di circa **5,6 Mb** (cromosoma più due plasmidi). Un genoma batterico contiene in genere qualche migliaio di geni: Sakai ne ha circa 5.000 che codificano proteine." },
        { t: "mc", q: "Quanto è lungo circa il genoma di O157:H7 Sakai?", opts: ["5,6 Mb", "560 kb", "56 Mb"], a: 0, why: "Circa 5,5 Mb di cromosoma più i plasmidi; K-12 è circa 4,6 Mb." }
    ]}
  ]},
  { title: "Il confronto", lessons: [
    { id: "pr5", title: "DIAMOND", sub: "Proteine contro proteine", ex: [
        { t: "info", title: "Come si cercano sequenze simili", text: "**BLAST** è lo strumento classico per cercare sequenze simili a una sequenza di partenza (la **query**) dentro una **banca dati**. Trova regioni simili e le allinea, assegnando a ogni risultato (*hit*) dei numeri che dicono quanto è buono:", points: ["**identità** (`pident`): la percentuale di posizioni uguali nell’allineamento;", "**lunghezza** dell’allineamento e **copertura**: quanta parte della query è allineata;", "**bitscore**: un punteggio, più alto è meglio;", "**e-value**: quanti risultati così buoni ti aspetteresti **per puro caso** in quella banca dati. Più è piccolo, più il risultato è credibile (`1e-50` è molto meglio di `1e-5`)."] },
        { t: "info", title: "DIAMOND", text: "**DIAMOND** fa lo stesso lavoro di BLASTP (proteine contro proteine) ma molto più velocemente: è adatto a confrontare migliaia di proteine. Nella modalità predefinita trova bene le somiglianze forti; per quelle più deboli esistono opzioni più sensibili e lente, come `--sensitive` o `--more-sensitive`. Due passaggi:", points: ["`diamond makedb`: trasforma il FASTA di B in una banca dati;", "`diamond blastp`: cerca le proteine di A (`-q`, query) nella banca dati (`-d`)."], code: `diamond makedb --in data/B.faa -d results/B
diamond blastp -q data/A.faa -d results/B -o results/A_vs_B.tsv \\
    --outfmt 6 --evalue 1e-5 --max-target-seqs 1
# --outfmt 6 = tabella con 12 colonne:
# qseqid sseqid pident length mismatch gapopen
# qstart qend sstart send evalue bitscore`, note: "`blastp` = proteine contro proteine; `blastx` = DNA tradotto contro proteine. Qui le query sono proteine, quindi `blastp`." },
        { t: "mc", q: "Cosa indica la colonna pident?", opts: ["La percentuale di identità dell’allineamento", "La lunghezza della proteina", "Il punteggio"], a: 0, why: "length è la lunghezza dell’allineamento, bitscore il punteggio." },
        { t: "mc", q: "Un e-value di 1e-50, rispetto a 1e-5, è…", opts: ["Molto più significativo", "Meno significativo", "Uguale"], a: 0, why: "L’e-value è il numero di match così buoni attesi per caso: più è piccolo, meglio è." },
        { t: "fill", q: "Cerca proteine contro proteine.", code: `diamond ___ -q A.faa -d B -o hits.tsv`, bank: ["blastp", "blastx", "search"], ans: ["blastp"], why: "blastx traduce una query di DNA; qui le query sono già proteine." },
        { t: "info", title: "Non basta l’e-value", text: "Un e-value bassissimo può venire anche da un solo **dominio** in comune, cioè un pezzo di proteina che ricorre in famiglie diverse. Per dire che una proteina “è presente” in B conviene chiedere anche una buona **identità** e una buona **copertura** della query (es. almeno il 50–70%)." },
        { t: "mc", q: "Perché oltre all’e-value serve la copertura?", opts: ["Un match su un piccolo dominio non significa che la proteina intera sia presente", "L’e-value è sempre sbagliato", "La copertura è più veloce"], a: 0, why: "Copertura = quanta parte della query è allineata." },
        { t: "info", title: "Leggere i risultati con pandas", text: "Il file di `--outfmt 6` è una tabella separata da tab **senza intestazione**: i nomi delle colonne li fornisci tu con `names=`. Poi filtri con le maschere di pandas.", code: `import pandas as pd
with open("A_vs_B.tsv", "w") as f:
    f.write("p1\\tb1\\t100\\t201\\t0\\t0\\t1\\t201\\t1\\t201\\t3e-161\\t431\\n")
    f.write("p3\\tb3\\t35.0\\t80\\t52\\t2\\t1\\t80\\t5\\t84\\t1e-3\\t40\\n")

cols = ["qseqid", "sseqid", "pident", "length", "mismatch", "gapopen",
        "qstart", "qend", "sstart", "send", "evalue", "bitscore"]
hits = pd.read_csv("A_vs_B.tsv", sep="\\t", names=cols)
buoni = hits[(hits["pident"] >= 40) & (hits["evalue"] < 1e-5)]
print(buoni["qseqid"].tolist())   # ['p1']` },
        { t: "order", q: "Leggi e filtra i risultati con pandas.", lines: ["import pandas as pd", "cols = [\"qseqid\", \"sseqid\", \"pident\", \"length\", \"mismatch\", \"gapopen\",", "        \"qstart\", \"qend\", \"sstart\", \"send\", \"evalue\", \"bitscore\"]", "hits = pd.read_csv(\"results/A_vs_B.tsv\", sep=\"\\t\", names=cols)", "buoni = hits[(hits[\"pident\"] >= 40) & (hits[\"evalue\"] < 1e-5)]"], why: "Il file non ha intestazione: i nomi delle colonne li dai tu." }
    ]},
    { id: "pr6", title: "Le proteine senza match", sub: "Differenza tra insiemi", ex: [
        { t: "info", title: "Chi è rimasto fuori: differenza tra insiemi", text: "Le **candidate** sono le proteine di A che **non** hanno un buon match in B. In termini di insiemi: tutte le proteine di A **meno** quelle con match. Con i `set` di Python è un’operazione sola: `tutte - con_match`.\n\nI set sono adatti anche perché il controllo `x in insieme` è velocissimo, anche con migliaia di elementi.", code: `tutte = {"p1", "p2", "p3", "p4"}
con_match = {"p1", "p3"}
candidate = tutte - con_match
print(sorted(candidate))       # ['p2', 'p4']
print(tutte & con_match)        # intersezione: in comune` },
        { t: "type", q: "Scrivi cosa stampa.", code: `a = {"p1", "p2", "p3"}
b = {"p2"}
print(len(a - b))`, ans: ["2"], why: "Restano p1 e p3." },
        { t: "mc", q: "Perché usare un set per con_match?", opts: ["Il controllo “in” su un set è velocissimo", "I set sono ordinati", "Le liste non contengono stringhe"], a: 0, why: "Con migliaia di proteine fa una grande differenza." },
        { t: "info", title: "Salvare le candidate", text: "Per il passaggio successivo servono le **sequenze** delle candidate in un nuovo FASTA: rileggi il file di A, tieni i record con l’id nell’insieme, e scrivili con `SeqIO.write`.", code: `from Bio import SeqIO
with open("A.faa", "w") as f:
    f.write(">p1\\nMKV\\n>p2\\nMAL\\n>p4\\nMSS\\n")
candidate = {"p2", "p4"}
record = [r for r in SeqIO.parse("A.faa", "fasta") if r.id in candidate]
SeqIO.write(record, "candidate.faa", "fasta")
print(len(record))   # 2` },
        { t: "fill", q: "Calcola le candidate.", code: `candidate = tutte ___ con_match`, bank: ["-", "&", "|"], ans: ["-"], why: "& è l’intersezione, | l’unione." },
        { t: "info", title: "Assente o solo nascosta?", text: "Una proteina senza match in B potrebbe essere **davvero assente**, oppure:", points: ["**molto divergente**: è lì, ma così cambiata che la ricerca veloce non la trova;", "**non annotata**: il gene c’è nel DNA di B, ma il programma di annotazione non l’ha riconosciuto, quindi non compare nel `.faa`."] },
        { t: "mc", q: "Una proteina di A senza match in B potrebbe essere…", opts: ["Davvero assente, oppure divergente o non annotata in B", "Sempre un fattore di virulenza", "Un errore di DIAMOND"], a: 0, why: "Per questo serve il passaggio successivo." }
    ]}
  ]},
  { title: "Iterazione e classificazione", lessons: [
    { id: "pr7", title: "Ricerche a cascata", sub: "Ogni pezzo diventa una nuova query", ex: [
        { t: "info", title: "Cercare una proteina nel DNA: tblastn", text: "**tblastn** confronta una proteina con un database di **DNA**, che traduce al volo nei **6 frame** di lettura. Così trova un gene anche dove nessuno l’ha annotato. Il database si prepara con `makeblastdb`, indicando che è di nucleotidi (`-dbtype nucl`).", code: `makeblastdb -in data/B.fna -dbtype nucl -out results/B_nucl
tblastn -query results/candidate.faa -db results/B_nucl \\
    -outfmt 6 -evalue 1e-5 -out results/cand_vs_Bdna.tsv`, note: "Per un database di proteine si usa invece `-dbtype prot`." },
        { t: "mc", q: "Cosa cerca tblastn?", opts: ["Una proteina dentro un database di DNA tradotto in 6 frame", "DNA contro DNA", "Proteine contro proteine"], a: 0, why: "Trova geni anche dove nessuno li ha annotati." },
        { t: "fill", q: "Crea il database dal DNA di B.", code: `makeblastdb -in B.fna -dbtype ___`, bank: ["nucl", "prot", "dna"], ans: ["nucl"], why: "prot è per i database di proteine." },
        { t: "info", title: "L’iterazione: ricerche a cascata", text: "Ecco l’idea centrale del progetto: ogni proteina rimasta diventa una **nuova query** per una ricerca più sensibile. Le ricerche sensibili sono lente, quindi si fanno **solo sulle poche rimaste**: il grosso del lavoro lo fa il primo passaggio veloce.\n\nA ogni passo togli dall’insieme quelle trovate; alla fine restano le proteine specifiche di A.", code: `rimaste = {"a", "b", "c"}
for trovate in [{"a"}, {"c"}]:     # risultati di due passi di ricerca
    rimaste = rimaste - trovate
print(sorted(rimaste))             # ['b']` },
        { t: "mc", q: "Perché fare le ricerche sensibili solo sulle proteine rimaste?", opts: ["Sono lente: le usi solo sui pochi casi dubbi", "Per avere più file", "Perché DIAMOND sbaglia sempre"], a: 0, why: "Il grosso del lavoro lo fa il passaggio veloce." },
        { t: "type", q: "Scrivi cosa stampa.", code: `rimaste = {"a", "b", "c"}
for trovate in [{"a"}, {"c"}]:
    rimaste = rimaste - trovate
print(sorted(rimaste))`, ans: ["['b']"], why: "Il primo passo toglie a, il secondo c." },
        { t: "info", title: "Funzioni come valori", text: "In Python le funzioni sono valori come gli altri: puoi metterle in una lista e chiamarle una dopo l’altra in un ciclo. Così la cascata è una lista di passi; aggiungere un passo vuol dire aggiungere un elemento.", code: `def passo_veloce(q):
    return {"a"}

def passo_sensibile(q):
    return {"c"} & q

rimaste = {"a", "b", "c"}
for passo in [passo_veloce, passo_sensibile]:
    rimaste = rimaste - passo(rimaste)
    print(passo.__name__, "->", sorted(rimaste))` },
        { t: "mc", q: "Si possono mettere funzioni in una lista e chiamarle in un ciclo?", opts: ["Sì: in Python le funzioni sono valori come gli altri", "No, solo stringhe", "Solo con lambda"], a: 0, why: "Così aggiungere un passaggio alla cascata vuol dire aggiungere un elemento alla lista." }
    ]},
    { id: "pr8", title: "Classificare", sub: "VFDB, CARD, eggNOG", ex: [
        { t: "info", title: "Banche dati curate", text: "Per dare un significato alle proteine specifiche si confrontano con banche dati **curate**, cioè controllate da esperti:", points: ["**VFDB** (*Virulence Factor Database*): fattori di virulenza dei batteri patogeni (tossine, adesine, sistemi di secrezione…). Il **set A** contiene i geni di fattori validati sperimentalmente; il **set B** include anche quelli predetti.", "**CARD**: geni di resistenza agli antibiotici.", "**eggNOG-mapper**: assegna a ogni proteina una funzione probabile e una categoria funzionale (COG)."] },
        { t: "info", title: "Il confronto con VFDB", text: "Si scarica dal sito di VFDB (pagina Download) il file delle proteine, si scompatta, si crea il database DIAMOND e si cercano le proteine specifiche. Qui conviene essere **severi**: e-value molto basso, identità e copertura minime.", points: ["`--id 50`: identità almeno 50%;", "`--query-cover 60`: almeno il 60% della query allineato."], code: `gunzip db/VFDB_setB_pro.fas.gz
diamond makedb --in db/VFDB_setB_pro.fas -d db/vfdb
diamond blastp -q results/specifiche_A.faa -d db/vfdb \\
    -o results/A_vfdb.tsv --outfmt 6 \\
    --evalue 1e-10 --id 50 --query-cover 60` },
        { t: "mc", q: "Cosa contiene VFDB?", opts: ["Fattori di virulenza dei batteri patogeni", "Geni umani", "Antibiotici"], a: 0, why: "Virulence Factor DataBase." },
        { t: "info", title: "Cosa aspettarsi da O157:H7", text: "Tra le proteine di Sakai assenti in K-12 ci si aspetta per esempio la **tossina Shiga** (geni `stx`), portata da profagi: virus batterici integrati nel genoma. Geni essenziali come `rpoB` (RNA polimerasi) o `gyrA` (girasi) invece ci sono in tutti gli *E. coli*: se comparissero tra le “specifiche”, sarebbe il segno di un errore nella pipeline." },
        { t: "mc", q: "Quale gene ti aspetti tra le specifiche di O157:H7, assente in K-12?", opts: ["stx, la tossina Shiga", "rpoB, l’RNA polimerasi", "gyrA, la girasi"], a: 0, why: "I geni stx arrivano con dei profagi; rpoB e gyrA sono geni essenziali presenti in tutti gli E. coli." },
        { t: "fill", q: "Richiedi una copertura minima del 60%.", code: `diamond blastp ... --query-___ 60`, bank: ["cover", "len", "span"], ans: ["cover"], why: "--id fissa invece l’identità minima." },
        { t: "mc", q: "Che differenza c’è tra il set A e il set B di VFDB?", opts: ["A contiene i fattori validati sperimentalmente; B include anche quelli predetti", "Sono uguali", "Il set A è solo per E. coli"], a: 0, why: "Il set B trova di più, il set A è più affidabile." },
        { t: "info", title: "Presentare i risultati", text: "Il risultato finale è una **tabella**, una riga per proteina specifica: identificativo, funzione, banca dati in cui ha trovato riscontro, identità, copertura. Accanto, un **riepilogo** per categoria (quante tossine, quante resistenze, quante a funzione ignota…). Chi legge deve capire cosa c’è di diverso e quanto è affidabile." },
        { t: "mc", q: "Come presentare i risultati?", opts: ["Una tabella con proteina, funzione, banca dati e identità, più un riepilogo per categoria", "Solo un numero", "Il TSV grezzo"], a: 0, why: "Chi legge vuole sapere cosa c’è di diverso e quanto è affidabile." }
    ]},
    { id: "pr9", title: "Diventare un tool", sub: "argparse, test, release", ex: [
        { t: "info", title: "Da script a strumento", text: "Uno **strumento** a riga di comando si usa come gli altri programmi: `python diff.py GENOMA_A GENOMA_B --evalue 1e-10`. Il modulo **argparse** legge questi argomenti per te:", points: ["argomenti **posizionali** (obbligatori, nell’ordine): `p.add_argument(\"genoma_a\")`;", "**opzioni** con `--` (facoltative, con un default): `p.add_argument(\"--evalue\", type=float, default=1e-5)`;", "`type=float` converte il testo in numero (altrimenti sarebbe una stringa);", "genera da solo l’aiuto: `python diff.py --help`."], code: `import argparse

def main(argv=None):
    p = argparse.ArgumentParser(description="Proteine specifiche tra due genomi")
    p.add_argument("genoma_a")
    p.add_argument("genoma_b")
    p.add_argument("--evalue", type=float, default=1e-5)
    args = p.parse_args(argv)
    print(args.genoma_a, args.genoma_b, args.evalue)

main(["GCF_000005845.2", "GCF_000008865.2"])   # simula la riga di comando` },
        { t: "mc", q: "Cosa offre argparse rispetto a sys.argv?", opts: ["Gestisce opzioni, tipi e default, e genera --help da solo", "È più veloce", "Non legge i numeri"], a: 0, why: "Con sys.argv dovresti fare tutto a mano." },
        { t: "type", q: "Il tool è lanciato senza --evalue. Cosa stampa print(args.evalue)?", ans: ["1e-05", "1e-5", "0.00001"], why: "Si usa il default; Python stampa 1e-5 come 1e-05." },
        { t: "fill", q: "Converti l’opzione in numero decimale.", code: `p.add_argument("--evalue", ___=float)`, bank: ["type", "kind", "cast"], ans: ["type"], why: "Senza type, args.evalue sarebbe una stringa." },
        { t: "info", title: "Testare una pipeline", text: "Non serve testare DIAMOND: lo hanno già fatto i suoi autori. Si testano le **tue** funzioni Python (lettura delle tabelle, filtri, differenze tra insiemi) su **piccoli file di esempio** scritti apposta, di cui conosci il risultato atteso. Con `pytest` li riesegui a ogni modifica." },
        { t: "mc", q: "Cosa conviene testare con pytest in una pipeline?", opts: ["Le funzioni pure: parsing, filtri, differenze tra insiemi, su piccoli file di esempio", "Solo che DIAMOND sia installato", "Niente: le pipeline non si testano"], a: 0, why: "Le parti in Python sono quelle in cui è più facile sbagliare." },
        { t: "info", title: "Pubblicare una versione", text: "Quando la pipeline funziona: commit, push, poi un **tag** con il numero di versione (si inviano a parte con `git push --tags`). Su GitHub, dal tag puoi creare una **Release** con le note. Il README deve spiegare come installare l’ambiente e lanciare lo strumento con un esempio." },
        { t: "order", q: "Pubblica la versione 0.1.0.", lines: ["git add .", "git commit -m \"Versione 0.1.0 della pipeline\"", "git push", "git tag v0.1.0", "git push --tags"], why: "Commit e push, poi il tag, che va inviato a parte." }
    ]}
  ]}
  ]
});
