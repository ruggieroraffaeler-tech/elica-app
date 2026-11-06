/* Corso: r — vedi README per il formato degli esercizi */
ELICA.addCourse({
  id: "r",
  order: 40,
  name: "R",
  lang: "r",
  tag: "Statistica, tidyverse e Bioconductor per l’analisi dei dati omici.",
  units: [
  { title: "Le basi di R", lessons: [
    { id: "r1", title: "Vettori", sub: "c(), <- e indici da 1", ex: [
        { t: "info", title: "Cos’è R e come si usa", text: "**R** è un linguaggio pensato per la statistica e l’analisi dei dati, molto usato in biologia (espressione genica, statistica, grafici).\n\nPuoi usarlo in due modi:", points: ["nella **console**: scrivi un’istruzione, premi Invio e vedi subito il risultato (è il modo più comodo per provare);", "in uno **script**, un file `.R` con tante istruzioni, eseguito dall’inizio con `Rscript analisi.R` dal terminale o dentro RStudio.", "Molti usano **RStudio**, un programma che mette insieme console, editor, grafici e aiuto.", "`#` inizia un commento: R ignora il resto della riga.", "`?mean` apre l’aiuto della funzione `mean`."], note: "In R le istruzioni non finiscono con `;` e i nomi distinguono maiuscole e minuscole: `Mean` non è `mean`." },
        { t: "info", title: "Assegnare valori e i vettori", text: "In R si assegna con la freccia `<-` (si legge “prende”): `x <- 5`. Funziona anche `=`, ma per convenzione si usa `<-`.\n\nIl dato fondamentale di R è il **vettore**: una sequenza di valori **dello stesso tipo**. Anche un numero da solo è un vettore lungo 1. La funzione `c()` (*combine*) crea un vettore unendo dei valori.", code: `espr <- c(2.1, 5.4, 3.3)     # vettore numerico
geni <- c("TP53", "MYC")      # vettore di testo (character)
ok   <- c(TRUE, FALSE)        # vettore logico
length(espr)                  # 3
mean(espr)                    # 3.6` },
        { t: "info", title: "Gli indici partono da 1", text: "In R il **primo** elemento ha indice **1** (in Python e in C++ è 0). Si legge con le parentesi quadre: `x[1]`.\n\nPuoi anche prendere più elementi insieme: `x[c(1, 3)]` prende il primo e il terzo; `x[-1]` prende tutti **tranne** il primo; `x[x > 2]` prende quelli che rispettano una condizione.", code: `x <- c(10, 20, 30)
x[1]          # 10
x[c(1, 3)]    # 10 30
x[-1]         # 20 30
x[x > 15]     # 20 30`, cpp: "Attenzione: indici da 1, non da 0. `x[0]` in R non dà errore ma restituisce un vettore vuoto." },
        { t: "mc", q: "Cosa restituisce?", code: `x <- c(10, 20, 30)
x[1]`, opts: ["10", "20", "Errore"], mono: 1, a: 0, why: "In R il primo elemento ha indice 1." },
        { t: "fill", q: "Crea un vettore di geni.", code: `geni ___ c("TP53", "MYC")`, bank: ["<-", "=>", "::"], ans: ["<-"], why: "<- è l’operatore di assegnazione tipico di R." },
        { t: "mc", q: "Cosa restituisce?", code: `length(c(1, 2, 3, 4))`, opts: ["3", "4", "5"], mono: 1, a: 1, why: "Il vettore ha quattro elementi." },
        { t: "info", title: "Operazioni vettorizzate", text: "In R le operazioni si applicano **a ogni elemento** del vettore, senza scrivere cicli: si dice che sono *vettorizzate*. `c(1, 2, 3) * 2` dà `2 4 6`.\n\n`a:b` crea la sequenza di interi da `a` a `b`: `1:5` è `1 2 3 4 5`. Funzioni come `sum`, `mean`, `max` lavorano sull’intero vettore.", code: `c(1, 2, 3) * 2        # 2 4 6
c(1, 2, 3) + c(10, 20, 30)   # 11 22 33
x <- 1:5
sum(x)                # 15
x > 2                 # FALSE FALSE TRUE TRUE TRUE`, note: "`NA` indica un valore mancante. Molte funzioni restituiscono `NA` se ce n’è uno, a meno di aggiungere `na.rm = TRUE`: `mean(x, na.rm = TRUE)`." },
        { t: "mc", q: "Cosa restituisce?", code: `c(1, 2, 3) * 2`, opts: ["2 4 6", "1 2 3 1 2 3", "Errore"], mono: 1, a: 0, why: "Le operazioni in R sono vettorizzate: si applicano a ogni elemento." },
        { t: "type", q: "Scrivi cosa restituisce.", code: `x <- 1:5
sum(x)`, ans: ["15"], why: "1:5 crea 1, 2, 3, 4, 5." }
    ]},
    { id: "r2", title: "Data frame", sub: "Tabelle di dati", ex: [
        { t: "info", title: "Il data frame: una tabella", text: "Un **data frame** è una tabella: ogni **colonna** è un vettore (tutti della stessa lunghezza), ogni **riga** è un’osservazione, per esempio un gene. È la struttura che userai di più.", points: ["`df$colonna` prende una colonna (come vettore).", "`nrow(df)` righe, `ncol(df)` colonne, `dim(df)` entrambe.", "`head(df)` mostra le prime **6** righe; `str(df)` la struttura; `summary(df)` statistiche veloci."], code: `df <- data.frame(gene = c("TP53", "MYC", "EGFR"),
                 fc   = c(2.5, -1.2, 0.4))
df$fc        # 2.5 -1.2 0.4
nrow(df)     # 3
head(df)` },
        { t: "info", title: "Selezionare righe e colonne", text: "Con le parentesi quadre si scrive `df[righe, colonne]`. Se lasci vuota una delle due parti, prendi **tutto**.\n\nPer filtrare le righe metti una **condizione** al posto delle righe: R tiene quelle dove la condizione è `TRUE`. Non dimenticare la virgola, che indica “tutte le colonne”.", code: `df[1, ]                 # prima riga, tutte le colonne
df[, "gene"]            # colonna gene
df[df$fc > 1, ]         # righe con fc > 1
df[df$fc > 1, "gene"]   # solo i nomi` },
        { t: "mc", q: "Come selezioni i geni con fc > 1?", opts: ["df[df$fc > 1, ]", "df[fc > 1]", "filter(df > 1)"], mono: 1, a: 0, why: "[righe, colonne]: la condizione sceglie le righe, lo spazio vuoto tiene tutte le colonne." },
        { t: "fill", q: "Conta le righe.", code: `___(df)`, bank: ["nrow", "len", "rows"], ans: ["nrow"], why: "nrow() conta le righe, ncol() le colonne." },
        { t: "mc", q: "Quante righe mostra head(df) in R?", opts: ["6", "5", "10"], a: 0, why: "In R head() mostra 6 righe (in pandas 5)." },
        { t: "info", title: "Leggere i file", text: "I dati di solito arrivano da file di testo:", points: ["`read.csv(\"file.csv\")` per valori separati da virgole;", "`read.delim(\"file.tsv\")` per valori separati da tab (TSV);", "`write.csv(df, \"out.csv\", row.names = FALSE)` per salvare."], note: "R cerca i file nella **cartella di lavoro**: `getwd()` ti dice qual è, `setwd(\"percorso\")` la cambia. In RStudio conviene lavorare dentro un *Project*." },
        { t: "mc", q: "Come leggi un file TSV?", opts: ["read.delim(\"file.tsv\")", "open(\"file.tsv\")", "load.tsv(\"file.tsv\")"], mono: 1, a: 0, why: "read.delim usa il tab come separatore di default." }
    ]},
    { id: "r4", title: "Funzioni e apply", sub: "function, sapply, %in%", ex: [
        { t: "info", title: "Scrivere funzioni", text: "In R una funzione si crea con `function(parametri) { corpo }` e si assegna a un nome come qualsiasi valore.\n\nLa funzione restituisce **l’ultima espressione valutata**: `return()` esiste, ma non è obbligatorio.", code: `quadrato <- function(x) {
  x^2
}
quadrato(3)        # 9
quadrato(1:3)      # 1 4 9 (vettorizzata!)` },
        { t: "mc", q: "Cosa restituisce una funzione R senza return()?", opts: ["L’ultima espressione valutata", "NULL", "Errore"], a: 0, why: "return() esplicito è opzionale in R." },
        { t: "fill", q: "Definisci una funzione.", code: `quadrato <- ___(x) x^2`, bank: ["function", "def", "fn"], ans: ["function"], why: "In R le funzioni si creano con function." },
        { t: "info", title: "Applicare una funzione a ogni elemento", text: "Quando un’operazione non è già vettorizzata, `sapply(vettore, funzione)` la applica a ogni elemento e raccoglie i risultati in un vettore. La funzione può essere scritta direttamente lì, senza nome (funzione *anonima*).", code: `sapply(1:3, function(x) x * 10)     # 10 20 30
sapply(c("TP53", "MYC"), nchar)    # TP53 4, MYC 3` },
        { t: "mc", q: "Cosa restituisce?", code: `sapply(1:3, function(x) x * 10)`, opts: ["10 20 30", "1 2 3", "30"], mono: 1, a: 0, why: "La funzione viene applicata a 1, 2 e 3." },
        { t: "info", title: "%in% e strsplit", text: "`a %in% b` dice, per ogni elemento di `a`, se è presente in `b`: restituisce `TRUE`/`FALSE`.\n\n`strsplit(testo, \"\")` divide una stringa in caratteri. Restituisce una **lista** (un contenitore che può avere elementi di qualsiasi tipo); con `[[1]]` prendi il primo elemento, cioè il vettore di caratteri.", code: `"G" %in% c("A", "G")                   # TRUE
basi <- strsplit("GGAT", "")[[1]]      # "G" "G" "A" "T"
mean(basi %in% c("G", "C"))            # 0.5: frazione GC
gc <- function(seq) mean(strsplit(seq, "")[[1]] %in% c("G", "C"))
sapply(c("GGCC", "ATAT"), gc)          # 1 0`, note: "`mean` di un vettore logico dà la frazione di `TRUE`, perché `TRUE` vale 1 e `FALSE` vale 0." },
        { t: "mc", q: "Cosa restituisce?", code: `"G" %in% c("A", "G")`, opts: ["TRUE", "FALSE", "2"], mono: 1, a: 0, why: "%in% verifica l’appartenenza." }
    ]}
  ]},
  { title: "Analisi dei dati", lessons: [
    { id: "r5", title: "dplyr", sub: "filter, select, mutate", ex: [
        { t: "info", title: "Pacchetti: installare e caricare", text: "Le funzioni di base di R si possono estendere con i **pacchetti**. Due passaggi diversi:", points: ["`install.packages(\"dplyr\")` **una volta sola**: scarica e installa il pacchetto;", "`library(dplyr)` **in ogni sessione o script**: lo carica, rendendo disponibili le sue funzioni."], note: "Se R dice “could not find function”, quasi sempre hai dimenticato `library(...)`." },
        { t: "info", title: "dplyr: i verbi per le tabelle", text: "**dplyr** (parte del *tidyverse*) offre funzioni chiare, i “verbi”, per manipolare data frame:", points: ["`filter(df, condizione)`: tiene le **righe** che rispettano la condizione;", "`select(df, col1, col2)`: tiene le **colonne** indicate;", "`mutate(df, nuova = …)`: crea o modifica una colonna;", "`arrange(df, col)` ordina (`desc(col)` in ordine decrescente);", "`group_by(df, col)` + `summarise(...)`: calcoli per gruppo, per esempio `n()` conta le righe."] },
        { t: "mc", q: "Cosa fa filter()?", opts: ["Tiene le righe che soddisfano una condizione", "Tiene alcune colonne", "Ordina"], a: 0, why: "Per le colonne si usa select()." },
        { t: "fill", q: "Tieni solo due colonne.", code: `df |> ___(gene, log2FC)`, bank: ["select", "filter", "pick"], ans: ["select"], why: "select sceglie le colonne." },
        { t: "info", title: "La pipe |>", text: "La **pipe** `|>` passa il risultato a sinistra come **primo argomento** della funzione a destra: `x |> f(y)` equivale a `f(x, y)`.\n\nCosì una serie di passaggi si legge dall’alto in basso, come una ricetta, invece che dall’interno verso l’esterno. Nei vecchi script vedrai `%>%`, che fa quasi la stessa cosa.", code: `library(dplyr)
ris <- data.frame(gene = c("a", "b", "c"), padj = c(0.01, 0.2, 0.001),
                  log2FC = c(2, -3, 0.5), cromosoma = c("1", "1", "2"))
ris |>
  filter(padj < 0.05) |>
  mutate(direzione = ifelse(log2FC > 0, "su", "giù")) |>
  arrange(padj)

ris |> group_by(cromosoma) |> summarise(n = n())` },
        { t: "mc", q: "Cosa fa la pipe |>?", opts: ["Passa il risultato a sinistra come primo argomento della funzione a destra", "Collega un file a un comando", "Esegue in parallelo"], a: 0, why: "x |> f(y) equivale a f(x, y)." },
        { t: "mc", q: "Cosa fa group_by(cromosoma) |> summarise(n = n())?", opts: ["Conta i geni per cromosoma", "Somma i cromosomi", "Elimina i cromosomi"], a: 0, why: "Raggruppa e calcola un riassunto per gruppo." },
        { t: "order", q: "Prendi i 10 geni significativi più sovraespressi.", lines: ["df |>", "  filter(padj < 0.05) |>", "  arrange(desc(log2FC)) |>", "  head(10)"], why: "Prima filtra, poi ordina, infine prendi i primi." }
    ]},
    { id: "r6", title: "ggplot2", sub: "Grafici", ex: [
        { t: "info", title: "La grammatica dei grafici", text: "**ggplot2** costruisce i grafici a strati, sommandoli con `+`:", points: ["`ggplot(dati, aes(...))`: i dati e le **mappature estetiche** (`aes`), cioè quale colonna va sull’asse x, quale sull’asse y, quale decide il colore…;", "`geom_…()`: la **forma** dei dati: `geom_point()` punti, `geom_histogram()` istogramma, `geom_boxplot()` boxplot, `geom_line()` linee;", "altri strati opzionali: titoli (`labs`), temi (`theme_minimal()`)…"], code: `library(ggplot2)
df <- data.frame(lunghezza = c(120, 340, 560, 220, 410))
ggplot(df, aes(x = lunghezza)) +
  geom_histogram(bins = 5)` },
        { t: "mc", q: "A cosa serve aes()?", opts: ["Mappa colonne su assi, colori e dimensioni", "Salva il grafico", "Carica i dati"], a: 0, why: "aes = aesthetic mappings." },
        { t: "fill", q: "Disegna un istogramma.", code: `ggplot(df, aes(x = lunghezza)) +
  ___()`, bank: ["geom_histogram", "geom_point", "plot_hist"], ans: ["geom_histogram"], why: "Ogni tipo di grafico è un geom_*." },
        { t: "info", title: "Il volcano plot", text: "Un grafico tipico dell’espressione differenziale. Ogni punto è un gene:", points: ["asse x: `log2FC`, quanto cambia l’espressione (positivo = aumenta);", "asse y: `-log10(padj)`, quanto è significativo. Il p-value piccolo diventa un valore grande, quindi i geni significativi stanno **in alto**."], code: `ris <- data.frame(log2FC = c(2, -3, 0.5, 0.1), padj = c(0.001, 0.0001, 0.3, 0.9))
ggplot(ris, aes(x = log2FC, y = -log10(padj))) +
  geom_point()` },
        { t: "mc", q: "Cosa mostra un volcano plot?", opts: ["log2FC contro -log10(p-value)", "GC contro lunghezza", "Coverage lungo il genoma"], a: 0, why: "In alto ai lati ci sono i geni con grande effetto e significativi." },
        { t: "info", title: "Salvare il grafico", text: "`ggsave(\"figura.png\")` salva l’ultimo grafico creato; il formato si sceglie dall’estensione (`.png`, `.pdf`, `.svg`). Puoi indicare le dimensioni: `ggsave(\"fig.pdf\", width = 6, height = 4)` (in pollici)." },
        { t: "mc", q: "Come salvi l’ultimo grafico?", opts: ["ggsave(\"fig.png\")", "save.plot()", "export()"], mono: 1, a: 0, why: "ggsave sceglie il formato dall’estensione." }
    ]}
  ]},
  { title: "Genomica", lessons: [
    { id: "r3", title: "Bioconductor", sub: "Biostrings e DESeq2", ex: [
        { t: "info", title: "Bioconductor", text: "**Bioconductor** è una raccolta di migliaia di pacchetti R per la biologia: sequenze (`Biostrings`), genomica, espressione genica (`DESeq2`, `edgeR`)…\n\nSi installano con il pacchetto `BiocManager`, non con `install.packages`:", code: `# una volta sola:
# install.packages("BiocManager")
# BiocManager::install("Biostrings")

library(Biostrings)
s <- DNAString("ATGCGT")
reverseComplement(s)    # ACGCAT`, note: "`pacchetto::funzione` chiama una funzione di un pacchetto senza caricarlo con `library`: `BiocManager::install(...)`." },
        { t: "info", title: "Espressione differenziale in breve", text: "Con l’**RNA-seq** si conta quante *read* (frammenti sequenziati) cadono su ogni gene, in campioni di condizioni diverse (es. controllo vs trattato). **DESeq2** stima per ogni gene:", points: ["il **log2 fold change** (`log2FC`): di quanto cambia l’espressione, in scala logaritmica in base 2. `1` = raddoppia, `-1` = si dimezza, `0` = nessun cambiamento;", "un **p-value aggiustato** (`padj`): quanto è credibile che il cambiamento non sia dovuto al caso."] },
        { t: "mc", q: "A cosa serve DESeq2?", opts: ["Espressione differenziale da RNA-seq", "Allineare le read", "Disegnare alberi filogenetici"], a: 0, why: "DESeq2 stima quali geni cambiano espressione tra condizioni." },
        { t: "fill", q: "Carica il pacchetto.", code: `___(DESeq2)`, bank: ["library", "import", "require_all"], ans: ["library"], why: "library() carica un pacchetto installato." },
        { t: "mc", q: "Un log2 fold change pari a 1 significa…", opts: ["Espressione raddoppiata", "Aumento dell’1%", "Nessun cambiamento"], a: 0, why: "2^1 = 2: il gene è espresso il doppio. log2FC = 0 indica nessun cambiamento." },
        { t: "mc", q: "Come installi un pacchetto Bioconductor?", opts: ["BiocManager::install(\"DESeq2\")", "pip install DESeq2", "library.install(\"DESeq2\")"], mono: 1, a: 0, why: "I pacchetti Bioconductor si installano con BiocManager." }
    ]},
    { id: "r7", title: "Statistica", sub: "t-test e test multipli", ex: [
        { t: "info", title: "Cos’è un p-value", text: "Un test statistico parte da un’**ipotesi nulla**, per esempio “le due medie sono uguali”. Il **p-value** è la probabilità di osservare dati così diversi (o di più) **se l’ipotesi nulla fosse vera**. Se è piccolo (di solito sotto `0.05`), si considera il risultato “significativo”.\n\n`t.test(a, b)` confronta le medie di due gruppi e restituisce, tra le altre cose, il p-value.", code: `ctrl  <- c(5.1, 4.8, 5.3)
tratt <- c(7.2, 6.9, 7.5)
t.test(ctrl, tratt)$p.value` },
        { t: "info", title: "Il problema dei test multipli", text: "Con una soglia di `0.05`, in media un test su 20 dà un falso positivo **per puro caso**. Se testi 20.000 geni, anche se nessuno cambia davvero ti aspetti circa 20.000 × 0.05 = **1.000** falsi positivi.\n\nPer questo i p-value vanno **corretti**. Il metodo più usato in genomica è **Benjamini–Hochberg** (`\"BH\"`), che controlla il **False Discovery Rate**: la frazione attesa di falsi positivi tra i risultati che dichiari significativi.", code: `p <- c(0.01, 0.02, 0.03, 0.04, 0.5)
p.adjust(p, method = "BH")   # 0.05 0.05 0.05 0.05 0.50` },
        { t: "mc", q: "Perché correggere i p-value quando testi migliaia di geni?", opts: ["Per limitare i falsi positivi dovuti ai test multipli", "Per renderli più piccoli", "Non serve"], a: 0, why: "Più test fai, più falsi positivi ottieni per caso." },
        { t: "mc", q: "20.000 geni, nessuno cambia davvero, soglia 0.05 senza correzione: quanti falsi positivi ti aspetti?", opts: ["Circa 1.000", "Circa 5", "0"], a: 0, why: "20.000 × 0.05 = 1.000." },
        { t: "fill", q: "Correggi con Benjamini-Hochberg.", code: `p.adjust(p, method = ___)`, bank: ["\"BH\"", "\"mean\"", "\"t\""], ans: ["\"BH\""], why: "BH è il metodo più usato in genomica." },
        { t: "mc", q: "Cosa controlla il metodo BH?", opts: ["Il False Discovery Rate", "La varianza", "La media"], a: 0, why: "FDR = frazione attesa di falsi positivi tra i risultati significativi." }
    ]}
  ]}
  ]
});
