/* Percorso: Progetto pipeline genomi batterici
   Si sblocca completando la lezione p6b (Python, Settimana 6). */
ELICA.addCourse({id:'proj',order:70,name:'Progetto',lang:'bash',req:{lesson:'p6b',label:'Python fino alla Settimana 6 (File I/O)'},tag:'Costruisci la tua pipeline: due genomi batterici, confronto delle proteine, ricerche iterative e classificazione. Esempio guida: E. coli K-12 (innocuo) contro O157:H7 Sakai (patogeno).',units:[
 {title:'Il progetto',lessons:[
  {id:'pr1',title:'Il piano',sub:'Cosa costruiremo',ex:[
   {t:'info',title:'La pipeline in un colpo d’occhio',text:'Si parte dalle proteine del genoma A e si cercano nel genoma B. Quelle senza corrispondenza passano a ricerche via via più sensibili. Ciò che resta è specifico di A e si classifica con banche dati curate.',code:`genomi A e B\n └─ proteine di A (.faa)\n     └─ DIAMOND blastp contro le proteine di B  → con match: comuni\n         └─ senza match: candidate\n             └─ ricerche più sensibili (tblastn sul DNA di B) → falsi positivi\n                 └─ restano le specifiche di A\n                     └─ DIAMOND contro VFDB/CARD → classificazione`},
   {t:'mc',q:'Perché ripetere la ricerca delle candidate contro il DNA di B?',opts:['Per ritrovare geni presenti in B ma non annotati o molto divergenti','Per tradurre il DNA','Per velocizzare DIAMOND'],a:0,why:'Senza questo passaggio molte “proteine uniche” sarebbero falsi positivi.'},
   {t:'mc',q:'Nel confronto K-12 contro O157:H7 Sakai cosa ci aspettiamo?',opts:['Uno scheletro comune di circa 4,1 Mb e circa 1,4 Mb di sequenze specifiche di O157','Genomi identici','Nessuna proteina in comune'],a:0,why:'È il risultato dell’articolo che ha sequenziato Sakai (Hayashi et al., 2001).'},
   {t:'mc',q:'In quante direzioni va fatto il confronto?',opts:['In entrambe: A contro B e B contro A','Solo A contro B','Non importa'],a:0,why:'Le specifiche di A e quelle di B sono due liste diverse.'},
   {t:'mc',q:'Perché confrontare proteine e non solo DNA?',opts:['Le proteine sono più conservate: le mutazioni sinonime non cambiano gli amminoacidi','Il DNA non si può allineare','Le proteine sono più lunghe'],a:0,why:'Due geni omologhi possono differire molto nel DNA ma poco nella proteina.'}
  ]},
  {id:'pr2',title:'Ambiente e cartelle',sub:'conda, bioconda, git',ex:[
   {t:'info',title:'Un ambiente riproducibile',text:'Gli strumenti bioinformatici si installano con conda (o mamba) dai canali conda-forge e bioconda. Il file environment.yml descrive tutto: chiunque può ricreare lo stesso ambiente.',code:`# environment.yml\nname: genome-diff\nchannels:\n  - conda-forge\n  - bioconda\ndependencies:\n  - python=3.12\n  - biopython\n  - pandas\n  - ncbi-datasets-cli\n  - diamond\n  - blast\n  - pytest\n\n# nel terminale\nconda env create -f environment.yml\nconda activate genome-diff`},
   {t:'mc',q:'Da quale canale conda arrivano DIAMOND e BLAST?',opts:['bioconda','pip','apt-get'],a:0,why:'bioconda raccoglie migliaia di strumenti bioinformatici.'},
   {t:'order',q:'Prepara il progetto da zero.',lines:['mkdir genome-diff && cd genome-diff','git init','mkdir data results src tests','conda env create -f environment.yml','conda activate genome-diff'],why:'Cartella, repository, struttura, ambiente.'},
   {t:'mc',q:'Perché data/ e results/ vanno nel .gitignore?',opts:['Sono rigenerabili e spesso grandi','Git non accetta cartelle','Per sicurezza'],a:0,why:'Nella repository va il codice che li produce.'},
   {t:'fill',q:'Attiva l’ambiente.',code:`conda ___ genome-diff`,bank:['activate','start','use'],ans:['activate'],why:'Da quel momento il terminale usa gli strumenti dell’ambiente.'}
  ]}
 ]},
 {title:'I dati',lessons:[
  {id:'pr3',title:'Scaricare i genomi',sub:'NCBI datasets e subprocess',ex:[
   {t:'info',title:'Accession e download',text:'Ogni assembly NCBI ha un accession. E. coli K-12 MG1655: GCF_000005845.2. E. coli O157:H7 Sakai: GCF_000008865.2.',code:`datasets download genome accession GCF_000005845.2 \\\n    --include genome,protein,gff3 --filename data/k12.zip\nunzip data/k12.zip -d data/k12\nls data/k12/ncbi_dataset/data/GCF_000005845.2/\n# GCF_000005845.2_ASM584v2_genomic.fna  genomic.gff  protein.faa`},
   {t:'mc',q:'Cosa contiene protein.faa?',opts:['Le sequenze delle proteine annotate, in FASTA','Il genoma','Le coordinate dei geni'],a:0,why:'Le coordinate stanno nel .gff, il DNA nel _genomic.fna.'},
   {t:'fill',q:'Chiedi anche le proteine.',code:`datasets download genome accession GCF_000008865.2 \\\n    --include genome,___,gff3`,bank:['protein','aa','prot'],ans:['protein'],why:'Si possono chiedere anche cds, rna, gtf.'},
   {t:'mc',q:'Cosa indica il prefisso GCF_?',opts:['Un assembly RefSeq: una copia di un assembly GenBank, selezionata e annotata da NCBI','Un assembly GenBank','Un gene'],a:0,why:'GCA_ = GenBank (depositato da chi ha sequenziato), GCF_ = RefSeq (gestito e annotato da NCBI). Spesso hanno lo stesso numero, come GCA_000008865.2 e GCF_000008865.2.'},
   {t:'order',q:'Lancia il download da Python.',lines:['import subprocess','acc = "GCF_000008865.2"','cmd = ["datasets", "download", "genome", "accession", acc,','       "--include", "genome,protein", "--filename", f"data/{acc}.zip"]','subprocess.run(cmd, check=True)'],why:'Il comando è una lista di stringhe: niente problemi con spazi e virgolette.'},
   {t:'mc',q:'Cosa fa check=True in subprocess.run?',opts:['Solleva un’eccezione se il comando fallisce','Controlla la sintassi','Chiede conferma'],a:0,why:'Senza, un download fallito passerebbe in silenzio.'}
  ]},
  {id:'pr4',title:'Conoscere i genomi',sub:'Statistiche con Biopython',ex:[
   {t:'info',title:'Prima guarda i dati',text:'Prima di confrontare, controlla cosa hai scaricato: quante sequenze (cromosoma e plasmidi), lunghezza totale, GC, numero di proteine.',code:`from Bio import SeqIO\n\ndef riassunto(fna, faa):\n    contig = list(SeqIO.parse(fna, "fasta"))\n    tot = sum(len(r.seq) for r in contig)\n    gc = sum(r.seq.count("G") + r.seq.count("C") for r in contig) / tot\n    n_prot = sum(1 for _ in SeqIO.parse(faa, "fasta"))\n    return {"contig": len(contig), "bp": tot,\n            "gc": round(gc, 3), "proteine": n_prot}`},
   {t:'mc',q:'L’assembly di Sakai ha 3 sequenze: un cromosoma e…',opts:['Due plasmidi (pO157 e pOSAK1)','Due cromosomi','Due geni'],a:0,why:'Anche i plasmidi possono portare geni di virulenza: non dimenticarli.'},
   {t:'mc',q:'Perché sum(1 for _ in …) invece di len(list(…))?',opts:['Conta senza tenere in memoria tutte le sequenze','È obbligatorio','Conta solo le proteine lunghe'],a:0,why:'Con migliaia di record la memoria conta.'},
   {t:'fill',q:'Leggi il genoma.',code:`SeqIO.parse(fna, ___)`,bank:['"fasta"','"fna"','"dna"'],ans:['"fasta"'],why:'.fna e .faa sono entrambi formato FASTA.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`tot = 4000 + 1000\ngc_bp = 2000 + 500\nprint(gc_bp / tot)`,ans:['0.5'],why:'2500 / 5000.'},
   {t:'mc',q:'Quanto è lungo circa il genoma di O157:H7 Sakai?',opts:['5,6 Mb','560 kb','56 Mb'],a:0,why:'Circa 5,5 Mb di cromosoma più i plasmidi; K-12 è circa 4,6 Mb.'}
  ]}
 ]},
 {title:'Il confronto',lessons:[
  {id:'pr5',title:'DIAMOND',sub:'Proteine contro proteine',ex:[
   {t:'info',title:'Un BLASTP molto più veloce',text:'Si crea un database dalle proteine di B e ci si cercano quelle di A. Con --outfmt 6 il risultato è una tabella di 12 colonne.',code:`diamond makedb --in data/B.faa -d results/B\ndiamond blastp -q data/A.faa -d results/B -o results/A_vs_B.tsv \\\n    --outfmt 6 --evalue 1e-5 --max-target-seqs 1\n# colonne: qseqid sseqid pident length mismatch gapopen\n#          qstart qend sstart send evalue bitscore`},
   {t:'mc',q:'Cosa indica la colonna pident?',opts:['La percentuale di identità dell’allineamento','La lunghezza della proteina','Il punteggio'],a:0,why:'length è la lunghezza dell’allineamento, bitscore il punteggio.'},
   {t:'mc',q:'Un e-value di 1e-50, rispetto a 1e-5, è…',opts:['Molto più significativo','Meno significativo','Uguale'],a:0,why:'L’e-value è il numero di match così buoni attesi per caso: più è piccolo, meglio è.'},
   {t:'fill',q:'Cerca proteine contro proteine.',code:`diamond ___ -q A.faa -d B -o hits.tsv`,bank:['blastp','blastx','search'],ans:['blastp'],why:'blastx traduce una query di DNA; qui le query sono già proteine.'},
   {t:'mc',q:'Perché oltre all’e-value serve la copertura?',opts:['Un match su un piccolo dominio non significa che la proteina intera sia presente','L’e-value è sempre sbagliato','La copertura è più veloce'],a:0,why:'Copertura = quanta parte della query è allineata.'},
   {t:'order',q:'Leggi e filtra i risultati con pandas.',lines:['import pandas as pd','cols = ["qseqid", "sseqid", "pident", "length", "mismatch", "gapopen",','        "qstart", "qend", "sstart", "send", "evalue", "bitscore"]','hits = pd.read_csv("results/A_vs_B.tsv", sep="\\t", names=cols)','buoni = hits[(hits["pident"] >= 40) & (hits["evalue"] < 1e-5)]'],why:'Il file non ha intestazione: i nomi delle colonne li dai tu.'}
  ]},
  {id:'pr6',title:'Le proteine senza match',sub:'Differenza tra insiemi',ex:[
   {t:'info',title:'Chi è rimasto fuori?',text:'Le candidate specifiche di A sono le proteine di A che non compaiono tra quelle con un buon match: una differenza tra insiemi.',code:`from Bio import SeqIO\n\ntutte = {r.id for r in SeqIO.parse("data/A.faa", "fasta")}\ncon_match = set(buoni["qseqid"])\ncandidate = tutte - con_match\nprint(len(candidate), "proteine candidate")\n\nrecord = [r for r in SeqIO.parse("data/A.faa", "fasta") if r.id in candidate]\nSeqIO.write(record, "results/candidate.faa", "fasta")`},
   {t:'type',q:'Scrivi cosa stampa.',code:`a = {"p1", "p2", "p3"}\nb = {"p2"}\nprint(len(a - b))`,ans:['2'],why:'Restano p1 e p3.'},
   {t:'mc',q:'Perché usare un set per con_match?',opts:['Il controllo “in” su un set è velocissimo','I set sono ordinati','Le liste non contengono stringhe'],a:0,why:'Con migliaia di proteine fa una grande differenza.'},
   {t:'fill',q:'Calcola le candidate.',code:`candidate = tutte ___ con_match`,bank:['-','&','|'],ans:['-'],why:'& è l’intersezione, | l’unione.'},
   {t:'mc',q:'Una proteina di A senza match in B potrebbe essere…',opts:['Davvero assente, oppure divergente o non annotata in B','Sempre un fattore di virulenza','Un errore di DIAMOND'],a:0,why:'Per questo serve il passaggio successivo.'}
  ]}
 ]},
 {title:'Iterazione e classificazione',lessons:[
  {id:'pr7',title:'Ricerche a cascata',sub:'Ogni pezzo diventa una nuova query',ex:[
   {t:'info',title:'Sempre più sensibili, sempre meno query',text:'Le candidate passano per ricerche via via più sensibili, ma più lente. Ogni passaggio riceve come query solo le proteine rimaste. L’ultimo cerca le proteine dentro il DNA di B tradotto in 6 frame (tblastn).',code:`makeblastdb -in data/B.fna -dbtype nucl -out results/B_nucl\ntblastn -query results/candidate.faa -db results/B_nucl \\\n    -outfmt 6 -evalue 1e-5 -out results/cand_vs_Bdna.tsv\n\n# in Python\nrimaste = candidate\nfor passo in [diamond_sensibile, tblastn_su_dna]:\n    trovate = passo(rimaste)\n    rimaste = rimaste - trovate\n    print(passo.__name__, "->", len(rimaste), "rimaste")`},
   {t:'mc',q:'Cosa cerca tblastn?',opts:['Una proteina dentro un database di DNA tradotto in 6 frame','DNA contro DNA','Proteine contro proteine'],a:0,why:'Trova geni anche dove nessuno li ha annotati.'},
   {t:'fill',q:'Crea il database dal DNA di B.',code:`makeblastdb -in B.fna -dbtype ___`,bank:['nucl','prot','dna'],ans:['nucl'],why:'prot è per i database di proteine.'},
   {t:'mc',q:'Perché fare le ricerche sensibili solo sulle proteine rimaste?',opts:['Sono lente: le usi solo sui pochi casi dubbi','Per avere più file','Perché DIAMOND sbaglia sempre'],a:0,why:'Il grosso del lavoro lo fa il passaggio veloce.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`rimaste = {"a", "b", "c"}\nfor trovate in [{"a"}, {"c"}]:\n    rimaste = rimaste - trovate\nprint(sorted(rimaste))`,ans:["['b']"],why:'Il primo passo toglie a, il secondo c.'},
   {t:'mc',q:'Si possono mettere funzioni in una lista e chiamarle in un ciclo?',opts:['Sì: in Python le funzioni sono valori come gli altri','No, solo stringhe','Solo con lambda'],a:0,why:'Così aggiungere un passaggio alla cascata vuol dire aggiungere un elemento alla lista.'}
  ]},
  {id:'pr8',title:'Classificare',sub:'VFDB, CARD, eggNOG',ex:[
   {t:'info',title:'Dare un nome alle differenze',text:'Le proteine rimaste si confrontano con banche dati curate: VFDB per i fattori di virulenza, CARD per l’antibiotico-resistenza. eggNOG-mapper assegna funzioni e categorie COG.',code:`# dal sito di VFDB (Download) scarica le proteine del full dataset (set B)\ngunzip db/VFDB_setB_pro.fas.gz\ndiamond makedb --in db/VFDB_setB_pro.fas -d db/vfdb\ndiamond blastp -q results/specifiche_A.faa -d db/vfdb \\\n    -o results/A_vfdb.tsv --outfmt 6 \\\n    --evalue 1e-10 --id 50 --query-cover 60`},
   {t:'mc',q:'Cosa contiene VFDB?',opts:['Fattori di virulenza dei batteri patogeni','Geni umani','Antibiotici'],a:0,why:'Virulence Factor DataBase.'},
   {t:'mc',q:'Quale gene ti aspetti tra le specifiche di O157:H7, assente in K-12?',opts:['stx, la tossina Shiga','rpoB, l’RNA polimerasi','gyrA, la girasi'],a:0,why:'I geni stx arrivano con dei profagi; rpoB e gyrA sono geni essenziali presenti in tutti gli E. coli.'},
   {t:'fill',q:'Richiedi una copertura minima del 60%.',code:`diamond blastp ... --query-___ 60`,bank:['cover','len','span'],ans:['cover'],why:'--id fissa invece l’identità minima.'},
   {t:'mc',q:'Che differenza c’è tra il set A e il set B di VFDB?',opts:['A contiene i fattori validati sperimentalmente; B include anche quelli predetti','Sono uguali','Il set A è solo per E. coli'],a:0,why:'Il set B trova di più, il set A è più affidabile.'},
   {t:'mc',q:'Come presentare i risultati?',opts:['Una tabella con proteina, funzione, banca dati e identità, più un riepilogo per categoria','Solo un numero','Il TSV grezzo'],a:0,why:'Chi legge vuole sapere cosa c’è di diverso e quanto è affidabile.'}
  ]},
  {id:'pr9',title:'Diventare un tool',sub:'argparse, test, release',ex:[
   {t:'info',title:'Un comando vero',text:'argparse legge le opzioni dalla riga di comando, ogni passaggio è una funzione testata, il README spiega come usarla. Poi il tag v0.1.0 su GitHub.',code:`import argparse\n\ndef main():\n    p = argparse.ArgumentParser(description="Proteine specifiche tra due genomi")\n    p.add_argument("genoma_a")\n    p.add_argument("genoma_b")\n    p.add_argument("--evalue", type=float, default=1e-5)\n    args = p.parse_args()\n    esegui(args.genoma_a, args.genoma_b, args.evalue)\n\nif __name__ == "__main__":\n    main()`},
   {t:'mc',q:'Cosa offre argparse rispetto a sys.argv?',opts:['Gestisce opzioni, tipi e default, e genera --help da solo','È più veloce','Non legge i numeri'],a:0,why:'Con sys.argv dovresti fare tutto a mano.'},
   {t:'type',q:'Il tool è lanciato senza --evalue. Cosa stampa print(args.evalue)?',ans:['1e-05','1e-5','0.00001'],why:'Si usa il default; Python stampa 1e-5 come 1e-05.'},
   {t:'fill',q:'Converti l’opzione in numero decimale.',code:`p.add_argument("--evalue", ___=float)`,bank:['type','kind','cast'],ans:['type'],why:'Senza type, args.evalue sarebbe una stringa.'},
   {t:'mc',q:'Cosa conviene testare con pytest in una pipeline?',opts:['Le funzioni pure: parsing, filtri, differenze tra insiemi, su piccoli file di esempio','Solo che DIAMOND sia installato','Niente: le pipeline non si testano'],a:0,why:'Le parti in Python sono quelle in cui è più facile sbagliare.'},
   {t:'order',q:'Pubblica la versione 0.1.0.',lines:['git add .','git commit -m "Versione 0.1.0 della pipeline"','git push','git tag v0.1.0','git push --tags'],why:'Commit e push, poi il tag, che va inviato a parte.'}
  ]}
 ]}
]});
