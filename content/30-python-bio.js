/* Corso: bio — vedi README per il formato degli esercizi */
ELICA.addCourse({id:'bio',order:30,name:'Python × Bio',lang:'python',tag:'Sequenze, ORF, k-mer, Biopython e pandas: Python applicato ai dati biologici.',units:[
 {title:'Sequenze',lessons:[
  {id:'b1',title:'Il DNA è una stringa',sub:'count, len, upper',ex:[
   {t:'info',title:'Sequenze come testo',text:'Per Python una sequenza è solo una stringa. count(), len() e upper() bastano per le prime analisi.',code:`dna = "atgcgtaa".upper()\nprint(dna)              # ATGCGTAA\nprint(dna.count("A"))   # 3`},
   {t:'mc',q:'Quanto vale?',code:`"GATTACA".count("A")`,opts:['2','3','4'],mono:1,a:1,why:'G-A-T-T-A-C-A: tre A.'},
   {t:'fill',q:'Stampa la lunghezza della sequenza.',code:`print(___(dna))`,bank:['len','size','count'],ans:['len'],why:'len() restituisce il numero di caratteri.'},
   {t:'mc',q:'Perché si usa .upper() prima di analizzare una sequenza?',opts:['Rende il codice più veloce','I file mescolano maiuscole e minuscole (es. regioni soft-masked)','Python accetta solo maiuscole'],a:1,why:'Nei genomi le minuscole indicano spesso regioni ripetute (soft-masking): normalizzare evita conteggi sbagliati.'},
   {t:'mc',q:'Cosa restituisce?',code:`"TATA" in "GCTATAAAG"`,opts:['True','False','2'],mono:1,a:0,why:'in verifica se una sottostringa è presente, come un motivo TATA box.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print("acgt".upper().count("G"))`,ans:['1'],why:'ACGT contiene una sola G.'}
  ]},
  {id:'b2',title:'Contenuto GC',sub:'La prima metrica di ogni genoma',ex:[
   {t:'info',title:'GC content',text:'GC% = (G + C) / lunghezza × 100. Le coppie G-C hanno tre legami a idrogeno, quindi le regioni ricche in GC sono più stabili.',code:`seq = "ATGCGCGA"\ngc = (seq.count("G") + seq.count("C")) / len(seq)\nprint(round(gc * 100, 1))   # 62.5`},
   {t:'mc',q:'Qual è il GC% di "GGCC"?',opts:['50','100','0'],mono:1,a:1,why:'Tutte e quattro le basi sono G o C.'},
   {t:'fill',q:'Completa il calcolo.',code:`gc = (seq.count("G") + seq.count("C")) ___ len(seq)`,bank:['/','//','*'],ans:['/'],why:'// è la divisione intera: darebbe 0 invece di una frazione.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`seq = "ATAT"\nprint((seq.count("G") + seq.count("C")) / len(seq))`,ans:['0.0'],why:'Nessuna G o C: 0 / 4 = 0.0.'},
   {t:'order',q:'Scrivi la funzione gc_content.',lines:['def gc_content(seq):','    seq = seq.upper()','    g_c = seq.count("G") + seq.count("C")','    return g_c / len(seq)'],why:'Normalizza, conta, poi dividi per la lunghezza.'}
  ]},
  {id:'b3',title:'Complemento inverso',sub:'Dizionari e reversed',ex:[
   {t:'info',title:'L’altro filamento',text:'Il filamento opposto si legge al contrario con le basi appaiate: A↔T, C↔G. Un dizionario mappa ogni base al suo complemento.',code:`comp = {"A": "T", "T": "A", "C": "G", "G": "C"}\nseq = "ATGC"\nrc = "".join(comp[b] for b in reversed(seq))\nprint(rc)   # GCAT`},
   {t:'mc',q:'Qual è il complemento inverso di AAGC?',opts:['TTCG','GCTT','CGAA'],mono:1,a:1,why:'Inverti (CGAA) e complementa (GCTT). TTCG è solo il complemento.'},
   {t:'fill',q:'Inverti la stringa con lo slicing.',code:`rev = seq[___]`,bank:['::-1','-1','::1'],ans:['::-1'],why:'Il passo -1 percorre la stringa al contrario.'},
   {t:'mc',q:'Cosa restituisce comp["G"]?',code:`comp = {"A": "T", "T": "A", "C": "G", "G": "C"}`,opts:['C','G','T'],mono:1,a:0,why:'Un dizionario restituisce il valore associato alla chiave.'},
   {t:'mc',q:'Cosa restituisce?',code:`"".join(["A", "T", "G"])`,opts:['"A T G"','"ATG"','["A","T","G"]'],mono:1,a:1,why:'join unisce gli elementi usando la stringa iniziale (vuota) come separatore.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print("ATTG"[::-1])`,ans:['GTTA'],why:'Lo slicing con passo -1 inverte la stringa.'}
  ]}
 ]},
 {title:'Dal gene alla proteina',lessons:[
  {id:'b4',title:'Trascrizione e traduzione',sub:'replace, range e codoni',ex:[
   {t:'info',title:'Il dogma centrale in tre righe',text:'Trascrizione: T diventa U. Traduzione: l’RNA si legge a triplette, i codoni.',code:`dna = "ATGGCCTAA"\nrna = dna.replace("T", "U")\ncodoni = [rna[i:i+3] for i in range(0, len(rna), 3)]\nprint(codoni)   # ['AUG', 'GCC', 'UAA']`},
   {t:'mc',q:'Cosa restituisce?',code:`"ATGC".replace("T", "U")`,opts:['AUGC','UAGC','ATGC'],mono:1,a:0,why:'replace sostituisce ogni T con U.'},
   {t:'fill',q:'Scorri la sequenza un codone alla volta.',code:`for i in range(0, len(rna), ___):\n    codone = rna[i:i+3]`,bank:['3','1','2'],ans:['3'],why:'Il passo 3 fa saltare da una tripletta alla successiva.'},
   {t:'mc',q:'Cosa codifica AUG?',opts:['Metionina (codone di start)','Un codone di stop','Triptofano'],a:0,why:'AUG avvia la traduzione e codifica la metionina.'},
   {t:'mc',q:'Quale di questi è un codone di stop?',opts:['UAA','AUG','GCC'],mono:1,a:0,why:'I codoni di stop sono UAA, UAG e UGA.'},
   {t:'order',q:'Traduci l’RNA usando il dizionario tabella.',lines:['proteina = ""','for i in range(0, len(rna) - 2, 3):','    codone = rna[i:i+3]','    proteina += tabella[codone]'],why:'Inizializza, scorri a passi di 3, estrai il codone e aggiungi l’amminoacido.'}
  ]},
  {id:'b5',title:'Leggere un FASTA',sub:'Il formato più comune',ex:[
   {t:'info',title:'Il formato FASTA',text:'Ogni record ha un header che inizia con ">", seguito da una o più righe di sequenza.',code:`testo = """>seq1\nATGC\nGGTA\n>seq2\nTTAA"""\nseqs = {}\nfor riga in testo.splitlines():\n    if riga.startswith(">"):\n        nome = riga[1:]\n        seqs[nome] = ""\n    else:\n        seqs[nome] += riga\nprint(seqs)   # {'seq1': 'ATGCGGTA', 'seq2': 'TTAA'}`},
   {t:'fill',q:'Riconosci le righe di header.',code:`if riga.___(">"):`,bank:['startswith','begins','first'],ans:['startswith'],why:'startswith() verifica l’inizio di una stringa.'},
   {t:'mc',q:'Cosa restituisce?',code:`">BRCA1 human"[1:]`,opts:['"BRCA1 human"','">BRCA1"','"BRCA1"'],mono:1,a:0,why:'[1:] toglie solo il primo carattere, il ">".'},
   {t:'mc',q:'Perché le righe di sequenza vanno concatenate?',opts:['Le sequenze lunghe sono spezzate su più righe (spesso 60–80 caratteri)','Per ordinare le basi','Il FASTA vieta le righe lunghe'],a:0,why:'Molti file FASTA vanno a capo a larghezza fissa.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print(">gene1 umano"[1:].split()[0])`,ans:['gene1'],why:'Togli ">" e prendi la prima parola: è l’ID.'}
  ]},
  {id:'b6',title:'Trovare un ORF',sub:'find e frame di lettura',ex:[
   {t:'info',title:'Open Reading Frame',text:'Un ORF va da un ATG al primo codone di stop nello stesso frame. Ogni filamento ha 3 frame di lettura, quindi 6 in totale.',code:`seq = "CCATGAAATTTTAGCC"\nstart = seq.find("ATG")\nfor i in range(start, len(seq) - 2, 3):\n    if seq[i:i+3] in ("TAA", "TAG", "TGA"):\n        print(seq[start:i+3])   # ATGAAATTTTAG\n        break`},
   {t:'mc',q:'Quanti frame di lettura ha un DNA a doppio filamento?',opts:['6','3','1'],a:0,why:'3 frame sul filamento diretto e 3 sul complemento inverso.'},
   {t:'fill',q:'Trova la posizione del primo ATG.',code:`pos = seq.___("ATG")`,bank:['find','index0','search'],ans:['find'],why:'find restituisce l’indice del primo match, o -1.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print("ACGT".find("TTT"))`,ans:['-1'],why:'find restituisce -1 se non trova nulla.'},
   {t:'mc',q:'Perché gli ORF lunghi sono interessanti?',opts:['In una sequenza casuale (basi equiprobabili) uno stop compare circa ogni 21 codoni: un ORF lungo probabilmente codifica una proteina','Sono sempre introni','Hanno più GC'],a:0,why:'3 codoni di stop su 64: in media uno ogni 64/3 ≈ 21 codoni. Nei genomi reali la composizione delle basi sposta un po’ questo numero.'},
   {t:'type',q:'Quanti codoni ci sono? Scrivi cosa stampa.',code:`print(len("ATGAAATAG") // 3)`,ans:['3'],why:'9 basi / 3 = 3 codoni.'}
  ]}
 ]},
 {title:'Confrontare sequenze',lessons:[
  {id:'b7',title:'Mutazioni e Hamming',sub:'zip e confronti',ex:[
   {t:'info',title:'Distanza di Hamming',text:'La distanza di Hamming conta le posizioni diverse tra due sequenze lunghe uguali: è il numero di mutazioni puntiformi.',code:`a = "GAGCCTACTAACGGGAT"\nb = "CATCGTAATGACGGCCT"\nd = sum(x != y for x, y in zip(a, b))\nprint(d)   # 7`},
   {t:'mc',q:'Cosa produce zip("AC", "AG")?',opts:['("A", "A"), ("C", "G")','"AACG"','Errore'],mono:1,a:0,why:'zip accoppia gli elementi alla stessa posizione.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print(sum(x != y for x, y in zip("AAAA", "AATA")))`,ans:['1'],why:'Differiscono solo in posizione 2.'},
   {t:'mc',q:'Una mutazione A→G è…',opts:['Una transizione (purina → purina)','Una transversione','Una delezione'],a:0,why:'Transizioni: A↔G, C↔T. Transversioni: purina ↔ pirimidina.'},
   {t:'fill',q:'Conta le posizioni diverse.',code:`d = sum(x ___ y for x, y in zip(a, b))`,bank:['!=','==','is'],ans:['!='],why:'Ogni True vale 1 nella somma.'},
   {t:'mc',q:'Quanto vale True + True in Python?',opts:['2','True','Errore'],mono:1,a:0,why:'bool è una sottoclasse di int: True vale 1.'}
  ]},
  {id:'b8',title:'k-mer e motivi',sub:'Counter',ex:[
   {t:'info',title:'Contare i k-mer',text:'Un k-mer è una sottostringa lunga k. Contarli serve per l’assemblaggio, la ricerca di motivi e il controllo qualità.',code:`from collections import Counter\nseq = "ACGTACGTAC"\nk = 4\nconteggi = Counter(seq[i:i+k] for i in range(len(seq) - k + 1))\nprint(conteggi.most_common(1))   # [('ACGT', 2)]`},
   {t:'mc',q:'Quanti k-mer ha una sequenza lunga L?',opts:['L - k + 1','L / k','L × k'],a:0,why:'L’ultimo k-mer parte dalla posizione L - k.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`seq = "AAAA"\nprint(len([seq[i:i+2] for i in range(len(seq) - 1)]))`,ans:['3'],why:'4 - 2 + 1 = 3 k-mer: AA, AA, AA.'},
   {t:'fill',q:'Completa l’intervallo dei k-mer.',code:`for i in range(len(seq) - k ___ 1):`,bank:['+','-','*'],ans:['+'],why:'len - k + 1 posizioni di partenza.'},
   {t:'mc',q:'Cosa fa Counter.most_common(3)?',opts:['Restituisce i 3 elementi più frequenti con i conteggi','Conta fino a 3','Toglie i 3 più rari'],a:0,why:'Restituisce una lista di coppie (elemento, conteggio).'}
  ]}
 ]},
 {title:'Strumenti reali',lessons:[
  {id:'b9',title:'Biopython',sub:'Seq e SeqIO',ex:[
   {t:'info',title:'La libreria standard della bioinfo',text:'Biopython offre oggetti Seq con metodi pronti e SeqIO per leggere e scrivere FASTA, FASTQ, GenBank e altri formati.',code:`from Bio import SeqIO\n\nfor rec in SeqIO.parse("geni.fa", "fasta"):\n    print(rec.id, len(rec.seq), rec.seq.translate())`},
   {t:'mc',q:'Cosa restituisce Seq("ATG").reverse_complement()?',opts:['CAT','TAC','GTA'],mono:1,a:0,why:'Il complemento è TAC; letto al contrario diventa CAT.'},
   {t:'fill',q:'Stampa l’identificativo del record.',code:`print(rec.___)`,bank:['id','header0','name_id'],ans:['id'],why:'rec.id è la prima parola dell’header.'},
   {t:'mc',q:'Cosa restituisce Seq("ATGGCCTAA").translate()?',opts:['MA*','MAK','M'],mono:1,a:0,why:'ATG = M, GCC = A, TAA = stop (*).'},
   {t:'mc',q:'Quale formato passi a SeqIO per un file FASTQ?',opts:['"fastq"','"fq-reads"','"illumina"'],mono:1,a:0,why:'Il nome del formato è "fastq".'},
   {t:'order',q:'Salva solo le sequenze più lunghe di 1000 bp.',lines:['from Bio import SeqIO','lunghe = []','for rec in SeqIO.parse("geni.fa", "fasta"):','    if len(rec.seq) > 1000:','        lunghe.append(rec)','SeqIO.write(lunghe, "lunghe.fa", "fasta")'],why:'Leggi, filtra, scrivi.'}
  ]},
  {id:'b10',title:'Tabelle con pandas',sub:'Filtrare risultati',ex:[
   {t:'info',title:'pandas',text:'pandas gestisce tabelle (DataFrame), come i risultati di un’analisi di espressione differenziale.',code:`import pandas as pd\ndf = pd.read_csv("deg.tsv", sep="\\t")\nsig = df[(df["padj"] < 0.05) & (df["log2FC"].abs() > 1)]\nprint(len(sig))`},
   {t:'mc',q:'Quante righe mostra df.head() in pandas?',opts:['5','6','Tutte'],a:0,why:'In pandas 5; head() di R ne mostra 6.'},
   {t:'fill',q:'Leggi un file separato da tab.',code:`df = pd.read_csv("dati.tsv", sep=___)`,bank:['"\\t"','","','tab'],ans:['"\\t"'],why:'\\t è il carattere di tabulazione.'},
   {t:'mc',q:'Perché nei filtri pandas si usa & e non and?',opts:['Combina le condizioni elemento per elemento','and è più lento','È uguale'],a:0,why:'and lavora su un singolo booleano, & su intere colonne.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`import pandas as pd\ndf = pd.DataFrame({"g": ["A", "B", "C"]})\nprint(len(df))`,ans:['3'],why:'len di un DataFrame = numero di righe.'},
   {t:'mc',q:'Cosa fa df.groupby("cromosoma").size()?',opts:['Conta le righe per cromosoma','Ordina per cromosoma','Elimina i duplicati'],a:0,why:'Raggruppa e conta quante righe ha ogni gruppo.'}
  ]}
 ]}
]});
