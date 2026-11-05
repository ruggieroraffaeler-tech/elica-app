/* Corso: py — vedi README per il formato degli esercizi */
ELICA.addCourse({id:'py',order:10,name:'Python',lang:'python',tag:'Allineato alle 10 settimane di CS50’s Introduction to Programming with Python (CS50P) di Harvard, con esempi presi dalla biologia.',units:[
 {title:'Settimana 0 · Funzioni e variabili',lessons:[
  {id:'p0a',title:'print e input',sub:'Il primo programma',ex:[
   {t:'info',title:'Parlare con l’utente',text:'input() legge del testo dalla tastiera, print() lo mostra. Una variabile è un nome che punta a un valore.',code:`nome = input("Come ti chiami? ")\nprint("ciao,", nome)`},
   {t:'mc',q:'Cosa stampa?',code:`print("ciao,", "David")`,opts:['ciao,David','ciao, David','ciao, "David"'],mono:1,a:1,why:'print separa gli argomenti con uno spazio (sep=" ").'},
   {t:'fill',q:'Stampa senza andare a capo.',code:`print("ciao", ___="")`,bank:['end','sep','stop'],ans:['end'],why:'end sostituisce il carattere \\n che print aggiunge di default.'},
   {t:'mc',q:'Cosa stampa?',code:`print("a", "b", sep="-")`,opts:['a-b','a b','ab-'],mono:1,a:0,why:'sep sceglie cosa mettere tra gli argomenti.'},
   {t:'type',q:'Scrivi esattamente cosa stampa.',code:`print("ciao", end="!")\nprint("mondo")`,ans:['ciao!mondo'],why:'Il primo print finisce con "!" invece di andare a capo.'},
   {t:'order',q:'Chiedi il nome, puliscilo e salutalo.',lines:['nome = input("Nome? ")','nome = nome.strip().title()','print(f"ciao, {nome}")'],why:'Leggi, pulisci, poi usa il valore.'}
  ]},
  {id:'p0b',title:'Stringhe e f-string',sub:'strip, title, split',ex:[
   {t:'info',title:'Metodi delle stringhe',text:'strip() toglie gli spazi ai lati, title() mette le iniziali maiuscole. Le f-string inseriscono variabili nel testo.',code:`nome = "  ada lovelace "\nnome = nome.strip().title()\nprint(f"ciao, {nome}")   # ciao, Ada Lovelace`},
   {t:'mc',q:'Cosa restituisce "  hey ".strip()?',opts:['"hey"','"  hey"','"hey "'],mono:1,a:0,why:'strip() rimuove gli spazi da entrambi i lati.'},
   {t:'fill',q:'Crea una f-string.',code:`gc = 0.42\nprint(___"GC: {gc}")`,bank:['f','r','s'],ans:['f'],why:'La f davanti alle virgolette attiva la sostituzione delle {variabili}.'},
   {t:'mc',q:'Cosa restituisce "harvard university".title()?',opts:['Harvard University','HARVARD UNIVERSITY','Harvard university'],mono:1,a:0,why:'title() rende maiuscola la prima lettera di ogni parola.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`x = 3\nprint(f"{x} + {x} = {x + x}")`,ans:['3 + 3 = 6'],why:'Dentro le graffe di una f-string puoi mettere espressioni.'},
   {t:'mc',q:'Quanto vale cognome?',code:`nome, cognome = "Ada Lovelace".split(" ")`,opts:['"Lovelace"','"Ada"','["Ada", "Lovelace"]'],mono:1,a:0,why:'split restituisce due pezzi, assegnati in ordine alle due variabili.'}
  ]},
  {id:'p0c',title:'Numeri e funzioni',sub:'int, float, def, return',ex:[
   {t:'info',title:'Numeri e funzioni tue',text:'input() restituisce sempre una stringa: convertila con int() o float(). Con def crei funzioni tue; return restituisce il risultato.',code:`def quadrato(n):\n    return n * n\n\nx = int(input("x? "))\nprint(quadrato(x))`},
   {t:'mc',q:'Cosa restituisce "1" + "2"?',opts:['3','"12"','Errore'],mono:1,a:1,why:'Sono stringhe: + le concatena. Per sommare, prima int().'},
   {t:'fill',q:'Converti l’input in un intero.',code:`x = ___(input("x? "))`,bank:['int','str','num'],ans:['int'],why:'int() converte una stringa in un numero intero.'},
   {t:'mc',q:'Cosa restituisce round(3.14159, 2)?',opts:['3.14','3.1','3'],mono:1,a:0,why:'Il secondo argomento indica quante cifre decimali tenere.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print(7 // 2, 7 % 2)`,ans:['3 1'],why:'// è la divisione intera, % il resto.'},
   {t:'mc',q:'Cosa stampa?',code:`def ciao(a="mondo"):\n    print("ciao,", a)\n\nciao()`,opts:['ciao, mondo','Errore','ciao,'],mono:1,a:0,why:'Se non passi l’argomento, si usa il valore di default.'},
   {t:'order',q:'Struttura il programma con main().',lines:['def main():','    x = int(input("x? "))','    print(quadrato(x))','main()'],why:'Si definisce main e poi la si chiama in fondo al file.'}
  ]}
 ]},
 {title:'Settimana 1 · Condizionali',lessons:[
  {id:'p1a',title:'if, elif, else',sub:'Prendere decisioni',ex:[
   {t:'info',title:'Confronti',text:'Gli operatori < > <= >= == != restituiscono True o False. Il blocco da eseguire si riconosce dall’indentazione.',code:`x = int(input("x? "))\ny = int(input("y? "))\nif x < y:\n    print("x è minore")\nelif x > y:\n    print("x è maggiore")\nelse:\n    print("sono uguali")`},
   {t:'mc',q:'Cosa stampa?',code:`x = 5\nif x > 3:\n    print("alto")\nelse:\n    print("basso")`,opts:['alto','basso','niente'],mono:1,a:0,why:'5 > 3 è vero, quindi si esegue il primo blocco.'},
   {t:'fill',q:'Controlla se x è uguale a zero.',code:`if x ___ 0:\n    print("zero")`,bank:['==','=','!='],ans:['=='],why:'== confronta; = assegna e qui darebbe errore.'},
   {t:'mc',q:'Cosa succede se dimentichi l’indentazione dopo un if?',opts:['Funziona uguale','IndentationError','Stampa due volte'],a:1,why:'In Python l’indentazione fa parte della sintassi.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`x = 7\nif x % 2 == 0:\n    print("pari")\nelse:\n    print("dispari")`,ans:['dispari'],why:'7 % 2 vale 1, quindi la condizione è falsa.'},
   {t:'order',q:'Ordina per classificare n.',lines:['if n > 0:','    print("positivo")','elif n < 0:','    print("negativo")','else:','    print("zero")'],why:'if, poi elif, infine else.'}
  ]},
  {id:'p1b',title:'Logica booleana e match',sub:'and, or, not, match',ex:[
   {t:'info',title:'Combinare condizioni',text:'and, or e not combinano condizioni. match confronta un valore con più casi; _ cattura tutto il resto.',code:`punteggio = 85\nif 80 <= punteggio < 90:\n    print("B")\n\nbase = "A"\nmatch base:\n    case "A" | "G":\n        print("purina")\n    case "C" | "T":\n        print("pirimidina")\n    case _:\n        print("?")`},
   {t:'mc',q:'Quanto vale True and False?',opts:['True','False','None'],mono:1,a:1,why:'and è vero solo se entrambe le condizioni sono vere.'},
   {t:'mc',q:'Quanto vale not (3 > 5)?',opts:['True','False'],mono:1,a:0,why:'3 > 5 è False, not lo inverte.'},
   {t:'fill',q:'Due casi nello stesso case.',code:`match base:\n    case "A" ___ "G":\n        print("purina")`,bank:['|','or','&'],ans:['|'],why:'In match si usa | per elencare alternative.'},
   {t:'mc',q:'Cosa restituisce is_even(4)?',code:`def is_even(n):\n    return n % 2 == 0`,opts:['True','0','"pari"'],mono:1,a:0,why:'Puoi restituire direttamente il risultato di un confronto: è più pythonico di un if/else.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`base = "T"\nmatch base:\n    case "A" | "G":\n        print("purina")\n    case _:\n        print("pirimidina")`,ans:['pirimidina'],why:'T non è tra A e G, quindi scatta il caso _.'}
  ]}
 ]},
 {title:'Settimana 2 · Cicli',lessons:[
  {id:'p2a',title:'while e for',sub:'Ripetere',ex:[
   {t:'info',title:'Ripetere azioni',text:'while ripete finché la condizione è vera. for scorre una sequenza, spesso range(). Il nome _ indica una variabile che non usi.',code:`i = 0\nwhile i < 3:\n    print("miao")\n    i += 1\n\nfor _ in range(3):\n    print("miao")`},
   {t:'mc',q:'Cosa stampa?',code:`for i in range(3):\n    print(i)`,opts:['0 1 2','1 2 3','0 1 2 3'],mono:1,a:0,why:'range(3) genera 0, 1, 2: il 3 è escluso.'},
   {t:'fill',q:'Esci dal ciclo quando l’input è valido.',code:`while True:\n    n = int(input("n? "))\n    if n > 0:\n        ___`,bank:['break','continue','return'],ans:['break'],why:'break interrompe il ciclo: è il modo classico per validare un input.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`totale = 0\nfor i in range(1, 4):\n    totale += i\nprint(totale)`,ans:['6'],why:'1 + 2 + 3 = 6.'},
   {t:'mc',q:'Cosa fa continue in un ciclo?',opts:['Salta al giro successivo','Esce dal ciclo','Ripete il giro corrente'],a:0,why:'continue salta il resto del corpo e passa all’iterazione seguente.'},
   {t:'order',q:'Chiedi un numero finché non è positivo.',lines:['while True:','    n = int(input("n? "))','    if n > 0:','        break','print(n)'],why:'Il print va fuori dal ciclo, dopo il break.'}
  ]},
  {id:'p2b',title:'Liste e dizionari',sub:'Collezioni',ex:[
   {t:'info',title:'Liste e dizionari',text:'Una lista è una sequenza ordinata. Un dizionario associa chiavi a valori. Con for puoi scorrere entrambi.',code:`geni = ["BRCA1", "TP53"]\ngeni.append("EGFR")\n\ncodoni = {"AUG": "Met", "UAA": "Stop"}\nfor c in codoni:\n    print(c, codoni[c])`},
   {t:'mc',q:'Cosa stampa?',code:`nums = [4, 8, 15]\nprint(nums[2])`,opts:['8','15','Errore'],mono:1,a:1,why:'Indice 2 = terzo elemento.'},
   {t:'fill',q:'Aggiungi "MYC" alla lista.',code:`geni.___("MYC")`,bank:['append','add','push'],ans:['append'],why:'In Python si usa append(); push() è di JavaScript.'},
   {t:'mc',q:'Quanto vale len(d)?',code:`d = {"A": 1}\nd["C"] = 2`,opts:['1','2','Errore'],mono:1,a:1,why:'Assegnare una chiave nuova la aggiunge al dizionario.'},
   {t:'mc',q:'Cosa restituisce geni[0]["chr"]?',code:`geni = [{"nome": "TP53", "chr": "17"}]`,opts:['"17"','"TP53"','Errore'],mono:1,a:0,why:'[0] prende il primo dizionario, ["chr"] il suo valore.'},
   {t:'type',q:'Scrivi cosa stampa (righe separate da spazio).',code:`for b in ["A", "C"]:\n    print(b * 2)`,ans:['AA CC'],why:'Una stringa moltiplicata per n viene ripetuta n volte.'}
  ]},
  {id:'p2c',title:'Cicli dentro funzioni',sub:'Astrazione',ex:[
   {t:'info',title:'Dividere il problema',text:'Mettere un ciclo dentro una funzione lo rende riutilizzabile e leggibile.',code:`def colonna(altezza):\n    for _ in range(altezza):\n        print("#")\n\ndef conta_a(seq):\n    n = 0\n    for b in seq:\n        if b == "A":\n            n += 1\n    return n`},
   {t:'mc',q:'Cosa stampa print("#" * 4)?',opts:['####','#4','Errore'],mono:1,a:0,why:'Moltiplicare una stringa per un intero la ripete.'},
   {t:'fill',q:'Completa la funzione.',code:`def doppio(x):\n    ___ x * 2`,bank:['return','print','yield'],ans:['return'],why:'return restituisce il valore a chi chiama la funzione.'},
   {t:'mc',q:'Quante righe stampa?',code:`for b in "ACGT":\n    print(b)`,opts:['1','4','Errore'],a:1,why:'Il for su una stringa scorre un carattere alla volta.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`def f(s):\n    return s * 3\n\nprint(f("ab"))`,ans:['ababab'],why:'"ab" ripetuto tre volte.'},
   {t:'order',q:'Definisci e usa la funzione.',lines:['def saluta(nome):','    return "Ciao " + nome','print(saluta("Rosalind"))'],why:'La funzione va definita prima di essere chiamata.'}
  ]}
 ]},
 {title:'Settimana 3 · Eccezioni',lessons:[
  {id:'p3a',title:'try ed except',sub:'Gestire gli errori',ex:[
   {t:'info',title:'Quando qualcosa va storto',text:'int("gatto") solleva un ValueError. Con try ed except gestisci l’errore invece di far crashare il programma.',code:`try:\n    x = int(input("x? "))\nexcept ValueError:\n    print("Non è un intero")\nelse:\n    print(f"x è {x}")`},
   {t:'mc',q:'Che eccezione solleva int("cat")?',opts:['ValueError','TypeError','NameError'],mono:1,a:0,why:'Il tipo è giusto (stringa) ma il valore non si può convertire.'},
   {t:'mc',q:'Usare una variabile mai definita solleva…',opts:['NameError','ValueError','SyntaxError'],mono:1,a:0,why:'Python non trova quel nome.'},
   {t:'fill',q:'Cattura l’errore di conversione.',code:`try:\n    n = int(s)\nexcept ___:\n    n = 0`,bank:['ValueError','ErrorValue','catch'],ans:['ValueError'],why:'Cattura solo l’errore che ti aspetti, non tutti.'},
   {t:'mc',q:'Quando si esegue il blocco else di un try?',opts:['Solo se non ci sono eccezioni','Sempre','Solo se c’è un’eccezione'],a:0,why:'else va dopo except e parte solo se il try è andato bene.'},
   {t:'order',q:'Scrivi get_int: richiede un intero finché è valido.',lines:['def get_int(prompt):','    while True:','        try:','            return int(input(prompt))','        except ValueError:','            pass'],why:'Il ciclo riprova; pass ignora l’errore e ricomincia.'}
  ]},
  {id:'p3b',title:'raise e pass',sub:'Sollevare errori',ex:[
   {t:'info',title:'Segnalare un problema',text:'raise solleva un’eccezione quando i dati non vanno bene. pass non fa nulla: è un segnaposto.',code:`def gc(seq):\n    if not seq:\n        raise ValueError("sequenza vuota")\n    return (seq.count("G") + seq.count("C")) / len(seq)`},
   {t:'mc',q:'Cosa fa pass?',opts:['Niente: è un segnaposto','Esce dal programma','Ripete il ciclo'],a:0,why:'Serve dove la sintassi richiede un’istruzione ma non vuoi fare nulla.'},
   {t:'fill',q:'Solleva un errore.',code:`___ ValueError("base non valida")`,bank:['raise','throw','error'],ans:['raise'],why:'In Python si usa raise; throw è di Java e JavaScript.'},
   {t:'mc',q:'Cosa succede con 1 / 0?',opts:['ZeroDivisionError','0','inf'],mono:1,a:0,why:'Dividere per zero solleva un’eccezione.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`try:\n    print(int("12") + 1)\nexcept ValueError:\n    print("errore")`,ans:['13'],why:'"12" si converte senza problemi.'},
   {t:'mc',q:'Perché non scrivere solo except: senza tipo?',opts:['Nasconde anche errori inattesi, rendendo difficile il debug','È più lento','Non è valido in Python'],a:0,why:'Meglio catturare solo le eccezioni previste.'}
  ]}
 ]},
 {title:'Settimana 4 · Librerie',lessons:[
  {id:'p4a',title:'Moduli',sub:'random, statistics, sys',ex:[
   {t:'info',title:'Codice già pronto',text:'Con import usi moduli della libreria standard. from … import prende solo ciò che serve.',code:`import random\nbase = random.choice(["A", "C", "G", "T"])\n\nfrom statistics import mean\nprint(mean([2, 4, 6]))   # 4`},
   {t:'mc',q:'Cosa restituisce random.randint(1, 6)?',opts:['Un intero tra 1 e 6 compresi','Un decimale tra 1 e 6','Sempre 1'],a:0,why:'randint include entrambi gli estremi.'},
   {t:'fill',q:'Importa solo shuffle.',code:`___ random import shuffle`,bank:['from','import','use'],ans:['from'],why:'from modulo import nome.'},
   {t:'mc',q:'Dove trovi gli argomenti passati da riga di comando?',opts:['sys.argv','os.args','input.argv'],mono:1,a:0,why:'sys.argv è una lista di stringhe.'},
   {t:'type',q:'Il programma è lanciato con: python hello.py David. Cosa stampa?',code:`import sys\nprint(sys.argv[1])`,ans:['David'],why:'sys.argv[0] è il nome del file, [1] il primo argomento.'},
   {t:'mc',q:'Cosa contiene sys.argv[0]?',opts:['Il nome del programma','Il primo argomento','Il numero di argomenti'],a:0,why:'L’indice 0 è sempre il nome dello script.'}
  ]},
  {id:'p4b',title:'Pacchetti',sub:'pip e __main__',ex:[
   {t:'info',title:'Pacchetti di terzi',text:'pip installa pacchetti da PyPI, come Biopython. if __name__ == "__main__" separa il codice da eseguire da quello da importare.',code:`# nel terminale\npip install biopython\n\n# in Python\nfrom Bio.Seq import Seq\nprint(Seq("ATGC").reverse_complement())   # GCAT`},
   {t:'mc',q:'Con quale comando installi un pacchetto?',opts:['pip install nome','python get nome','import --install nome'],mono:1,a:0,why:'pip è il gestore di pacchetti di Python.'},
   {t:'mc',q:'A cosa serve if __name__ == "__main__":?',opts:['Esegue main() solo se il file è avviato direttamente, non se viene importato','Rende il file più veloce','Importa main'],a:0,why:'Così puoi importare le funzioni del file, ad esempio nei test, senza eseguirlo.'},
   {t:'fill',q:'Converti un testo JSON in dati Python.',code:`import json\ndati = json.___(testo)`,bank:['loads','read','parse'],ans:['loads'],why:'loads = load string; load legge da un file.'},
   {t:'order',q:'Struttura un modulo riutilizzabile.',lines:['def main():','    print(gc("GGCA"))','if __name__ == "__main__":','    main()'],why:'main viene chiamata solo quando il file è eseguito direttamente.'}
  ]}
 ]},
 {title:'Settimana 5 · Unit test',lessons:[
  {id:'p5a',title:'assert e pytest',sub:'Verificare il codice',ex:[
   {t:'info',title:'Testare le funzioni',text:'Un test chiama una funzione e verifica il risultato con assert. pytest trova ed esegue le funzioni che iniziano con test_.',code:`# test_gc.py\nfrom gc_tools import gc\n\ndef test_gc():\n    assert gc("GGCC") == 1.0\n    assert gc("ATAT") == 0.0`},
   {t:'mc',q:'Cosa succede se un assert è falso?',opts:['Solleva AssertionError','Stampa False','Niente'],a:0,why:'Il test fallisce con un AssertionError.'},
   {t:'fill',q:'Verifica il risultato.',code:`___ quadrato(3) == 9`,bank:['assert','check','test'],ans:['assert'],why:'assert verifica che la condizione sia vera.'},
   {t:'mc',q:'Come riconosce pytest i test?',opts:['Funzioni il cui nome inizia con test_','Funzioni con @test','Qualsiasi funzione'],a:0,why:'Convenzione: file test_*.py e funzioni test_*.'},
   {t:'mc',q:'Come verifichi che venga sollevata un’eccezione?',opts:['with pytest.raises(ValueError):','assert raises ValueError','try pytest:'],mono:1,a:0,why:'pytest.raises è un context manager.'},
   {t:'order',q:'Testa che gc("") sollevi ValueError.',lines:['import pytest','from gc_tools import gc','def test_vuota():','    with pytest.raises(ValueError):','        gc("")'],why:'Prima gli import, poi la funzione di test.'}
  ]},
  {id:'p5b',title:'Codice testabile',sub:'return, non print',ex:[
   {t:'info',title:'Progettare per i test',text:'Una funzione che restituisce un valore si testa facilmente; una che stampa no. Pensa ai casi limite: stringa vuota, minuscole, caratteri strani.',code:`def conta_a(seq):\n    return seq.upper().count("A")\n\ndef test_conta_a():\n    assert conta_a("aAa") == 3\n    assert conta_a("") == 0`},
   {t:'mc',q:'Quale funzione è più facile da testare?',opts:['Una che restituisce il risultato con return','Una che lo stampa con print','Sono uguali'],a:0,why:'Il valore restituito si può confrontare con assert.'},
   {t:'mc',q:'Un buon set di test per gc() include…',opts:['Casi limite come stringa vuota e minuscole','Un solo esempio','Nessun caso limite'],a:0,why:'I bug si nascondono spesso ai bordi.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`def f(s):\n    return s.upper()\n\nassert f("atg") == "ATG"\nprint("ok")`,ans:['ok'],why:'L’assert è vero, quindi il programma continua.'},
   {t:'mc',q:'Come avvii i test?',opts:['pytest test_gc.py','python -test','run tests'],mono:1,a:0,why:'Da terminale: pytest seguito dal file o dalla cartella.'}
  ]}
 ]},
 {title:'Settimana 6 · File I/O',lessons:[
  {id:'p6a',title:'Leggere e scrivere file',sub:'open, with',ex:[
   {t:'info',title:'Dati che restano',text:'open() apre un file: "r" per leggere, "w" per scrivere (sovrascrive), "a" per aggiungere. with lo chiude da solo.',code:`with open("nomi.txt", "a") as f:\n    f.write("Rosalind\\n")\n\nwith open("nomi.txt") as f:\n    for riga in f:\n        print(riga.rstrip())`},
   {t:'mc',q:'Cosa fa la modalità "w"?',opts:['Sovrascrive il file','Aggiunge in fondo','Legge soltanto'],a:0,why:'Per aggiungere senza cancellare si usa "a".'},
   {t:'fill',q:'Apri il file.',code:`with ___("dati.txt") as f:\n    testo = f.read()`,bank:['open','file','read'],ans:['open'],why:'open() restituisce un oggetto file.'},
   {t:'mc',q:'Perché usare with?',opts:['Chiude il file automaticamente','Rende il file più piccolo','È obbligatorio'],a:0,why:'Anche in caso di errore il file viene chiuso.'},
   {t:'mc',q:'Cosa restituisce "ATG\\n".rstrip()?',opts:['"ATG"','"ATG\\n"','"\\nATG"'],mono:1,a:0,why:'rstrip toglie spazi e a capo a destra.'},
   {t:'order',q:'Conta le sequenze di un FASTA.',lines:['n = 0','with open("reads.fa") as f:','    for riga in f:','        if riga.startswith(">"):','            n += 1','print(n)'],why:'Ogni header ">" corrisponde a una sequenza.'}
  ]},
  {id:'p6b',title:'CSV',sub:'csv.DictReader e sorted',ex:[
   {t:'info',title:'Tabelle in testo',text:'Il modulo csv legge file con colonne. DictReader restituisce ogni riga come dizionario.',code:`import csv\n\nwith open("geni.csv") as f:\n    for riga in csv.DictReader(f):\n        print(riga["gene"], riga["cromosoma"])`},
   {t:'mc',q:'Come restituisce ogni riga DictReader?',opts:['Come dizionario con i nomi delle colonne','Come lista di numeri','Come stringa'],a:0,why:'Le chiavi vengono dalla prima riga del file.'},
   {t:'fill',q:'Ordina dal più grande al più piccolo.',code:`sorted(geni, key=lambda g: g["fc"], ___=True)`,bank:['reverse','desc','invert'],ans:['reverse'],why:'reverse=True inverte l’ordine.'},
   {t:'mc',q:'Cosa restituisce sorted([3, 1, 2])?',opts:['[1, 2, 3]','[3, 2, 1]','None'],mono:1,a:0,why:'sorted restituisce una nuova lista ordinata.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`campi = "chr1,100,A,G".split(",")\nprint(len(campi))`,ans:['4'],why:'Quattro valori separati da virgole.'},
   {t:'mc',q:'Per leggere un file TSV con csv.reader, quale delimiter usi?',opts:['"\\t"','","','";"'],mono:1,a:0,why:'TSV = valori separati da tabulazioni.'}
  ]}
 ]},
 {title:'Settimana 7 · Espressioni regolari',lessons:[
  {id:'p7a',title:'re.search',sub:'Pattern di testo',ex:[
   {t:'info',title:'Cercare pattern',text:'Le regex descrivono pattern: . qualsiasi carattere, + uno o più, * zero o più, ? opzionale, ^ inizio, $ fine.',code:`import re\n\nemail = "malan@harvard.edu"\nif re.search(r"^\\w+@\\w+\\.edu$", email):\n    print("valida")`},
   {t:'mc',q:'In una regex, cosa indica ^?',opts:['L’inizio della stringa','La fine della stringa','Qualsiasi carattere'],a:0,why:'$ indica la fine.'},
   {t:'mc',q:'Cosa riconosce A+?',opts:['Una o più A','Zero o più A','Esattamente una A'],mono:1,a:0,why:'+ significa “almeno una volta”.'},
   {t:'fill',q:'Cerca il motivo nella sequenza.',code:`if re.___(r"TATA", seq):\n    print("TATA box")`,bank:['search','find','grep'],ans:['search'],why:'re.search restituisce un match o None.'},
   {t:'mc',q:'Perché si scrive r"..." per le regex?',opts:['È una stringa raw: Python non interpreta i backslash','Rende la regex più veloce','È obbligatorio'],a:0,why:'Così \\w arriva intatto al motore delle regex.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`import re\nprint(bool(re.search(r"^ATG", "ATGCCC")))`,ans:['True'],why:'La stringa inizia con ATG.'}
  ]},
  {id:'p7b',title:'Gruppi e motivi',sub:'finditer, group, sub',ex:[
   {t:'info',title:'Regex per sequenze',text:'Le classi [ACGT] riconoscono un carattere tra quelli elencati. re.finditer trova tutte le posizioni, ad esempio i siti di restrizione.',code:`import re\nseq = "CCGAATTCGGGAATTCA"\nsiti = [m.start() for m in re.finditer("GAATTC", seq)]\nprint(siti)   # [2, 10]  siti EcoRI`},
   {t:'mc',q:'Cosa riconosce [ACGT]?',opts:['Uno qualsiasi tra A, C, G, T','La stringa "ACGT"','Nessuna base'],mono:1,a:0,why:'Le parentesi quadre definiscono un insieme di caratteri.'},
   {t:'fill',q:'Estrai il primo gruppo.',code:`m = re.search(r"(\\w+)@", email)\nutente = m.___(1)`,bank:['group','get','match'],ans:['group'],why:'group(1) restituisce ciò che è tra le prime parentesi.'},
   {t:'mc',q:'Cosa restituisce re.findall(r"A{2}", "AAAA")?',opts:['["AA", "AA"]','["AAAA"]','["A", "A", "A", "A"]'],mono:1,a:0,why:'{2} = esattamente due volte; i match non si sovrappongono.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`import re\nprint(re.sub(r"T", "U", "ATTG"))`,ans:['AUUG'],why:'re.sub sostituisce ogni match.'},
   {t:'mc',q:'Quale regex trova un ATG seguito da codoni fino a uno stop?',opts:['ATG(?:...)*?(?:TAA|TAG|TGA)','ATG*TAA','^TAA$'],mono:1,a:0,why:'(?:...)*? prende triplette in modo non avido fino al primo stop.'}
  ]}
 ]},
 {title:'Settimana 8 · Programmazione a oggetti',lessons:[
  {id:'p8a',title:'Classi',sub:'class, __init__, self',ex:[
   {t:'info',title:'Creare tipi tuoi',text:'Una classe raggruppa dati (attributi) e funzioni (metodi). __init__ inizializza l’oggetto; self è l’oggetto stesso.',code:`class Sequenza:\n    def __init__(self, nome, seq):\n        self.nome = nome\n        self.seq = seq.upper()\n\n    def gc(self):\n        return (self.seq.count("G") + self.seq.count("C")) / len(self.seq)\n\ns = Sequenza("x", "ggat")\nprint(s.gc())   # 0.5`},
   {t:'mc',q:'Cos’è self?',opts:['L’oggetto su cui si chiama il metodo','Una variabile globale','Il nome della classe'],a:0,why:'s.gc() passa automaticamente s come self.'},
   {t:'fill',q:'Il metodo che inizializza l’oggetto.',code:`class Gene:\n    def ___(self, nome):\n        self.nome = nome`,bank:['__init__','init','__new__'],ans:['__init__'],why:'Due trattini bassi prima e dopo.'},
   {t:'mc',q:'A cosa serve __str__?',opts:['Definisce come appare l’oggetto con print()','Confronta oggetti','Cancella l’oggetto'],a:0,why:'print(obj) chiama obj.__str__().'},
   {t:'type',q:'Scrivi cosa stampa.',code:`class C:\n    def __init__(self, n):\n        self.n = n\n\nc = C(5)\nprint(c.n * 2)`,ans:['10'],why:'c.n vale 5.'},
   {t:'order',q:'Scrivi la classe Gene.',lines:['class Gene:','    def __init__(self, nome):','        self.nome = nome','    def __str__(self):','        return f"Gene {self.nome}"'],why:'Prima il costruttore, poi gli altri metodi, tutti indentati nella classe.'}
  ]},
  {id:'p8b',title:'Ereditarietà e proprietà',sub:'super, @property',ex:[
   {t:'info',title:'Riutilizzare le classi',text:'Una sottoclasse eredita attributi e metodi dalla classe madre. @property fa usare un metodo come attributo, utile per validare.',code:`class Sequenza:\n    def __init__(self, seq):\n        self.seq = seq\n\nclass DNA(Sequenza):\n    def trascrivi(self):\n        return self.seq.replace("T", "U")\n\nprint(DNA("ATG").trascrivi())   # AUG`},
   {t:'mc',q:'Cosa significa class DNA(Sequenza)?',opts:['DNA eredita da Sequenza','Sequenza eredita da DNA','Sono la stessa classe'],mono:0,a:0,why:'La classe tra parentesi è la madre.'},
   {t:'fill',q:'Chiama il costruttore della classe madre.',code:`class RNA(Sequenza):\n    def __init__(self, seq):\n        ___().__init__(seq)`,bank:['super','self','parent'],ans:['super'],why:'super() dà accesso ai metodi della classe madre.'},
   {t:'mc',q:'Un @classmethod riceve come primo argomento…',opts:['cls, la classe','self, l’istanza','niente'],a:0,why:'Lavora sulla classe, non su un singolo oggetto.'},
   {t:'mc',q:'Cosa fa @property?',opts:['Fa usare un metodo come attributo, anche per validare','Rende l’attributo privato per sempre','Crea una costante'],a:0,why:'Con un setter puoi rifiutare valori non validi.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`class A:\n    def ciao(self):\n        return "A"\n\nclass B(A):\n    pass\n\nprint(B().ciao())`,ans:['A'],why:'B non ridefinisce ciao, quindi usa quello di A.'}
  ]}
 ]},
 {title:'Settimana 9 · Et cetera',lessons:[
  {id:'p9a',title:'set, type hint, docstring',sub:'Strumenti utili',ex:[
   {t:'info',title:'Codice più pulito',text:'Un set contiene valori senza duplicati. I type hint documentano i tipi; le docstring spiegano cosa fa una funzione.',code:`basi = {"A", "C", "G", "T"}\nprint(all(b in basi for b in "ATGX"))   # False\n\ndef gc(seq: str) -> float:\n    """Restituisce la frazione di G e C."""\n    ...`},
   {t:'mc',q:'Cosa restituisce set(["A", "A", "C"])?',opts:['{"A", "C"}','["A", "A", "C"]','3'],mono:1,a:0,why:'Il set elimina i duplicati.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print(len({"A", "T", "A", "G"}))`,ans:['3'],why:'Le A duplicate contano una volta sola.'},
   {t:'mc',q:'Cosa restituisce any([False, True])?',opts:['True','False','[True]'],mono:1,a:0,why:'any è vero se almeno un elemento è vero.'},
   {t:'mc',q:'A cosa servono i type hint come seq: str?',opts:['Documentano i tipi; strumenti come mypy li controllano','Python li impone sempre quando il programma gira','Accelerano il codice'],a:0,why:'Python non li verifica a runtime.'},
   {t:'fill',q:'List comprehension che toglie le N.',code:`pulita = [b ___ b in seq if b != "N"]`,bank:['for','in','with'],ans:['for'],why:'[espressione for elemento in sequenza if condizione].'}
  ]},
  {id:'p9b',title:'Comprehension e unpacking',sub:'Python idiomatico',ex:[
   {t:'info',title:'Scrivere come un pythonista',text:'enumerate dà indice e valore; le dict comprehension creano dizionari in una riga; *args accetta un numero variabile di argomenti.',code:`geni = ["TP53", "MYC"]\nfor i, g in enumerate(geni, start=1):\n    print(i, g)\n\nlunghezze = {g: len(g) for g in geni}\nprint(lunghezze)   # {'TP53': 4, 'MYC': 3}`},
   {t:'type',q:'Scrivi cosa stampa.',code:`print([x for x in range(6) if x % 2 == 0])`,ans:['[0, 2, 4]'],why:'Solo i pari tra 0 e 5.'},
   {t:'mc',q:'Cosa produce enumerate(["a", "b"])?',opts:['(0, "a"), (1, "b")','"a", "b"','0, 1'],mono:1,a:0,why:'Coppie (indice, valore).'},
   {t:'fill',q:'Accetta un numero qualsiasi di argomenti.',code:`def somma(___numeri):\n    return sum(numeri)`,bank:['*','**','&'],ans:['*'],why:'*args raccoglie gli argomenti posizionali in una tupla; ** raccoglie quelli con nome.'},
   {t:'mc',q:'Cosa fa a, b = b, a?',opts:['Scambia i valori','Errore','Crea una tupla vuota'],mono:0,a:0,why:'Unpacking: il lato destro viene valutato prima.'},
   {t:'mc',q:'Cosa restituisce list(map(str.upper, ["a", "t"]))?',opts:['["A", "T"]','"AT"','["a", "t"]'],mono:1,a:0,why:'map applica la funzione a ogni elemento.'}
  ]}
 ]}
]});
