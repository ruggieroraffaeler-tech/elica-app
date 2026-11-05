/* Corso: r — vedi README per il formato degli esercizi */
ELICA.addCourse({id:'r',order:40,name:'R',lang:'r',tag:'Statistica, tidyverse e Bioconductor per l’analisi dei dati omici.',units:[
 {title:'Le basi di R',lessons:[
  {id:'r1',title:'Vettori',sub:'c(), <- e indici da 1',ex:[
   {t:'info',title:'Tutto è un vettore',text:'In R si assegna con <- e c() crea un vettore. Attenzione: gli indici partono da 1.',code:`espr <- c(2.1, 5.4, 3.3)\nmean(espr)   # 3.6\nespr[1]      # 2.1`},
   {t:'mc',q:'Cosa restituisce?',code:`x <- c(10, 20, 30)\nx[1]`,opts:['10','20','Errore'],mono:1,a:0,why:'In R il primo elemento ha indice 1.'},
   {t:'fill',q:'Crea un vettore di geni.',code:`geni ___ c("TP53", "MYC")`,bank:['<-','=>','::'],ans:['<-'],why:'<- è l’operatore di assegnazione tipico di R.'},
   {t:'mc',q:'Cosa restituisce?',code:`length(c(1, 2, 3, 4))`,opts:['3','4','5'],mono:1,a:1,why:'Il vettore ha quattro elementi.'},
   {t:'mc',q:'Cosa restituisce?',code:`c(1, 2, 3) * 2`,opts:['2 4 6','1 2 3 1 2 3','Errore'],mono:1,a:0,why:'Le operazioni in R sono vettorizzate: si applicano a ogni elemento.'},
   {t:'type',q:'Scrivi cosa restituisce.',code:`x <- 1:5\nsum(x)`,ans:['15'],why:'1:5 crea 1, 2, 3, 4, 5.'}
  ]},
  {id:'r2',title:'Data frame',sub:'Tabelle di dati',ex:[
   {t:'info',title:'Il data frame',text:'Un data frame è una tabella in cui ogni colonna è un vettore. Con $ accedi a una colonna.',code:`df <- data.frame(gene = c("TP53", "MYC"),\n                 fc = c(2.5, -1.2))\ndf$fc      # 2.5 -1.2\nnrow(df)   # 2`},
   {t:'mc',q:'Come selezioni i geni con fc > 1?',opts:['df[df$fc > 1, ]','df[fc > 1]','filter(df > 1)'],mono:1,a:0,why:'[righe, colonne]: la condizione sceglie le righe, lo spazio vuoto tiene tutte le colonne.'},
   {t:'fill',q:'Conta le righe.',code:`___(df)`,bank:['nrow','len','rows'],ans:['nrow'],why:'nrow() conta le righe, ncol() le colonne.'},
   {t:'mc',q:'Quante righe mostra head(df) in R?',opts:['6','5','10'],a:0,why:'In R head() mostra 6 righe (in pandas 5).'},
   {t:'mc',q:'Come leggi un file TSV?',opts:['read.delim("file.tsv")','open("file.tsv")','load.tsv("file.tsv")'],mono:1,a:0,why:'read.delim usa il tab come separatore di default.'}
  ]},
  {id:'r4',title:'Funzioni e apply',sub:'function, sapply, %in%',ex:[
   {t:'info',title:'Funzioni in R',text:'Si creano con function(). Restituiscono l’ultima espressione valutata. sapply applica una funzione a ogni elemento.',code:`gc <- function(seq) {\n  basi <- strsplit(seq, "")[[1]]\n  mean(basi %in% c("G", "C"))\n}\nsapply(c("GGCC", "ATAT"), gc)   # 1 0`},
   {t:'mc',q:'Cosa restituisce una funzione R senza return()?',opts:['L’ultima espressione valutata','NULL','Errore'],a:0,why:'return() esplicito è opzionale in R.'},
   {t:'fill',q:'Definisci una funzione.',code:`quadrato <- ___(x) x^2`,bank:['function','def','fn'],ans:['function'],why:'In R le funzioni si creano con function.'},
   {t:'mc',q:'Cosa restituisce?',code:`sapply(1:3, function(x) x * 10)`,opts:['10 20 30','1 2 3','30'],mono:1,a:0,why:'La funzione viene applicata a 1, 2 e 3.'},
   {t:'mc',q:'Cosa restituisce?',code:`"G" %in% c("A", "G")`,opts:['TRUE','FALSE','2'],mono:1,a:0,why:'%in% verifica l’appartenenza.'}
  ]}
 ]},
 {title:'Analisi dei dati',lessons:[
  {id:'r5',title:'dplyr',sub:'filter, select, mutate',ex:[
   {t:'info',title:'Il tidyverse',text:'dplyr offre verbi chiari per manipolare tabelle. La pipe |> passa il risultato al passaggio successivo.',code:`library(dplyr)\nris |>\n  filter(padj < 0.05) |>\n  mutate(direzione = ifelse(log2FC > 0, "su", "giù")) |>\n  arrange(padj)`},
   {t:'mc',q:'Cosa fa filter()?',opts:['Tiene le righe che soddisfano una condizione','Tiene alcune colonne','Ordina'],a:0,why:'Per le colonne si usa select().'},
   {t:'fill',q:'Tieni solo due colonne.',code:`df |> ___(gene, log2FC)`,bank:['select','filter','pick'],ans:['select'],why:'select sceglie le colonne.'},
   {t:'mc',q:'Cosa fa la pipe |>?',opts:['Passa il risultato a sinistra come primo argomento della funzione a destra','Collega un file a un comando','Esegue in parallelo'],a:0,why:'x |> f(y) equivale a f(x, y).'},
   {t:'mc',q:'Cosa fa group_by(cromosoma) |> summarise(n = n())?',opts:['Conta i geni per cromosoma','Somma i cromosomi','Elimina i cromosomi'],a:0,why:'Raggruppa e calcola un riassunto per gruppo.'},
   {t:'order',q:'Prendi i 10 geni significativi più sovraespressi.',lines:['df |>','  filter(padj < 0.05) |>','  arrange(desc(log2FC)) |>','  head(10)'],why:'Prima filtra, poi ordina, infine prendi i primi.'}
  ]},
  {id:'r6',title:'ggplot2',sub:'Grafici',ex:[
   {t:'info',title:'La grammatica dei grafici',text:'Un grafico ggplot2 = dati + aes (mappature) + geom (forma). Si aggiungono strati con +.',code:`library(ggplot2)\nggplot(ris, aes(x = log2FC, y = -log10(padj))) +\n  geom_point()   # volcano plot`},
   {t:'mc',q:'A cosa serve aes()?',opts:['Mappa colonne su assi, colori e dimensioni','Salva il grafico','Carica i dati'],a:0,why:'aes = aesthetic mappings.'},
   {t:'fill',q:'Disegna un istogramma.',code:`ggplot(df, aes(x = lunghezza)) +\n  ___()`,bank:['geom_histogram','geom_point','plot_hist'],ans:['geom_histogram'],why:'Ogni tipo di grafico è un geom_*.'},
   {t:'mc',q:'Cosa mostra un volcano plot?',opts:['log2FC contro -log10(p-value)','GC contro lunghezza','Coverage lungo il genoma'],a:0,why:'In alto ai lati ci sono i geni con grande effetto e significativi.'},
   {t:'mc',q:'Come salvi l’ultimo grafico?',opts:['ggsave("fig.png")','save.plot()','export()'],mono:1,a:0,why:'ggsave sceglie il formato dall’estensione.'}
  ]}
 ]},
 {title:'Genomica',lessons:[
  {id:'r3',title:'Bioconductor',sub:'Biostrings e DESeq2',ex:[
   {t:'info',title:'Bioconductor',text:'Bioconductor raccoglie migliaia di pacchetti per la genomica, come Biostrings e DESeq2.',code:`library(Biostrings)\ns <- DNAString("ATGCGT")\nreverseComplement(s)   # ACGCAT`},
   {t:'mc',q:'A cosa serve DESeq2?',opts:['Espressione differenziale da RNA-seq','Allineare le read','Disegnare alberi filogenetici'],a:0,why:'DESeq2 stima quali geni cambiano espressione tra condizioni.'},
   {t:'fill',q:'Carica il pacchetto.',code:`___(DESeq2)`,bank:['library','import','require_all'],ans:['library'],why:'library() carica un pacchetto installato.'},
   {t:'mc',q:'Un log2 fold change pari a 1 significa…',opts:['Espressione raddoppiata','Aumento dell’1%','Nessun cambiamento'],a:0,why:'2^1 = 2: il gene è espresso il doppio. log2FC = 0 indica nessun cambiamento.'},
   {t:'mc',q:'Come installi un pacchetto Bioconductor?',opts:['BiocManager::install("DESeq2")','pip install DESeq2','library.install("DESeq2")'],mono:1,a:0,why:'I pacchetti Bioconductor si installano con BiocManager.'}
  ]},
  {id:'r7',title:'Statistica',sub:'t-test e test multipli',ex:[
   {t:'info',title:'Quanto è significativo?',text:'t.test confronta le medie di due gruppi. Con migliaia di geni bisogna correggere i p-value con p.adjust.',code:`ctrl <- c(5.1, 4.8, 5.3)\ntratt <- c(7.2, 6.9, 7.5)\nt.test(ctrl, tratt)$p.value\n\npadj <- p.adjust(pvals, method = "BH")`},
   {t:'mc',q:'Perché correggere i p-value quando testi migliaia di geni?',opts:['Per limitare i falsi positivi dovuti ai test multipli','Per renderli più piccoli','Non serve'],a:0,why:'Più test fai, più falsi positivi ottieni per caso.'},
   {t:'mc',q:'20.000 geni, nessuno cambia davvero, soglia 0.05 senza correzione: quanti falsi positivi ti aspetti?',opts:['Circa 1.000','Circa 5','0'],a:0,why:'20.000 × 0.05 = 1.000.'},
   {t:'fill',q:'Correggi con Benjamini-Hochberg.',code:`p.adjust(p, method = ___)`,bank:['"BH"','"mean"','"t"'],ans:['"BH"'],why:'BH è il metodo più usato in genomica.'},
   {t:'mc',q:'Cosa controlla il metodo BH?',opts:['Il False Discovery Rate','La varianza','La media'],a:0,why:'FDR = frazione attesa di falsi positivi tra i risultati significativi.'}
  ]}
 ]}
]});
