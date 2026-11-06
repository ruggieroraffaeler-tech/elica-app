# Come sono stati verificati i contenuti

Ultima verifica: 6 novembre 2026, versione 3.2.0. Ci sono 233 schede di teoria e 360 esercizi, di cui 17 sfide di codice e 6 missioni.

## Verificato eseguendo il codice

| Ambito | Strumento | Cosa è stato controllato |
|---|---|---|
| Python, Palestra, Python × Bio | Python 3, Biopython 1.88, pandas 3.0 | Codice di teoria, scelte multiple con codice, “scrivi l’output”, completamenti e riordini (almeno la sintassi), regex, esercizi “trova il bug” (la versione sbagliata fallisce davvero, quella corretta passa) |
| R | R 4.3, dplyr, ggplot2, Biostrings | Vettori, data frame, `head()` = 6 righe, `sapply`, `%in%`, `t.test`, `p.adjust(method = "BH")`, verbi dplyr, `ggsave`, `reverseComplement` |
| Bash | bash, awk, sed, grep, gzip | Conteggio di FASTA e FASTQ, `wc -c`, awk per colonne, sed con e senza `g`, `sort \| uniq -c`, script con shebang |
| Git | git 2.43 | `diff` e `diff --staged`, `restore`, `.gitignore` con file già tracciati, `rm --cached`, `switch -c`, merge, conflitti, tag |
| Pipeline | DIAMOND 2.1.9, BLAST+ 2.12, bwa, samtools | Tutti i comandi delle lezioni del Progetto su dati di prova: makedb, blastp con `--outfmt 6` (12 colonne), `--id` e `--query-cover`, makeblastdb, tblastn, bwa index/mem, samtools sort/index/view |

## Teoria (versione 3.1.0)

- **Codice delle schede:** eseguito tutto quello che si può eseguire. Python e Biopython/pandas con l’output confrontato con i commenti; R con Rscript (dplyr, ggplot2, Biostrings); Bash in una cartella di prova con file di esempio. Fanno eccezione gli esempi che dipendono da file del progetto (`gc_tools`, `labid`) o dal terminale interattivo.
- **Copertura:** ogni funzione, metodo o risposta da completare usati in un esercizio compaiono in una scheda precedente dello stesso corso. Le lacune trovate sono state colmate. Esempi: `isalnum` e `isupper` nella Palestra prima della lezione dedicata; `read()` prima dell’esercizio sui file; la distanza di Hamming prima dell’esercizio che la usa; un esercizio della prima lezione che usava `strip`, `title` e le f-string prima di averle spiegate.
- **Opzioni di DIAMOND citate** (`--sensitive`, `--more-sensitive`): verificate eseguendole.

## Sfide e missioni (versione 3.2.0)

- **Sfide di codice (17):** ogni soluzione è stata eseguita con il correttore vero (`tools/harness.py`, Python 3) e supera tutti i test; il codice iniziale non li supera. Nella sfida in cui si scrivono i test, i test della soluzione passano sulla versione corretta e scovano tutte e tre le versioni con un difetto. Il controllo si ripete a ogni `node tools/check.js`.
- **Valori attesi:** calcolati a mano e confermati eseguendo il codice. Esempi: Tm di Wallace di `ATGCATGCATGC` = 36; la distanza di Hamming dell’esempio = 7; la parità dei k-mer risolta in ordine alfabetico; i casi limite del GC a 0,4 e 0,6.
- **Nel browser:** con Pyodide 0.26.4, l’interprete usato dall’app, sono stati provati il correttore (le tre modalità), le spiegazioni degli errori, i suggerimenti, la soluzione, le bozze salvate, l’input nel Lab, l’interruzione di un ciclo infinito dopo 10 secondi con il riavvio di Python, e la versione portabile aperta come file.
- **Missioni:** risposte ottenute eseguendo i comandi. R 4.3: 3 geni significativi (TP53, MYC, PTEN) e media −0,6. Bash: `grep -c` = 3; la pipe sul VCF dà `3 chr1` e `1 chr2`. Git 2.43: 2 commit; `git status --short` mostra solo `?? .gitignore`. Le soluzioni da copiare non contengono commenti, perché zsh (il terminale del Mac) per impostazione predefinita non li accetta nei comandi digitati.

## Verificato sulle fonti

- **CS50P:** ordine delle 10 lezioni (Functions/Variables … Et Cetera); Vanity Plates in Problem Set 2 e Re-requesting a Vanity Plate in Problem Set 5; politica di onestà accademica di CS50.
- **NCBI:** accession GCF_000005845.2 (E. coli K-12 MG1655) e GCF_000008865.2 (O157:H7 Sakai, cromosoma più i plasmidi pO157 e pOSAK1, 5,59 Mb); sintassi di `datasets download genome accession … --include`; struttura del pacchetto (`protein.faa`, `genomic.gff`).
- **Letteratura:** Hayashi et al. 2001 (DNA Research 8:11–22): circa 4,1 Mb di scheletro comune e circa 1,4 Mb di sequenze specifiche di O157 rispetto a K-12.
- **VFDB:** set A = geni rappresentativi di fattori di virulenza validati sperimentalmente; set B = tutti i fattori, noti e predetti (Chen et al. 2016, NAR; pagina Download di VFDB).
- **GitHub:** Pages gratuito sulle repository pubbliche; password non accettata per le operazioni Git dal 13 agosto 2021; l’API REST accetta richieste CORS da qualsiasi origine, cosa che rende possibile la sincronizzazione via Gist.

## Errori trovati e corretti nella verifica

- Bash, lezione “Strumenti NGS”: mancava `bwa index ref.fa`. Senza, `bwa mem` si ferma con “fail to locate the index files”.
- Bash: `samtools view -c` conta le righe di allineamento, compresi secondari e supplementari, non le read. Aggiunta la variante `-F 0x900`.
- Imprecisioni chiarite su FASTQ a 4 righe, frequenza degli stop negli ORF, RefSeq/GenBank e download compresso di VFDB.
- Alcune schede di teoria usavano variabili non definite: ora si possono eseguire così come sono.

## Cosa non si può verificare eseguendo

Le domande concettuali (per esempio “perché si fa così”) sono state rilette una per una e confrontate con la documentazione, ma restano spiegazioni. Se trovi qualcosa che non torna, segnalalo: si corregge e si pubblica una nuova versione.
