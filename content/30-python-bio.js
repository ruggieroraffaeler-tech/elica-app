/* Corso: bio — vedi README per il formato degli esercizi */
ELICA.addCourse({
  id: "bio",
  order: 30,
  name: "Python × Bio",
  lang: "python",
  tag: "Sequenze, ORF, k-mer, Biopython e pandas: Python applicato ai dati biologici.",
  units: [
  { title: "Sequenze", lessons: [
    { id: "b1", title: "Il DNA è una stringa", sub: "count, len, upper", ex: [
        { t: "info", title: "Prima di iniziare", text: "Questo corso usa Python per lavorare con sequenze biologiche. Ti bastano le basi delle **Settimane 0–2** del corso Python: variabili, stringhe, `if`, cicli e funzioni. Ogni lezione ripassa comunque quello che serve.\n\nPer la biologia: il **DNA** è una catena di quattro **basi** (o nucleotidi), indicate con le lettere `A` (adenina), `C` (citosina), `G` (guanina) e `T` (timina). Una sequenza di DNA si scrive quindi come una parola fatta di queste quattro lettere." },
        { t: "info", title: "Una sequenza è una stringa", text: "Per Python una sequenza di DNA è semplicemente una **stringa**. Valgono quindi tutti gli strumenti delle stringhe:", points: ["`len(dna)`: lunghezza in basi (in biologia si dice *bp*, coppie di basi).", "`dna.count(\"A\")`: quante volte compare una base o una sottosequenza.", "`\"TATA\" in dna`: `True` se la sottosequenza è presente.", "`dna.upper()`: tutto in maiuscolo."], code: `dna = "atgcgtaa".upper()
print(dna)              # ATGCGTAA
print(len(dna))         # 8
print(dna.count("A"))   # 3
print("TATA" in "GCTATAAAG")   # True` },
        { t: "mc", q: "Quanto vale?", code: `"GATTACA".count("A")`, opts: ["2", "3", "4"], mono: 1, a: 1, why: "G-A-T-T-A-C-A: tre A." },
        { t: "fill", q: "Stampa la lunghezza della sequenza.", code: `print(___(dna))`, bank: ["len", "size", "count"], ans: ["len"], why: "len() restituisce il numero di caratteri." },
        { t: "info", title: "Perché normalizzare le maiuscole", text: "Nei file dei genomi le lettere minuscole hanno spesso un significato: indicano regioni **ripetute** (si dice *soft-masking*). Per Python però `\"a\"` e `\"A\"` sono caratteri diversi, e `count(\"A\")` non conta le `a` minuscole.\n\nPer questo, prima di analizzare una sequenza, di solito la si converte tutta in maiuscolo con `upper()`.", code: `seq = "ATGaaaTGA"
print(seq.count("A"))           # 2: le 'a' minuscole non contano
print(seq.upper().count("A"))   # 5` },
        { t: "mc", q: "Perché si usa .upper() prima di analizzare una sequenza?", opts: ["Rende il codice più veloce", "I file mescolano maiuscole e minuscole (es. regioni soft-masked)", "Python accetta solo maiuscole"], a: 1, why: "Nei genomi le minuscole indicano spesso regioni ripetute (soft-masking): normalizzare evita conteggi sbagliati." },
        { t: "mc", q: "Cosa restituisce?", code: `"TATA" in "GCTATAAAG"`, opts: ["True", "False", "2"], mono: 1, a: 0, why: "in verifica se una sottostringa è presente, come un motivo TATA box." },
        { t: "type", q: "Scrivi cosa stampa.", code: `print("acgt".upper().count("G"))`, ans: ["1"], why: "ACGT contiene una sola G." }
    ]},
    { id: "b2", title: "Contenuto GC", sub: "La prima metrica di ogni genoma", ex: [
        { t: "info", title: "Cos’è il contenuto GC", text: "Nella doppia elica le basi si appaiano: `A` con `T` (due legami a idrogeno), `G` con `C` (tre legami). Le regioni ricche di G e C sono quindi più stabili.\n\nIl **contenuto GC** è la frazione di basi che sono G o C. Cambia molto tra specie: è una delle prime cose che si misurano su un genoma.\n\n`GC = (numero di G + numero di C) / lunghezza`. Moltiplicando per 100 ottieni la percentuale." },
        { t: "info", title: "Calcolarlo in Python", text: "Si contano G e C con `count`, si sommano e si divide per la lunghezza. Attenzione al tipo di divisione: serve `/`, che dà un decimale.", code: `seq = "ATGCGCGA"
g_c = seq.count("G") + seq.count("C")   # 5
gc = g_c / len(seq)                     # 5 / 8
print(gc)                               # 0.625
print(round(gc * 100, 1))               # 62.5 (%)`, note: "Con `//` (divisione intera) otterresti `0`: è un errore facile da fare." },
        { t: "mc", q: "Qual è il GC% di \"GGCC\"?", opts: ["50", "100", "0"], mono: 1, a: 1, why: "Tutte e quattro le basi sono G o C." },
        { t: "fill", q: "Completa il calcolo.", code: `gc = (seq.count("G") + seq.count("C")) ___ len(seq)`, bank: ["/", "//", "*"], ans: ["/"], why: "// è la divisione intera: darebbe 0 invece di una frazione." },
        { t: "type", q: "Scrivi cosa stampa.", code: `seq = "ATAT"
print((seq.count("G") + seq.count("C")) / len(seq))`, ans: ["0.0"], why: "Nessuna G o C: 0 / 4 = 0.0." },
        { t: "info", title: "Trasformarlo in funzione", text: "Il calcolo diventa una funzione riutilizzabile: riceve una sequenza e **restituisce** il GC. Dentro conviene normalizzare con `upper()`, così funziona anche con le minuscole.", code: `def gc_content(seq):
    seq = seq.upper()
    g_c = seq.count("G") + seq.count("C")
    return g_c / len(seq)

print(gc_content("ggcc"), gc_content("ATAT"))   # 1.0 0.0` },
        { t: "order", q: "Scrivi la funzione gc_content.", lines: ["def gc_content(seq):", "    seq = seq.upper()", "    g_c = seq.count(\"G\") + seq.count(\"C\")", "    return g_c / len(seq)"], why: "Normalizza, conta, poi dividi per la lunghezza." }
    ]},
    { id: "b3", title: "Complemento inverso", sub: "Dizionari e reversed", ex: [
        { t: "info", title: "I due filamenti del DNA", text: "Il DNA è formato da due filamenti appaiati: dove su uno c’è `A`, sull’altro c’è `T`, e dove c’è `G` c’è `C`. Questa regola si chiama **complementarità**.\n\nI due filamenti corrono in **direzioni opposte**: per convenzione si legge ogni filamento da 5′ a 3′. Per ottenere la sequenza dell’altro filamento, letta nel suo verso, servono due passaggi:", points: ["**complementare** ogni base (A↔T, C↔G);", "**invertire** l’ordine."], code: `# filamento:              5' A T G C 3'
# complementare:          3' T A C G 5'
# letto nel suo verso:    5' G C A T 3'   <- complemento inverso` },
        { t: "info", title: "Un dizionario per il complemento", text: "Un dizionario è perfetto per associare ogni base al suo complemento: `comp[\"G\"]` restituisce `\"C\"`.\n\nPer invertire una stringa ci sono due modi: `reversed(seq)` restituisce le basi dall’ultima alla prima, oppure lo slicing con passo negativo `seq[::-1]`.\n\nPer rimettere insieme i caratteri in una stringa si usa `\"\".join(...)`: unisce gli elementi usando come separatore la stringa iniziale, qui vuota.", code: `comp = {"A": "T", "T": "A", "C": "G", "G": "C"}
seq = "ATGC"
rc = "".join(comp[b] for b in reversed(seq))
print(rc)                # GCAT
print(seq[::-1])         # CGTA (solo invertita)
print("".join(["A", "T", "G"]))   # ATG` },
        { t: "mc", q: "Qual è il complemento inverso di AAGC?", opts: ["TTCG", "GCTT", "CGAA"], mono: 1, a: 1, why: "Inverti (CGAA) e complementa (GCTT). TTCG è solo il complemento." },
        { t: "fill", q: "Inverti la stringa con lo slicing.", code: `rev = seq[___]`, bank: ["::-1", "-1", "::1"], ans: ["::-1"], why: "Il passo -1 percorre la stringa al contrario." },
        { t: "mc", q: "Cosa restituisce comp[\"G\"]?", code: `comp = {"A": "T", "T": "A", "C": "G", "G": "C"}`, opts: ["C", "G", "T"], mono: 1, a: 0, why: "Un dizionario restituisce il valore associato alla chiave." },
        { t: "mc", q: "Cosa restituisce?", code: `"".join(["A", "T", "G"])`, opts: ["\"A T G\"", "\"ATG\"", "[\"A\",\"T\",\"G\"]"], mono: 1, a: 1, why: "join unisce gli elementi usando la stringa iniziale (vuota) come separatore." },
        { t: "type", q: "Scrivi cosa stampa.", code: `print("ATTG"[::-1])`, ans: ["GTTA"], why: "Lo slicing con passo -1 inverte la stringa." }
    ]}
  ]},
  { title: "Dal gene alla proteina", lessons: [
    { id: "b4", title: "Trascrizione e traduzione", sub: "replace, range e codoni", ex: [
        { t: "info", title: "Dal DNA alla proteina", text: "Il **dogma centrale** della biologia molecolare: il DNA viene **trascritto** in RNA, e l’RNA (messaggero) viene **tradotto** in proteina.", points: ["**Trascrizione**: l’RNA ha la stessa sequenza del filamento codificante, ma con `U` (uracile) al posto di `T`.", "**Traduzione**: l’RNA si legge a gruppi di tre basi, i **codoni**. Ogni codone corrisponde a un amminoacido o a un segnale di stop.", "`AUG` è il **codone di inizio** (codifica la metionina, `M`); `UAA`, `UAG`, `UGA` sono i **codoni di stop**.", "I codoni possibili sono 4 × 4 × 4 = 64: la tabella che li associa agli amminoacidi si chiama **codice genetico**."] },
        { t: "info", title: "In Python: replace e passi di 3", text: "La trascrizione è una sostituzione: `dna.replace(\"T\", \"U\")`.\n\nPer dividere in codoni si scorre la sequenza **a passi di 3** con `range(0, len(rna), 3)` e si prende ogni volta una fetta di tre caratteri, `rna[i:i+3]`.", code: `dna = "ATGGCCTAA"
rna = dna.replace("T", "U")
print(rna)              # AUGGCCUAA
codoni = [rna[i:i+3] for i in range(0, len(rna), 3)]
print(codoni)           # ['AUG', 'GCC', 'UAA']` },
        { t: "mc", q: "Cosa restituisce?", code: `"ATGC".replace("T", "U")`, opts: ["AUGC", "UAGC", "ATGC"], mono: 1, a: 0, why: "replace sostituisce ogni T con U." },
        { t: "fill", q: "Scorri la sequenza un codone alla volta.", code: `for i in range(0, len(rna), ___):
    codone = rna[i:i+3]`, bank: ["3", "1", "2"], ans: ["3"], why: "Il passo 3 fa saltare da una tripletta alla successiva." },
        { t: "mc", q: "Cosa codifica AUG?", opts: ["Metionina (codone di start)", "Un codone di stop", "Triptofano"], a: 0, why: "AUG avvia la traduzione e codifica la metionina." },
        { t: "mc", q: "Quale di questi è un codone di stop?", opts: ["UAA", "AUG", "GCC"], mono: 1, a: 0, why: "I codoni di stop sono UAA, UAG e UGA." },
        { t: "info", title: "Tradurre con una tabella", text: "Se hai un dizionario `tabella` che associa ogni codone al suo amminoacido (una lettera), la traduzione è un ciclo: per ogni codone aggiungi la lettera corrispondente.\n\nIl `- 2` in `range(0, len(rna) - 2, 3)` evita di prendere un ultimo pezzo incompleto se la lunghezza non è multipla di 3.", code: `tabella = {"AUG": "M", "GCC": "A", "UAA": "*"}   # versione ridotta
rna = "AUGGCCUAA"
proteina = ""
for i in range(0, len(rna) - 2, 3):
    codone = rna[i:i+3]
    proteina += tabella[codone]
print(proteina)   # MA*  (* = stop)` },
        { t: "order", q: "Traduci l’RNA usando il dizionario tabella.", lines: ["proteina = \"\"", "for i in range(0, len(rna) - 2, 3):", "    codone = rna[i:i+3]", "    proteina += tabella[codone]"], why: "Inizializza, scorri a passi di 3, estrai il codone e aggiungi l’amminoacido." }
    ]},
    { id: "b5", title: "Leggere un FASTA", sub: "Il formato più comune", ex: [
        { t: "info", title: "Il formato FASTA", text: "**FASTA** è il formato di testo più usato per le sequenze. Ogni sequenza ha:", points: ["una riga di **intestazione** (*header*) che inizia con `>`, seguita da un identificativo e spesso da una descrizione;", "una o più righe con la **sequenza**. Le sequenze lunghe sono spezzate su più righe, spesso da 60–80 caratteri."], code: `>BRCA1 gene umano
ATGGATTTATCTGCTCTTCG
CGTTGAAGAAGTACAAAATG
>TP53 gene umano
ATGGAGGAGCCGCAGTCAGA` },
        { t: "info", title: "Leggerlo con Python", text: "Si legge riga per riga. Se la riga inizia con `>` è un nuovo header: si prende il nome (togliendo il `>` con `riga[1:]`) e si crea una voce vuota nel dizionario. Altrimenti è un pezzo di sequenza da **aggiungere** alla voce corrente.\n\n`splitlines()` divide un testo in righe; `startswith(\">\")` controlla l’inizio di una stringa.", code: `testo = """>seq1
ATGC
GGTA
>seq2
TTAA"""
seqs = {}
for riga in testo.splitlines():
    if riga.startswith(">"):
        nome = riga[1:]
        seqs[nome] = ""
    else:
        seqs[nome] += riga
print(seqs)   # {'seq1': 'ATGCGGTA', 'seq2': 'TTAA'}` },
        { t: "fill", q: "Riconosci le righe di header.", code: `if riga.___(">"):`, bank: ["startswith", "begins", "first"], ans: ["startswith"], why: "startswith() verifica l’inizio di una stringa." },
        { t: "mc", q: "Cosa restituisce?", code: `">BRCA1 human"[1:]`, opts: ["\"BRCA1 human\"", "\">BRCA1\"", "\"BRCA1\""], mono: 1, a: 0, why: "[1:] toglie solo il primo carattere, il \">\"." },
        { t: "mc", q: "Perché le righe di sequenza vanno concatenate?", opts: ["Le sequenze lunghe sono spezzate su più righe (spesso 60–80 caratteri)", "Per ordinare le basi", "Il FASTA vieta le righe lunghe"], a: 0, why: "Molti file FASTA vanno a capo a larghezza fissa." },
        { t: "info", title: "L’identificativo", text: "Per convenzione l’**identificativo** è la prima parola dell’header, prima del primo spazio; il resto è una descrizione libera. Per prenderlo: togli il `>` e dividi sugli spazi.", code: `header = ">gene1 umano cromosoma 17"
print(header[1:].split()[0])   # gene1` },
        { t: "type", q: "Scrivi cosa stampa.", code: `print(">gene1 umano"[1:].split()[0])`, ans: ["gene1"], why: "Togli \">\" e prendi la prima parola: è l’ID." }
    ]},
    { id: "b6", title: "Trovare un ORF", sub: "find e frame di lettura", ex: [
        { t: "info", title: "Frame di lettura e ORF", text: "Una sequenza si può leggere a codoni partendo dalla prima, dalla seconda o dalla terza base: sono i tre **frame di lettura**. Il filamento opposto ne ha altri tre, quindi un DNA a doppio filamento ne ha **6**.\n\nUn **ORF** (*Open Reading Frame*, cornice di lettura aperta) è un tratto che parte da un codone `ATG` e arriva al primo codone di stop **nello stesso frame**. Gli ORF lunghi sono candidati geni: in una sequenza casuale uno stop compare in media ogni 64/3 ≈ 21 codoni, quindi un ORF lungo difficilmente è un caso." },
        { t: "mc", q: "Quanti frame di lettura ha un DNA a doppio filamento?", opts: ["6", "3", "1"], a: 0, why: "3 frame sul filamento diretto e 3 sul complemento inverso." },
        { t: "info", title: "find: dov’è l’ATG?", text: "`seq.find(\"ATG\")` restituisce la **posizione** (indice) della prima occorrenza, oppure `-1` se non c’è. Da lì si scorre a passi di 3 fino al primo stop.", code: `seq = "CCATGAAATTTTAGCC"
start = seq.find("ATG")          # 2
for i in range(start, len(seq) - 2, 3):
    if seq[i:i+3] in ("TAA", "TAG", "TGA"):
        print(seq[start:i+3])    # ATGAAATTTTAG
        break
print("ACGT".find("TTT"))        # -1` },
        { t: "fill", q: "Trova la posizione del primo ATG.", code: `pos = seq.___("ATG")`, bank: ["find", "index0", "search"], ans: ["find"], why: "find restituisce l’indice del primo match, o -1." },
        { t: "type", q: "Scrivi cosa stampa.", code: `print("ACGT".find("TTT"))`, ans: ["-1"], why: "find restituisce -1 se non trova nulla." },
        { t: "mc", q: "Perché gli ORF lunghi sono interessanti?", opts: ["In una sequenza casuale (basi equiprobabili) uno stop compare circa ogni 21 codoni: un ORF lungo probabilmente codifica una proteina", "Sono sempre introni", "Hanno più GC"], a: 0, why: "3 codoni di stop su 64: in media uno ogni 64/3 ≈ 21 codoni. Nei genomi reali la composizione delle basi sposta un po’ questo numero." },
        { t: "info", title: "Contare i codoni", text: "Un ORF ha una lunghezza multipla di 3: dividendo la lunghezza per 3 con `//` ottieni il numero di codoni, stop compreso.", code: `orf = "ATGAAATAG"
print(len(orf) // 3)   # 3 codoni` },
        { t: "type", q: "Quanti codoni ci sono? Scrivi cosa stampa.", code: `print(len("ATGAAATAG") // 3)`, ans: ["3"], why: "9 basi / 3 = 3 codoni." }
    ]}
  ]},
  { title: "Confrontare sequenze", lessons: [
    { id: "b7", title: "Mutazioni e Hamming", sub: "zip e confronti", ex: [
        { t: "info", title: "Mutazioni puntiformi", text: "Una **mutazione puntiforme** (o sostituzione, o *SNP* se è una variante comune) cambia una sola base. Si distinguono:", points: ["**transizioni**: purina ↔ purina (A ↔ G) o pirimidina ↔ pirimidina (C ↔ T);", "**transversioni**: purina ↔ pirimidina (es. A ↔ C)."], code: `# purine: A, G      pirimidine: C, T
# A -> G  transizione
# A -> T  transversione` },
        { t: "info", title: "zip: scorrere due sequenze insieme", text: "`zip(a, b)` accoppia gli elementi che stanno nella stessa posizione: il primo con il primo, il secondo con il secondo… È perfetto per confrontare due sequenze lettera per lettera.", code: `for x, y in zip("ACGT", "AGGT"):
    print(x, y, x != y)
# A A False / C G True / G G False / T T False` },
        { t: "mc", q: "Cosa produce zip(\"AC\", \"AG\")?", opts: ["(\"A\", \"A\"), (\"C\", \"G\")", "\"AACG\"", "Errore"], mono: 1, a: 0, why: "zip accoppia gli elementi alla stessa posizione." },
        { t: "info", title: "La distanza di Hamming", text: "La **distanza di Hamming** tra due sequenze di uguale lunghezza è il numero di posizioni in cui sono diverse. Si calcola sommando i confronti `x != y`: in Python `True` vale `1` e `False` vale `0`, quindi `sum` li conta.", code: `a = "GAGCCTACTAACGGGAT"
b = "CATCGTAATGACGGCCT"
d = sum(x != y for x, y in zip(a, b))
print(d)            # 7
print(True + True)  # 2` },
        { t: "type", q: "Scrivi cosa stampa.", code: `print(sum(x != y for x, y in zip("AAAA", "AATA")))`, ans: ["1"], why: "Differiscono solo in posizione 2." },
        { t: "mc", q: "Una mutazione A→G è…", opts: ["Una transizione (purina → purina)", "Una transversione", "Una delezione"], a: 0, why: "Transizioni: A↔G, C↔T. Transversioni: purina ↔ pirimidina." },
        { t: "fill", q: "Conta le posizioni diverse.", code: `d = sum(x ___ y for x, y in zip(a, b))`, bank: ["!=", "==", "is"], ans: ["!="], why: "Ogni True vale 1 nella somma." },
        { t: "mc", q: "Quanto vale True + True in Python?", opts: ["2", "True", "Errore"], mono: 1, a: 0, why: "bool è una sottoclasse di int: True vale 1." }
    ]},
    { id: "b8", title: "k-mer e motivi", sub: "Counter", ex: [
        { t: "info", title: "Cosa sono i k-mer", text: "Un **k-mer** è una sottosequenza di lunghezza `k`. Per esempio i 3-mer di `ATGCA` sono `ATG`, `TGC`, `GCA`: si fa scorrere una finestra di `k` lettere una posizione alla volta.\n\nIn una sequenza lunga `L` ci sono `L - k + 1` k-mer, perché l’ultimo parte dalla posizione `L - k`. Contarli serve per l’assemblaggio dei genomi, la ricerca di motivi ricorrenti e il controllo di qualità.", code: `seq = "ATGCA"
k = 3
kmers = [seq[i:i+k] for i in range(len(seq) - k + 1)]
print(kmers)   # ['ATG', 'TGC', 'GCA']` },
        { t: "mc", q: "Quanti k-mer ha una sequenza lunga L?", opts: ["L - k + 1", "L / k", "L × k"], a: 0, why: "L’ultimo k-mer parte dalla posizione L - k." },
        { t: "type", q: "Scrivi cosa stampa.", code: `seq = "AAAA"
print(len([seq[i:i+2] for i in range(len(seq) - 1)]))`, ans: ["3"], why: "4 - 2 + 1 = 3 k-mer: AA, AA, AA." },
        { t: "fill", q: "Completa l’intervallo dei k-mer.", code: `for i in range(len(seq) - k ___ 1):`, bank: ["+", "-", "*"], ans: ["+"], why: "len - k + 1 posizioni di partenza." },
        { t: "info", title: "Contare con Counter", text: "`Counter`, dal modulo `collections`, conta quante volte compare ogni elemento e restituisce una specie di dizionario elemento → conteggio. `most_common(n)` restituisce gli `n` più frequenti, con il loro conteggio.", code: `from collections import Counter
seq = "ACGTACGTAC"
k = 4
conteggi = Counter(seq[i:i+k] for i in range(len(seq) - k + 1))
print(conteggi["ACGT"])          # 2
print(conteggi.most_common(1))   # [('ACGT', 2)]` },
        { t: "mc", q: "Cosa fa Counter.most_common(3)?", opts: ["Restituisce i 3 elementi più frequenti con i conteggi", "Conta fino a 3", "Toglie i 3 più rari"], a: 0, why: "Restituisce una lista di coppie (elemento, conteggio)." }
    ]}
  ]},
  { title: "Strumenti reali", lessons: [
    { id: "b9", title: "Biopython", sub: "Seq e SeqIO", ex: [
        { t: "info", title: "Cos’è Biopython", text: "**Biopython** è una libreria, cioè un pacchetto di codice già scritto, per la bioinformatica in Python. Fa per te molte cose che finora hai scritto a mano: complemento inverso, traduzione con il codice genetico completo, lettura e scrittura di decine di formati.\n\nSi installa una volta dal terminale con `pip install biopython`; nel codice il modulo si chiama `Bio`.", code: `# nel terminale:  pip install biopython
import Bio
print(Bio.__version__)` },
        { t: "info", title: "L’oggetto Seq", text: "`Seq` rappresenta una sequenza. Si usa quasi come una stringa (`len`, indici, `count`), ma ha in più dei metodi biologici:", points: ["`.complement()` complemento; `.reverse_complement()` complemento inverso;", "`.transcribe()` DNA → RNA;", "`.translate()` traduzione con il codice genetico standard (`*` = stop)."], code: `from Bio.Seq import Seq
s = Seq("ATGGCCTAA")
print(s.reverse_complement())   # TTAGGCCAT
print(s.transcribe())           # AUGGCCUAA
print(s.translate())            # MA*
print(Seq("ATG").reverse_complement())   # CAT` },
        { t: "mc", q: "Cosa restituisce Seq(\"ATG\").reverse_complement()?", opts: ["CAT", "TAC", "GTA"], mono: 1, a: 0, why: "Il complemento è TAC; letto al contrario diventa CAT." },
        { t: "info", title: "Leggere file con SeqIO", text: "Il modulo `SeqIO` legge e scrive file di sequenze. `SeqIO.parse(file, formato)` restituisce i record uno alla volta. Ogni record (un oggetto `SeqRecord`) ha:", points: ["`rec.id`: l’identificativo (prima parola dell’header);", "`rec.description`: l’header completo;", "`rec.seq`: la sequenza, come oggetto `Seq`."], code: `from Bio import SeqIO
with open("geni.fa", "w") as f:
    f.write(">gene1 umano\\nATGGCCTAA\\n>gene2 topo\\nATGAAATAG\\n")

for rec in SeqIO.parse("geni.fa", "fasta"):
    print(rec.id, len(rec.seq), rec.seq.translate())` },
        { t: "fill", q: "Stampa l’identificativo del record.", code: `print(rec.___)`, bank: ["id", "header0", "name_id"], ans: ["id"], why: "rec.id è la prima parola dell’header." },
        { t: "mc", q: "Cosa restituisce Seq(\"ATGGCCTAA\").translate()?", opts: ["MA*", "MAK", "M"], mono: 1, a: 0, why: "ATG = M, GCC = A, TAA = stop (*)." },
        { t: "info", title: "Formati e scrittura", text: "Il secondo argomento di `SeqIO.parse` è il **formato**: `\"fasta\"`, `\"fastq\"` (read di sequenziamento con qualità), `\"genbank\"`, e molti altri.\n\n`SeqIO.write(lista_di_record, file, formato)` scrive i record su file: così puoi filtrare un FASTA e salvarne una parte.", code: `from Bio import SeqIO
corte = [r for r in SeqIO.parse("geni.fa", "fasta") if len(r.seq) < 1000]
SeqIO.write(corte, "corte.fa", "fasta")` },
        { t: "mc", q: "Quale formato passi a SeqIO per un file FASTQ?", opts: ["\"fastq\"", "\"fq-reads\"", "\"illumina\""], mono: 1, a: 0, why: "Il nome del formato è \"fastq\"." },
        { t: "order", q: "Salva solo le sequenze più lunghe di 1000 bp.", lines: ["from Bio import SeqIO", "lunghe = []", "for rec in SeqIO.parse(\"geni.fa\", \"fasta\"):", "    if len(rec.seq) > 1000:", "        lunghe.append(rec)", "SeqIO.write(lunghe, \"lunghe.fa\", \"fasta\")"], why: "Leggi, filtra, scrivi." }
    ]},
    { id: "b10", title: "Tabelle con pandas", sub: "Filtrare risultati", ex: [
        { t: "info", title: "Cos’è pandas", text: "**pandas** è la libreria più usata in Python per le **tabelle**, per esempio i risultati di un’analisi di espressione genica. Si installa con `pip install pandas` e per convenzione si importa con il nome corto `pd`.\n\nLa struttura principale è il **DataFrame**: una tabella con righe e colonne con un nome. Ogni colonna è una **Series**, una sequenza di valori dello stesso tipo.", code: `import pandas as pd
df = pd.DataFrame({
    "gene": ["TP53", "MYC", "EGFR"],
    "log2FC": [2.1, -1.4, 0.3],
})
print(df)
print(len(df))           # 3 righe
print(df["gene"])        # una colonna (Series)` },
        { t: "info", title: "Leggere file e guardare i dati", text: "`pd.read_csv(\"file.csv\")` legge un CSV; per un file separato da tab aggiungi `sep=\"\\t\"`.\n\n`df.head()` mostra le prime **5** righe: è il modo rapido per controllare cosa hai caricato. `df.columns` elenca le colonne, `df.shape` dà (righe, colonne).", code: `import pandas as pd
with open("deg.tsv", "w") as f:
    f.write("gene\\tlog2FC\\tpadj\\nTP53\\t2.1\\t0.001\\nMYC\\t-1.4\\t0.03\\nEGFR\\t0.3\\t0.6\\n")

df = pd.read_csv("deg.tsv", sep="\\t")
print(df.head())
print(df.shape)     # (3, 3)` },
        { t: "mc", q: "Quante righe mostra df.head() in pandas?", opts: ["5", "6", "Tutte"], a: 0, why: "In pandas 5; head() di R ne mostra 6." },
        { t: "fill", q: "Leggi un file separato da tab.", code: `df = pd.read_csv("dati.tsv", sep=___)`, bank: ["\"\\t\"", "\",\"", "tab"], ans: ["\"\\t\""], why: "\\t è il carattere di tabulazione." },
        { t: "info", title: "Filtrare le righe", text: "Un confronto su una colonna produce una **maschera**: una colonna di `True`/`False`, una per riga. Mettendola tra parentesi quadre tieni solo le righe `True`.\n\nPer combinare più condizioni si usano `&` (e), `|` (o), `~` (non), con **ogni condizione tra parentesi**. `and`/`or` non funzionano qui: lavorano su un singolo vero/falso, non su intere colonne.", code: `sig = df[(df["padj"] < 0.05) & (df["log2FC"].abs() > 1)]
print(sig["gene"].tolist())   # ['TP53', 'MYC']` },
        { t: "mc", q: "Perché nei filtri pandas si usa & e non and?", opts: ["Combina le condizioni elemento per elemento", "and è più lento", "È uguale"], a: 0, why: "and lavora su un singolo booleano, & su intere colonne." },
        { t: "type", q: "Scrivi cosa stampa.", code: `import pandas as pd
df = pd.DataFrame({"g": ["A", "B", "C"]})
print(len(df))`, ans: ["3"], why: "len di un DataFrame = numero di righe." },
        { t: "info", title: "Raggruppare", text: "`df.groupby(\"colonna\")` divide le righe in gruppi con lo stesso valore in quella colonna; poi applichi un calcolo a ogni gruppo: `.size()` conta le righe, `.mean()` fa la media, e così via.", code: `import pandas as pd
v = pd.DataFrame({"cromosoma": ["1", "1", "2"], "qualita": [50, 30, 40]})
print(v.groupby("cromosoma").size())            # 1 -> 2, 2 -> 1
print(v.groupby("cromosoma")["qualita"].mean())` },
        { t: "mc", q: "Cosa fa df.groupby(\"cromosoma\").size()?", opts: ["Conta le righe per cromosoma", "Ordina per cromosoma", "Elimina i duplicati"], a: 0, why: "Raggruppa e conta quante righe ha ogni gruppo." }
    ]}
  ]}
  ]
});
