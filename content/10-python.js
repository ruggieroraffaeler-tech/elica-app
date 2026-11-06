/* Corso: py — vedi README per il formato degli esercizi */
ELICA.addCourse({
  id: "py",
  order: 10,
  name: "Python",
  lang: "python",
  tag: "Allineato alle 10 settimane di CS50’s Introduction to Programming with Python (CS50P) di Harvard, con esempi presi dalla biologia.",
  units: [
  { title: "Settimana 0 · Funzioni e variabili", lessons: [
    { id: "p0a", title: "print e input", sub: "Il primo programma", ex: [
        { t: "info", title: "Il primo programma", text: "Un programma è un elenco di istruzioni che il computer esegue una dopo l’altra, dall’alto in basso. In Python lo scrivi in un file di testo con estensione `.py` e lo avvii dal terminale con `python nomefile.py`.\n\n`print()` è una **funzione**: un comando con un nome, seguito da parentesi tonde. Quello che metti tra parentesi si chiama **argomento**. `print` mostra i suoi argomenti sullo schermo.\n\nIl testo va tra virgolette, doppie `\"…\"` o singole `'…'`: si chiama **stringa** (in inglese *string*, `str`).", code: `print("ciao, mondo")
print('anche le virgolette singole vanno bene')`, cpp: "Niente `#include`, niente `main()` obbligatorio, niente `;` a fine riga: il file viene eseguito dall’alto in basso. Python è interpretato: non c’è una fase di compilazione separata." },
        { t: "info", title: "Le variabili", text: "Una **variabile** è un nome che si riferisce a un valore. La crei assegnandole qualcosa con `=`: a sinistra il nome, a destra il valore.\n\nNon devi dichiarare il tipo: Python lo capisce dal valore (si dice *tipizzazione dinamica*). La stessa variabile può poi ricevere un valore di tipo diverso.", points: ["Nomi validi: lettere, cifre e `_`, ma **non** possono iniziare con una cifra (`gene_1` sì, `1gene` no).", "Maiuscole e minuscole contano: `Nome` e `nome` sono due variabili diverse.", "Per convenzione in Python si scrive in minuscolo con `_`: `nome_gene` (lo *snake_case*).", "`type(x)` ti dice il tipo di un valore: `str`, `int`, `float`…"], code: `nome = "Rosalind"
anni = 37
print(nome)
print(type(anni))   # <class 'int'>`, cpp: "Niente `int x;` o `std::string s;`: la variabile nasce con l’assegnazione. Il tipo appartiene al valore, non al nome." },
        { t: "info", title: "Gli argomenti di print: sep ed end", text: "`print` accetta più argomenti separati da virgole e li stampa uno dopo l’altro, **separati da uno spazio**. Alla fine va **a capo**.\n\nPuoi cambiare questi due comportamenti con due *argomenti con nome* (in inglese *keyword arguments*), cioè scritti come `nome=valore`:", points: ["`sep` = cosa mettere tra gli argomenti (di default uno spazio `\" \"`).", "`end` = cosa mettere alla fine (di default `\"\\n\"`, il carattere “a capo”)."], code: `print("ciao,", "David")          # ciao, David
print("a", "b", sep="-")         # a-b
print("ciao", end="!")
print("mondo")                   # sulla stessa riga: ciao!mondo`, note: "`\"\\n\"` è un solo carattere speciale che significa “vai a capo”. Con `end=\"\"` il prossimo `print` continua sulla stessa riga." },
        { t: "mc", q: "Cosa stampa?", code: `print("ciao,", "David")`, opts: ["ciao,David", "ciao, David", "ciao, \"David\""], mono: 1, a: 1, why: "print separa gli argomenti con uno spazio (sep=\" \")." },
        { t: "fill", q: "Stampa senza andare a capo.", code: `print("ciao", ___="")`, bank: ["end", "sep", "stop"], ans: ["end"], why: "end sostituisce il carattere \\n che print aggiunge di default." },
        { t: "mc", q: "Cosa stampa?", code: `print("a", "b", sep="-")`, opts: ["a-b", "a b", "ab-"], mono: 1, a: 0, why: "sep sceglie cosa mettere tra gli argomenti." },
        { t: "type", q: "Scrivi esattamente cosa stampa.", code: `print("ciao", end="!")
print("mondo")`, ans: ["ciao!mondo"], why: "Il primo print finisce con \"!\" invece di andare a capo." },
        { t: "info", title: "Chiedere qualcosa all’utente: input()", text: "`input()` mostra un messaggio (il *prompt*), aspetta che l’utente scriva qualcosa e prema Invio, e **restituisce** il testo scritto. Di solito lo salvi in una variabile.\n\n`input()` restituisce **sempre una stringa**, anche se l’utente scrive un numero: vedremo come convertirla nella lezione sui numeri.\n\nPer unire stringhe puoi usare `+` (si chiama *concatenazione*): `\"ciao, \" + nome`.", code: `nome = input("Come ti chiami? ")
saluto = "ciao, " + nome
print(saluto)` },
        { t: "order", q: "Chiedi il nome e salutalo.", lines: ["nome = input(\"Nome? \")", "saluto = \"ciao, \" + nome", "print(saluto)"], why: "Prima leggi l’input, poi costruisci il saluto, infine lo stampi." }
    ]},
    { id: "p0b", title: "Stringhe e f-string", sub: "strip, title, split", ex: [
        { t: "info", title: "I metodi delle stringhe", text: "Un **metodo** è una funzione che “appartiene” a un valore: la chiami con un punto dopo il valore, `valore.metodo()`.\n\nLe stringhe hanno molti metodi utili. Importante: **non modificano** la stringa originale, ne **restituiscono una nuova**. Per tenere il risultato devi riassegnarlo.", points: ["`strip()` toglie spazi (e a capo) all’inizio e alla fine; `lstrip()` solo a sinistra, `rstrip()` solo a destra.", "`lower()` tutto minuscolo, `upper()` tutto maiuscolo.", "`title()` iniziale maiuscola per ogni parola, `capitalize()` solo per la prima.", "Puoi concatenare i metodi: `s.strip().title()` applica prima `strip`, poi `title` al risultato."], code: `nome = "  ada lovelace "
print(nome.strip())          # "ada lovelace"
nome = nome.strip().title()  # riassegno il risultato
print(nome)                  # "Ada Lovelace"`, cpp: "Le stringhe di Python sono **immutabili**: `s.upper()` non cambia `s`, crea una stringa nuova. Non esiste `s[0] = \"A\"`." },
        { t: "info", title: "Le f-string", text: "Una **f-string** è una stringa con una `f` davanti alle virgolette. Dentro, tra parentesi graffe `{}`, puoi mettere variabili o espressioni intere: Python le calcola e le inserisce nel testo.\n\nÈ il modo più comodo per costruire messaggi. Senza f-string dovresti convertire i numeri con `str()` e concatenare con `+`.", code: `nome = "Ada"
x = 3
print(f"ciao, {nome}")            # ciao, Ada
print(f"{x} + {x} = {x + x}")      # 3 + 3 = 6
gc = 0.4166
print(f"GC: {gc:.2f}")             # GC: 0.42 (2 decimali)
print("x vale " + str(x))          # senza f-string` },
        { t: "mc", q: "Cosa restituisce \"  hey \".strip()?", opts: ["\"hey\"", "\"  hey\"", "\"hey \""], mono: 1, a: 0, why: "strip() rimuove gli spazi da entrambi i lati." },
        { t: "fill", q: "Crea una f-string.", code: `gc = 0.42
print(___"GC: {gc}")`, bank: ["f", "r", "s"], ans: ["f"], why: "La f davanti alle virgolette attiva la sostituzione delle {variabili}." },
        { t: "mc", q: "Cosa restituisce \"harvard university\".title()?", opts: ["Harvard University", "HARVARD UNIVERSITY", "Harvard university"], mono: 1, a: 0, why: "title() rende maiuscola la prima lettera di ogni parola." },
        { t: "type", q: "Scrivi cosa stampa.", code: `x = 3
print(f"{x} + {x} = {x + x}")`, ans: ["3 + 3 = 6"], why: "Dentro le graffe di una f-string puoi mettere espressioni." },
        { t: "info", title: "split e assegnazione multipla", text: "`split()` divide una stringa in pezzi e restituisce una **lista** (una sequenza ordinata di valori, la vedremo bene più avanti). Tra parentesi indichi il separatore; senza argomenti divide sugli spazi.\n\nSe sai quanti pezzi ottieni, puoi assegnarli a più variabili in una riga: si chiama *unpacking* (spacchettamento). I valori vengono assegnati in ordine.", code: `parti = "Ada Lovelace".split(" ")
print(parti)            # ['Ada', 'Lovelace']
nome, cognome = "Ada Lovelace".split(" ")
print(cognome)          # Lovelace`, note: "Se il numero di variabili e di pezzi non coincide, Python solleva un errore (`ValueError`)." },
        { t: "mc", q: "Quanto vale cognome?", code: `nome, cognome = "Ada Lovelace".split(" ")`, opts: ["\"Lovelace\"", "\"Ada\"", "[\"Ada\", \"Lovelace\"]"], mono: 1, a: 0, why: "split restituisce due pezzi, assegnati in ordine alle due variabili." }
    ]},
    { id: "p0c", title: "Numeri e funzioni", sub: "int, float, def, return", ex: [
        { t: "info", title: "Numeri interi e decimali", text: "Python ha due tipi numerici principali: `int` (interi, come `7`) e `float` (decimali, come `3.14`, con il punto).", points: ["`+  -  *` come in matematica.", "`/` divisione: dà **sempre** un `float` (`7 / 2` → `3.5`).", "`//` divisione intera: `7 // 2` → `3`.", "`%` resto della divisione (modulo): `7 % 2` → `1`.", "`**` potenza: `2 ** 10` → `1024`.", "`round(x, n)` arrotonda a `n` decimali: `round(3.14159, 2)` → `3.14`."], code: `print(7 / 2)    # 3.5
print(7 // 2)   # 3
print(7 % 2)    # 1
print(round(3.14159, 2))   # 3.14`, cpp: "In C++ `7 / 2` tra interi fa `3`; in Python fa `3.5`. Per la divisione intera usa `//`. Con i negativi `//` arrotonda verso il basso: `-7 // 2` → `-4` (in C++ `-3`). Gli `int` non vanno mai in overflow: possono essere grandi quanto vuoi." },
        { t: "info", title: "Convertire tra tipi", text: "Siccome `input()` restituisce sempre una stringa, per fare calcoli devi convertirla: `int(\"42\")` → `42`, `float(\"3.5\")` → `3.5`. Al contrario, `str(42)` → `\"42\"`.\n\nAttenzione a cosa fa `+`: tra numeri **somma**, tra stringhe **concatena**.", code: `print(1 + 2)        # 3
print("1" + "2")    # 12  (due stringhe attaccate)
x = int(input("x? "))
print(x * 2)`, note: "Se la stringa non rappresenta un numero, `int(\"gatto\")` causa un errore (`ValueError`). Vedremo come gestirlo nella Settimana 3." },
        { t: "mc", q: "Cosa restituisce \"1\" + \"2\"?", opts: ["3", "\"12\"", "Errore"], mono: 1, a: 1, why: "Sono stringhe: + le concatena. Per sommare, prima int()." },
        { t: "fill", q: "Converti l’input in un intero.", code: `x = ___(input("x? "))`, bank: ["int", "str", "num"], ans: ["int"], why: "int() converte una stringa in un numero intero." },
        { t: "mc", q: "Cosa restituisce round(3.14159, 2)?", opts: ["3.14", "3.1", "3"], mono: 1, a: 0, why: "Il secondo argomento indica quante cifre decimali tenere." },
        { t: "type", q: "Scrivi cosa stampa.", code: `print(7 // 2, 7 % 2)`, ans: ["3 1"], why: "// è la divisione intera, % il resto." },
        { t: "info", title: "Definire le tue funzioni", text: "Con `def` crei una funzione tua: nome, parametri tra parentesi, due punti, e sotto il **corpo** rientrato di 4 spazi.\n\n`return` restituisce un valore a chi ha chiamato la funzione. Se una funzione non ha `return`, restituisce `None` (il “niente” di Python).\n\nUn parametro può avere un **valore di default**: se chiami la funzione senza quell’argomento, si usa il default.", code: `def quadrato(n):
    return n * n

def ciao(nome="mondo"):
    print("ciao,", nome)

print(quadrato(4))   # 16
ciao()               # ciao, mondo
ciao("David")        # ciao, David`, cpp: "Niente tipo di ritorno né tipi dei parametri, niente graffe: il corpo è definito dall’indentazione." },
        { t: "mc", q: "Cosa stampa?", code: `def ciao(a="mondo"):
    print("ciao,", a)

ciao()`, opts: ["ciao, mondo", "Errore", "ciao,"], mono: 1, a: 0, why: "Se non passi l’argomento, si usa il valore di default." },
        { t: "info", title: "La funzione main", text: "Nei programmi di CS50 si mette il codice principale in una funzione `main()` e la si chiama **in fondo** al file.\n\nPerché funziona anche se `main` usa funzioni definite dopo? Perché `def` crea solo la funzione: il codice dentro viene eseguito quando la **chiami**. Quando arriva `main()` in fondo, tutte le funzioni esistono già.", code: `def main():
    x = int(input("x? "))
    print(quadrato(x))

def quadrato(n):
    return n * n

main()` },
        { t: "order", q: "Struttura il programma con main().", lines: ["def main():", "    x = int(input(\"x? \"))", "    print(quadrato(x))", "main()"], why: "Si definisce main e poi la si chiama in fondo al file." }
    ]}
  ]},
  { title: "Settimana 1 · Condizionali", lessons: [
    { id: "p1a", title: "if, elif, else", sub: "Prendere decisioni", ex: [
        { t: "info", title: "Domande che rispondono vero o falso", text: "Un **confronto** produce un valore booleano (tipo `bool`): `True` (vero) o `False` (falso). Gli operatori sono:", points: ["`==` uguale, `!=` diverso", "`<` minore, `>` maggiore, `<=` minore o uguale, `>=` maggiore o uguale"], code: `x = 5
print(x > 3)     # True
print(x == 4)    # False
print(x != 4)    # True`, note: "`=` **assegna** un valore, `==` **confronta**. Scrivere `if x = 0:` è un errore di sintassi." },
        { t: "info", title: "if, elif, else", text: "`if` esegue un blocco di codice solo se la condizione è vera. Dopo la condizione vanno i **due punti**, e il blocco è **rientrato** (indentato) di 4 spazi: l’indentazione fa parte della sintassi.\n\n`elif` (= *else if*) prova un’altra condizione se la precedente era falsa; `else` cattura tutti gli altri casi. Si esegue **solo il primo** ramo vero, gli altri vengono saltati. `elif` ed `else` sono facoltativi.", code: `x = 5
y = 8
if x < y:
    print("x è minore")
elif x > y:
    print("x è maggiore")
else:
    print("sono uguali")`, note: "Se dimentichi di rientrare la riga dopo `if …:`, Python si ferma con `IndentationError`. Usa sempre 4 spazi, non mescolare spazi e tab.", cpp: "Niente parentesi obbligatorie attorno alla condizione e niente graffe: `if x < y:` e poi il blocco indentato. Si scrive `elif`, non `else if`." },
        { t: "mc", q: "Cosa stampa?", code: `x = 5
if x > 3:
    print("alto")
else:
    print("basso")`, opts: ["alto", "basso", "niente"], mono: 1, a: 0, why: "5 > 3 è vero, quindi si esegue il primo blocco." },
        { t: "fill", q: "Controlla se x è uguale a zero.", code: `if x ___ 0:
    print("zero")`, bank: ["==", "=", "!="], ans: ["=="], why: "== confronta; = assegna e qui darebbe errore." },
        { t: "mc", q: "Cosa succede se dimentichi l’indentazione dopo un if?", opts: ["Funziona uguale", "IndentationError", "Stampa due volte"], a: 1, why: "In Python l’indentazione fa parte della sintassi." },
        { t: "info", title: "Pari o dispari: il resto della divisione", text: "Un numero è pari se il resto della divisione per 2 è zero. Con l’operatore `%` diventa una condizione: `n % 2 == 0`.", code: `n = 7
if n % 2 == 0:
    print("pari")
else:
    print("dispari")` },
        { t: "type", q: "Scrivi cosa stampa.", code: `x = 7
if x % 2 == 0:
    print("pari")
else:
    print("dispari")`, ans: ["dispari"], why: "7 % 2 vale 1, quindi la condizione è falsa." },
        { t: "order", q: "Ordina per classificare n.", lines: ["if n > 0:", "    print(\"positivo\")", "elif n < 0:", "    print(\"negativo\")", "else:", "    print(\"zero\")"], why: "if, poi elif, infine else." }
    ]},
    { id: "p1b", title: "Logica booleana e match", sub: "and, or, not, match", ex: [
        { t: "info", title: "and, or, not", text: "Si possono combinare più condizioni:", points: ["`A and B` è vero solo se **entrambe** sono vere.", "`A or B` è vero se **almeno una** è vera.", "`not A` inverte: vero diventa falso e viceversa.", "Python valuta da sinistra e si ferma appena conosce il risultato (*cortocircuito*): in `False and X`, `X` non viene neanche guardato."], code: `print(True and False)   # False
print(True or False)    # True
print(not (3 > 5))      # True
punteggio = 85
print(80 <= punteggio < 90)   # True: confronti concatenati`, cpp: "Si scrive `and`, `or`, `not` invece di `&&`, `||`, `!`. I confronti si possono concatenare: `80 <= x < 90` equivale a `80 <= x and x < 90`." },
        { t: "mc", q: "Quanto vale True and False?", opts: ["True", "False", "None"], mono: 1, a: 1, why: "and è vero solo se entrambe le condizioni sono vere." },
        { t: "mc", q: "Quanto vale not (3 > 5)?", opts: ["True", "False"], mono: 1, a: 0, why: "3 > 5 è False, not lo inverte." },
        { t: "info", title: "match: scegliere tra tanti casi", text: "Quando devi confrontare un valore con molti casi, invece di una catena di `elif` puoi usare `match` (da Python 3.10).\n\nOgni `case` è un caso possibile; con `|` metti più alternative nello stesso caso; `case _:` cattura tutto il resto (come `else`).", code: `base = "T"
match base:
    case "A" | "G":
        print("purina")
    case "C" | "T":
        print("pirimidina")
    case _:
        print("base sconosciuta")`, cpp: "Somiglia a `switch`, ma non serve `break` e non c’è “caduta” al caso successivo. Funziona anche con le stringhe." },
        { t: "fill", q: "Due casi nello stesso case.", code: `match base:
    case "A" ___ "G":
        print("purina")`, bank: ["|", "or", "&"], ans: ["|"], why: "In match si usa | per elencare alternative." },
        { t: "info", title: "Restituire direttamente un booleano", text: "Un confronto è già un valore `True`/`False`, quindi puoi restituirlo direttamente invece di scrivere un `if` con due `return`. Il codice è più corto e più leggibile.", code: `def is_even(n):
    return n % 2 == 0

# equivale a:
# def is_even(n):
#     if n % 2 == 0:
#         return True
#     else:
#         return False

print(is_even(4))   # True` },
        { t: "mc", q: "Cosa restituisce is_even(4)?", code: `def is_even(n):
    return n % 2 == 0`, opts: ["True", "0", "\"pari\""], mono: 1, a: 0, why: "Puoi restituire direttamente il risultato di un confronto: è più pythonico di un if/else." },
        { t: "type", q: "Scrivi cosa stampa.", code: `base = "T"
match base:
    case "A" | "G":
        print("purina")
    case _:
        print("pirimidina")`, ans: ["pirimidina"], why: "T non è tra A e G, quindi scatta il caso _." }
    ]}
  ]},
  { title: "Settimana 2 · Cicli", lessons: [
    { id: "p2a", title: "while e for", sub: "Ripetere", ex: [
        { t: "info", title: "while: ripetere finché", text: "`while` ripete il suo blocco **finché** la condizione è vera. Prima di ogni giro ricontrolla la condizione.\n\nDi solito c’è una variabile che cambia a ogni giro; se non cambia mai, il ciclo non finisce (*ciclo infinito*: si ferma con Ctrl+C).", code: `i = 0
while i < 3:
    print("miao")
    i += 1          # come i = i + 1`, cpp: "Non esistono `i++` né `++i`: si scrive `i += 1`." },
        { t: "info", title: "for e range", text: "`for` prende uno alla volta gli elementi di una sequenza e li mette nella variabile del ciclo.\n\n`range(n)` genera i numeri da `0` a `n - 1` (il numero finale è **escluso**). Varianti: `range(a, b)` da `a` a `b - 1`; `range(a, b, passo)` saltando di `passo`.\n\nSe la variabile del ciclo non ti serve, per convenzione la chiami `_`.", code: `for i in range(3):
    print(i)          # 0, 1, 2

for i in range(1, 10, 3):
    print(i)          # 1, 4, 7

for _ in range(2):
    print("miao")`, cpp: "Il `for` di Python è come il *range-based for* (`for (auto x : v)`). `for i in range(n)` sostituisce `for (int i = 0; i < n; i++)`." },
        { t: "mc", q: "Cosa stampa?", code: `for i in range(3):
    print(i)`, opts: ["0 1 2", "1 2 3", "0 1 2 3"], mono: 1, a: 0, why: "range(3) genera 0, 1, 2: il 3 è escluso." },
        { t: "info", title: "break e continue", text: "Dentro un ciclo puoi controllarne il flusso:", points: ["`break` **esce** subito dal ciclo.", "`continue` salta il resto del giro e passa al **successivo**."], code: `# schema classico per chiedere un valore finché non è valido
while True:
    n = int(input("Numero positivo? "))
    if n > 0:
        break
print("hai scritto", n)`, note: "`while True` da solo sarebbe infinito: è il `break` a farlo terminare quando l’input va bene." },
        { t: "fill", q: "Esci dal ciclo quando l’input è valido.", code: `while True:
    n = int(input("n? "))
    if n > 0:
        ___`, bank: ["break", "continue", "return"], ans: ["break"], why: "break interrompe il ciclo: è il modo classico per validare un input." },
        { t: "info", title: "Accumulare un risultato", text: "Per calcolare una somma (o un conteggio) dentro un ciclo: crea la variabile **prima** del ciclo con valore iniziale `0`, e aggiornala a ogni giro.", code: `totale = 0
for i in range(1, 4):
    totale += i      # 1, poi 3, poi 6
print(totale)        # 6` },
        { t: "type", q: "Scrivi cosa stampa.", code: `totale = 0
for i in range(1, 4):
    totale += i
print(totale)`, ans: ["6"], why: "1 + 2 + 3 = 6." },
        { t: "mc", q: "Cosa fa continue in un ciclo?", opts: ["Salta al giro successivo", "Esce dal ciclo", "Ripete il giro corrente"], a: 0, why: "continue salta il resto del corpo e passa all’iterazione seguente." },
        { t: "order", q: "Chiedi un numero finché non è positivo.", lines: ["while True:", "    n = int(input(\"n? \"))", "    if n > 0:", "        break", "print(n)"], why: "Il print va fuori dal ciclo, dopo il break." }
    ]},
    { id: "p2b", title: "Liste e dizionari", sub: "Collezioni", ex: [
        { t: "info", title: "Le liste", text: "Una **lista** è una sequenza ordinata di valori tra parentesi quadre, separati da virgole. Si può modificare: aggiungere, togliere, cambiare elementi.", points: ["L’indice parte da **0**: `geni[0]` è il primo elemento. `geni[-1]` è l’ultimo.", "`len(geni)` restituisce quanti elementi ci sono.", "`geni.append(x)` aggiunge `x` in fondo.", "Usare un indice che non esiste causa `IndexError`.", "`+` unisce due liste, `*` ripete: `[0] * 3` → `[0, 0, 0]`. Lo stesso vale per le stringhe: `\"A\" * 2` → `\"AA\"`."], code: `geni = ["BRCA1", "TP53"]
geni.append("EGFR")
print(geni[0], geni[-1], len(geni))   # BRCA1 EGFR 3
for g in geni:
    print(g)`, cpp: "Somiglia a `std::vector`, ma può contenere valori di tipi diversi. Si chiama `append`, non `push_back`." },
        { t: "mc", q: "Cosa stampa?", code: `nums = [4, 8, 15]
print(nums[2])`, opts: ["8", "15", "Errore"], mono: 1, a: 1, why: "Indice 2 = terzo elemento." },
        { t: "fill", q: "Aggiungi \"MYC\" alla lista.", code: `geni.___("MYC")`, bank: ["append", "add", "push"], ans: ["append"], why: "In Python si usa append(); push() è di JavaScript." },
        { t: "info", title: "I dizionari", text: "Un **dizionario** associa **chiavi** a **valori**, tra parentesi graffe: `{chiave: valore}`. Si legge un valore con `d[chiave]`.\n\nAssegnare `d[chiave] = valore` aggiunge la chiave, se non c’è, oppure ne cambia il valore.", points: ["Leggere una chiave che non esiste causa `KeyError`; `d.get(chiave, default)` restituisce invece `default`.", "`len(d)` = numero di coppie.", "`for k in d:` scorre le **chiavi**; `for k, v in d.items():` scorre chiavi e valori insieme."], code: `codoni = {"AUG": "Met", "UAA": "Stop"}
codoni["GCC"] = "Ala"          # aggiunge una chiave
print(len(codoni))             # 3
print(codoni.get("XYZ", "?"))  # ?
for c, aa in codoni.items():
    print(c, aa)`, cpp: "È simile a `std::unordered_map`, ma leggere con `d[k]` una chiave assente **non** la crea: solleva un errore." },
        { t: "mc", q: "Quanto vale len(d)?", code: `d = {"A": 1}
d["C"] = 2`, opts: ["1", "2", "Errore"], mono: 1, a: 1, why: "Assegnare una chiave nuova la aggiunge al dizionario." },
        { t: "info", title: "Liste di dizionari", text: "Per una tabella di dati (es. un gene per riga) si usa spesso una **lista di dizionari**: ogni dizionario è una riga, le chiavi sono i nomi delle colonne.\n\nPer leggere un valore usi prima l’indice della riga, poi la chiave: `geni[0][\"chr\"]`.", code: `geni = [
    {"nome": "TP53", "chr": "17"},
    {"nome": "BRCA1", "chr": "17"},
]
print(geni[0]["nome"])     # TP53
for g in geni:
    print(g["nome"], "sul cromosoma", g["chr"])` },
        { t: "mc", q: "Cosa restituisce geni[0][\"chr\"]?", code: `geni = [{"nome": "TP53", "chr": "17"}]`, opts: ["\"17\"", "\"TP53\"", "Errore"], mono: 1, a: 0, why: "[0] prende il primo dizionario, [\"chr\"] il suo valore." },
        { t: "type", q: "Scrivi cosa stampa (righe separate da spazio).", code: `for b in ["A", "C"]:
    print(b * 2)`, ans: ["AA CC"], why: "Una stringa moltiplicata per n viene ripetuta n volte." }
    ]},
    { id: "p2c", title: "Cicli dentro funzioni", sub: "Astrazione", ex: [
        { t: "info", title: "Cicli dentro le funzioni", text: "Mettere un ciclo dentro una funzione con un nome chiaro rende il codice riutilizzabile e più leggibile: si chiama *astrazione*.\n\nUn `for` su una stringa scorre **un carattere alla volta**.", code: `def colonna(altezza):
    for _ in range(altezza):
        print("#")

def conta_a(seq):
    n = 0
    for b in seq:
        if b == "A":
            n += 1
    return n

colonna(3)
print(conta_a("GATTACA"))   # 3
print("#" * 4)             # ####` },
        { t: "mc", q: "Cosa stampa print(\"#\" * 4)?", opts: ["####", "#4", "Errore"], mono: 1, a: 0, why: "Moltiplicare una stringa per un intero la ripete." },
        { t: "info", title: "print o return?", text: "`print` **mostra** un valore sullo schermo, ma la funzione poi non lo restituisce a nessuno. `return` lo **restituisce** a chi ha chiamato la funzione, che può salvarlo, usarlo in un calcolo o stamparlo.\n\nIn generale: le funzioni che calcolano qualcosa usano `return`; la stampa la fai fuori.", code: `def doppio_print(x):
    print(x * 2)

def doppio(x):
    return x * 2

risultato = doppio(5) + 1     # 11
print(risultato)
doppio_print(5)               # stampa 10, ma restituisce None` },
        { t: "fill", q: "Completa la funzione.", code: `def doppio(x):
    ___ x * 2`, bank: ["return", "print", "yield"], ans: ["return"], why: "return restituisce il valore a chi chiama la funzione." },
        { t: "mc", q: "Quante righe stampa?", code: `for b in "ACGT":
    print(b)`, opts: ["1", "4", "Errore"], a: 1, why: "Il for su una stringa scorre un carattere alla volta." },
        { t: "info", title: "Dove “vivono” le variabili", text: "Le variabili create dentro una funzione (compresi i parametri) esistono **solo** dentro quella funzione: è il loro *scope* (ambito). Fuori non sono visibili.\n\nPer questo una funzione deve **definirsi prima di essere chiamata**: quando Python esegue la chiamata, la funzione deve già esistere.", code: `def saluta(nome):
    messaggio = "Ciao " + nome
    return messaggio

print(saluta("Rosalind"))
# print(messaggio)  -> NameError: qui fuori non esiste` },
        { t: "type", q: "Scrivi cosa stampa.", code: `def f(s):
    return s * 3

print(f("ab"))`, ans: ["ababab"], why: "\"ab\" ripetuto tre volte." },
        { t: "order", q: "Definisci e usa la funzione.", lines: ["def saluta(nome):", "    return \"Ciao \" + nome", "print(saluta(\"Rosalind\"))"], why: "La funzione va definita prima di essere chiamata." }
    ]}
  ]},
  { title: "Settimana 3 · Eccezioni", lessons: [
    { id: "p3a", title: "try ed except", sub: "Gestire gli errori", ex: [
        { t: "info", title: "Quando qualcosa va storto", text: "Ci sono due tipi di errori.\n\nGli **errori di sintassi** (`SyntaxError`) sono codice scritto male: Python li vede prima di eseguire. Le **eccezioni** invece succedono mentre il programma gira. Ogni eccezione ha un nome che dice cosa è successo:", points: ["`ValueError`: il tipo è giusto ma il valore no (`int(\"gatto\")`).", "`TypeError`: tipo sbagliato per l’operazione (`\"a\" + 1`).", "`NameError`: usi un nome (variabile o funzione) che non esiste.", "`IndexError` / `KeyError`: indice di lista o chiave di dizionario inesistente.", "`ZeroDivisionError`: divisione per zero."], note: "Quando il programma si ferma, Python stampa un *traceback*: leggilo dal basso. L’ultima riga dice il tipo di eccezione e il motivo." },
        { t: "mc", q: "Che eccezione solleva int(\"cat\")?", opts: ["ValueError", "TypeError", "NameError"], mono: 1, a: 0, why: "Il tipo è giusto (stringa) ma il valore non si può convertire." },
        { t: "mc", q: "Usare una variabile mai definita solleva…", opts: ["NameError", "ValueError", "SyntaxError"], mono: 1, a: 0, why: "Python non trova quel nome." },
        { t: "info", title: "try ed except", text: "Con `try` provi a eseguire del codice; se succede un’eccezione del tipo indicato in `except`, invece di fermarsi il programma esegue il blocco `except`.\n\nIl blocco `else` (facoltativo) viene eseguito **solo se nel try non c’è stata nessuna eccezione**.", code: `try:
    x = int(input("x? "))
except ValueError:
    print("Non è un intero")
else:
    print(f"x è {x}")`, note: "Metti nel `try` solo le righe che possono fallire, e cattura solo il tipo di errore che ti aspetti.", cpp: "`try/catch` diventa `try/except`, `throw` diventa `raise`. Non devi dichiarare quali eccezioni una funzione può lanciare." },
        { t: "fill", q: "Cattura l’errore di conversione.", code: `try:
    n = int(s)
except ___:
    n = 0`, bank: ["ValueError", "ErrorValue", "catch"], ans: ["ValueError"], why: "Cattura solo l’errore che ti aspetti, non tutti." },
        { t: "mc", q: "Quando si esegue il blocco else di un try?", opts: ["Solo se non ci sono eccezioni", "Sempre", "Solo se c’è un’eccezione"], a: 0, why: "else va dopo except e parte solo se il try è andato bene." },
        { t: "info", title: "Riprovare finché va bene", text: "Unendo `while True`, `try` ed `except` ottieni una funzione che richiede un intero finché l’utente non ne scrive uno valido.\n\nIl `return` dentro il `try` esce dalla funzione (e quindi dal ciclo) appena la conversione riesce. `pass` nell’`except` significa “non fare niente”: si ricomincia il ciclo.", code: `def get_int(prompt):
    while True:
        try:
            return int(input(prompt))
        except ValueError:
            pass` },
        { t: "order", q: "Scrivi get_int: richiede un intero finché è valido.", lines: ["def get_int(prompt):", "    while True:", "        try:", "            return int(input(prompt))", "        except ValueError:", "            pass"], why: "Il ciclo riprova; pass ignora l’errore e ricomincia." }
    ]},
    { id: "p3b", title: "raise e pass", sub: "Sollevare errori", ex: [
        { t: "info", title: "pass e raise", text: "`pass` è un’istruzione che **non fa niente**. Serve dove la sintassi richiede un blocco ma non vuoi fare nulla.\n\n`raise` **solleva** un’eccezione tu stesso, quando i dati non vanno bene. Chi chiama la funzione può gestirla con `try/except`.", code: `def gc(seq):
    if not seq:      # stringa vuota
        raise ValueError("sequenza vuota")
    return (seq.count("G") + seq.count("C")) / len(seq)

try:
    gc("")
except ValueError as e:
    print("errore:", e)      # errore: sequenza vuota`, cpp: "`throw std::invalid_argument(\"…\")` diventa `raise ValueError(\"…\")`." },
        { t: "mc", q: "Cosa fa pass?", opts: ["Niente: è un segnaposto", "Esce dal programma", "Ripete il ciclo"], a: 0, why: "Serve dove la sintassi richiede un’istruzione ma non vuoi fare nulla." },
        { t: "fill", q: "Solleva un errore.", code: `___ ValueError("base non valida")`, bank: ["raise", "throw", "error"], ans: ["raise"], why: "In Python si usa raise; throw è di Java e JavaScript." },
        { t: "mc", q: "Cosa succede con 1 / 0?", opts: ["ZeroDivisionError", "0", "inf"], mono: 1, a: 0, why: "Dividere per zero solleva un’eccezione." },
        { t: "type", q: "Scrivi cosa stampa.", code: `try:
    print(int("12") + 1)
except ValueError:
    print("errore")`, ans: ["13"], why: "\"12\" si converte senza problemi." },
        { t: "info", title: "Perché non catturare tutto", text: "Si può scrivere `except:` senza tipo, ma cattura **qualsiasi** errore, anche quelli che non ti aspetti, come un nome scritto male nel tuo codice. Il programma sembra funzionare ma nasconde i bug.\n\nMeglio indicare sempre il tipo (`except ValueError:`), o al massimo `except Exception as e:` stampando `e` per sapere cosa è successo." },
        { t: "mc", q: "Perché non scrivere solo except: senza tipo?", opts: ["Nasconde anche errori inattesi, rendendo difficile il debug", "È più lento", "Non è valido in Python"], a: 0, why: "Meglio catturare solo le eccezioni previste." }
    ]}
  ]},
  { title: "Settimana 4 · Librerie", lessons: [
    { id: "p4a", title: "Moduli", sub: "random, statistics, sys", ex: [
        { t: "info", title: "Moduli e import", text: "Un **modulo** è un file di codice Python già scritto che puoi usare. La *libreria standard* ne include tanti, già installati con Python.\n\nCon `import modulo` usi le sue funzioni scrivendo `modulo.funzione`. Con `from modulo import funzione` importi solo quella e la usi senza prefisso.", points: ["`random.choice(lista)` sceglie un elemento a caso.", "`random.randint(a, b)` dà un intero a caso tra `a` e `b`, **entrambi compresi**.", "`random.shuffle(lista)` mescola la lista.", "`statistics.mean(lista)` calcola la media."], code: `import random
print(random.choice(["A", "C", "G", "T"]))
print(random.randint(1, 6))

from statistics import mean
print(mean([2, 4, 6]))   # 4`, cpp: "`import` somiglia a `#include`, ma i nomi restano nel loro *namespace*: si scrive `random.randint`, come `std::` in C++." },
        { t: "mc", q: "Cosa restituisce random.randint(1, 6)?", opts: ["Un intero tra 1 e 6 compresi", "Un decimale tra 1 e 6", "Sempre 1"], a: 0, why: "randint include entrambi gli estremi." },
        { t: "fill", q: "Importa solo shuffle.", code: `___ random import shuffle`, bank: ["from", "import", "use"], ans: ["from"], why: "from modulo import nome." },
        { t: "info", title: "Argomenti da riga di comando: sys.argv", text: "Puoi passare informazioni al programma quando lo lanci: `python hello.py David`. Le parole dopo `python` arrivano nella lista `sys.argv`, del modulo `sys`.", points: ["`sys.argv[0]` è il nome del file (`hello.py`).", "`sys.argv[1]` è il primo argomento (`David`), e così via.", "Sono **sempre stringhe**.", "`len(sys.argv)` dice quanti sono: controllalo prima di leggerli, altrimenti rischi un `IndexError`.", "`sys.exit(\"messaggio\")` termina il programma con un messaggio di errore."], code: `import sys

if len(sys.argv) < 2:
    sys.exit("Uso: python hello.py NOME")
print("ciao,", sys.argv[1])`, cpp: "È lo stesso `argv` di `int main(int argc, char* argv[])`; `argc` corrisponde a `len(sys.argv)`." },
        { t: "mc", q: "Dove trovi gli argomenti passati da riga di comando?", opts: ["sys.argv", "os.args", "input.argv"], mono: 1, a: 0, why: "sys.argv è una lista di stringhe." },
        { t: "type", q: "Il programma è lanciato con: python hello.py David. Cosa stampa?", code: `import sys
print(sys.argv[1])`, ans: ["David"], why: "sys.argv[0] è il nome del file, [1] il primo argomento." },
        { t: "mc", q: "Cosa contiene sys.argv[0]?", opts: ["Il nome del programma", "Il primo argomento", "Il numero di argomenti"], a: 0, why: "L’indice 0 è sempre il nome dello script." }
    ]},
    { id: "p4b", title: "Pacchetti", sub: "pip e __main__", ex: [
        { t: "info", title: "Pacchetti e pip", text: "Oltre alla libreria standard esistono centinaia di migliaia di **pacchetti** scritti da altri, raccolti su PyPI (pypi.org). Li installi dal terminale con `pip install nome`, poi li importi nel codice.\n\nIl nome per `pip` e quello per `import` a volte sono diversi: `pip install biopython`, ma poi `from Bio.Seq import Seq`.", code: `# nel terminale (non in Python):
#   pip install biopython

from Bio.Seq import Seq
print(Seq("ATGC").reverse_complement())   # GCAT` },
        { t: "mc", q: "Con quale comando installi un pacchetto?", opts: ["pip install nome", "python get nome", "import --install nome"], mono: 1, a: 0, why: "pip è il gestore di pacchetti di Python." },
        { t: "info", title: "if __name__ == \"__main__\"", text: "Ogni file Python può essere **eseguito** (`python file.py`) oppure **importato** da un altro file (`import file`). Quando è eseguito direttamente, la variabile speciale `__name__` vale `\"__main__\"`; quando è importato, vale il nome del modulo.\n\nCon questo `if` il programma parte solo se lanci il file. Se lo importi, per esempio nei test, ottieni le funzioni senza eseguire `main()`.", code: `def main():
    print(gc("GGCA"))

def gc(seq):
    return (seq.count("G") + seq.count("C")) / len(seq)

if __name__ == "__main__":
    main()` },
        { t: "mc", q: "A cosa serve if __name__ == \"__main__\":?", opts: ["Esegue main() solo se il file è avviato direttamente, non se viene importato", "Rende il file più veloce", "Importa main"], a: 0, why: "Così puoi importare le funzioni del file, ad esempio nei test, senza eseguirlo." },
        { t: "info", title: "JSON: dati strutturati in testo", text: "Molti servizi web (le *API*) rispondono in **JSON**, un formato di testo che rappresenta dizionari e liste. Il modulo `json` lo converte:", points: ["`json.loads(testo)` → da stringa JSON a dati Python (*load string*).", "`json.dumps(dati)` → da dati Python a stringa JSON.", "`json.load(file)` / `json.dump(dati, file)` fanno lo stesso con i file."], code: `import json
testo = '{"gene": "TP53", "esoni": [1, 2, 3]}'
dati = json.loads(testo)
print(dati["gene"], len(dati["esoni"]))   # TP53 3` },
        { t: "fill", q: "Converti un testo JSON in dati Python.", code: `import json
dati = json.___(testo)`, bank: ["loads", "read", "parse"], ans: ["loads"], why: "loads = load string; load legge da un file." },
        { t: "order", q: "Struttura un modulo riutilizzabile.", lines: ["def main():", "    print(gc(\"GGCA\"))", "if __name__ == \"__main__\":", "    main()"], why: "main viene chiamata solo quando il file è eseguito direttamente." }
    ]}
  ]},
  { title: "Settimana 5 · Unit test", lessons: [
    { id: "p5a", title: "assert e pytest", sub: "Verificare il codice", ex: [
        { t: "info", title: "Testare il proprio codice", text: "Un **test** è un pezzo di codice che chiama le tue funzioni e verifica che il risultato sia quello atteso. Così, quando modifichi qualcosa, scopri subito se hai rotto qualcos’altro.\n\nLo strumento base è `assert condizione`: se la condizione è vera non succede niente; se è falsa, Python solleva un `AssertionError`.", code: `def quadrato(n):
    return n * n

assert quadrato(3) == 9      # ok, nessun messaggio
assert quadrato(-2) == 4     # ok
print("tutti i controlli passati")`, note: "Usa `assert` nei test, non per controllare l’input dell’utente: per quello si usano `if` ed eccezioni." },
        { t: "mc", q: "Cosa succede se un assert è falso?", opts: ["Solleva AssertionError", "Stampa False", "Niente"], a: 0, why: "Il test fallisce con un AssertionError." },
        { t: "fill", q: "Verifica il risultato.", code: `___ quadrato(3) == 9`, bank: ["assert", "check", "test"], ans: ["assert"], why: "assert verifica che la condizione sia vera." },
        { t: "info", title: "pytest", text: "`pytest` è un pacchetto (`pip install pytest`) che trova ed esegue i test per te. Le regole:", points: ["I file di test si chiamano `test_qualcosa.py`.", "Le funzioni di test iniziano con `test_`.", "Nel file di test importi le funzioni da provare: `from gc_tools import gc`.", "Lanci tutto con `pytest test_gc.py` (o solo `pytest`).", "Per verificare che venga sollevata un’eccezione: `with pytest.raises(ValueError):`."], code: `# test_gc.py
import pytest
from gc_tools import gc

def test_gc():
    assert gc("GGCC") == 1.0
    assert gc("ATAT") == 0.0

def test_vuota():
    with pytest.raises(ValueError):
        gc("")` },
        { t: "mc", q: "Come riconosce pytest i test?", opts: ["Funzioni il cui nome inizia con test_", "Funzioni con @test", "Qualsiasi funzione"], a: 0, why: "Convenzione: file test_*.py e funzioni test_*." },
        { t: "mc", q: "Come verifichi che venga sollevata un’eccezione?", opts: ["with pytest.raises(ValueError):", "assert raises ValueError", "try pytest:"], mono: 1, a: 0, why: "pytest.raises è un context manager." },
        { t: "order", q: "Testa che gc(\"\") sollevi ValueError.", lines: ["import pytest", "from gc_tools import gc", "def test_vuota():", "    with pytest.raises(ValueError):", "        gc(\"\")"], why: "Prima gli import, poi la funzione di test." }
    ]},
    { id: "p5b", title: "Codice testabile", sub: "return, non print", ex: [
        { t: "info", title: "Codice facile da testare", text: "Una funzione che **restituisce** un valore si testa con un `assert`. Una che **stampa** o chiede `input()` è difficile da controllare automaticamente.\n\nPer questo conviene separare i compiti: `main()` si occupa di input e stampa, le altre funzioni calcolano e restituiscono.", code: `def conta_a(seq):              # facile da testare
    return seq.upper().count("A")

def main():                    # solo input e output
    s = input("Sequenza? ")
    print(conta_a(s))` },
        { t: "mc", q: "Quale funzione è più facile da testare?", opts: ["Una che restituisce il risultato con return", "Una che lo stampa con print", "Sono uguali"], a: 0, why: "Il valore restituito si può confrontare con assert." },
        { t: "info", title: "I casi limite", text: "I bug si nascondono spesso **ai bordi**. Oltre a un esempio “normale”, testa:", points: ["l’input vuoto (`\"\"`, lista vuota);", "il valore minimo e massimo consentito;", "maiuscole e minuscole;", "caratteri inattesi (spazi, simboli)."], code: `def test_conta_a():
    assert conta_a("aAa") == 3
    assert conta_a("") == 0
    assert conta_a("CG") == 0` },
        { t: "mc", q: "Un buon set di test per gc() include…", opts: ["Casi limite come stringa vuota e minuscole", "Un solo esempio", "Nessun caso limite"], a: 0, why: "I bug si nascondono spesso ai bordi." },
        { t: "type", q: "Scrivi cosa stampa.", code: `def f(s):
    return s.upper()

assert f("atg") == "ATG"
print("ok")`, ans: ["ok"], why: "L’assert è vero, quindi il programma continua." },
        { t: "mc", q: "Come avvii i test?", opts: ["pytest test_gc.py", "python -test", "run tests"], mono: 1, a: 0, why: "Da terminale: pytest seguito dal file o dalla cartella." }
    ]}
  ]},
  { title: "Settimana 6 · File I/O", lessons: [
    { id: "p6a", title: "Leggere e scrivere file", sub: "open, with", ex: [
        { t: "info", title: "Aprire un file", text: "`open(nome, modalità)` apre un file e restituisce un oggetto per leggerlo o scriverlo. Le modalità principali:", points: ["`\"r\"` lettura (è il default se non scrivi niente).", "`\"w\"` scrittura: crea il file o lo **sovrascrive** da zero.", "`\"a\"` *append*: aggiunge in fondo senza cancellare."], code: `with open("nomi.txt", "w") as f:
    f.write("Rosalind\\n")

with open("nomi.txt", "a") as f:
    f.write("Ada\\n")`, note: "`write` non va a capo da solo: devi aggiungere tu `\"\\n\"`.", cpp: "Corrisponde a `std::ofstream` / `std::ifstream`. Con `with` il file si chiude da solo, come con un distruttore (RAII)." },
        { t: "mc", q: "Cosa fa la modalità \"w\"?", opts: ["Sovrascrive il file", "Aggiunge in fondo", "Legge soltanto"], a: 0, why: "Per aggiungere senza cancellare si usa \"a\"." },
        { t: "info", title: "with e lettura riga per riga", text: "`with open(...) as f:` apre il file e lo **chiude automaticamente** alla fine del blocco, anche se succede un errore.\n\n`for riga in f:` legge una riga alla volta. Ogni riga **finisce con** `\"\\n\"`, che di solito togli con `rstrip()`. `f.read()` invece legge tutto il file in una stringa.", code: `with open("nomi.txt") as f:
    for riga in f:
        print(riga.rstrip())` },
        { t: "fill", q: "Apri il file.", code: `with ___("dati.txt") as f:
    testo = f.read()`, bank: ["open", "file", "read"], ans: ["open"], why: "open() restituisce un oggetto file." },
        { t: "mc", q: "Perché usare with?", opts: ["Chiude il file automaticamente", "Rende il file più piccolo", "È obbligatorio"], a: 0, why: "Anche in caso di errore il file viene chiuso." },
        { t: "mc", q: "Cosa restituisce \"ATG\\n\".rstrip()?", opts: ["\"ATG\"", "\"ATG\\n\"", "\"\\nATG\""], mono: 1, a: 0, why: "rstrip toglie spazi e a capo a destra." },
        { t: "info", title: "Un esempio pratico: contare le sequenze", text: "In un file **FASTA** ogni sequenza inizia con una riga di intestazione che comincia con `>`. Per contare le sequenze basta contare quelle righe.", code: `with open("geni.fa", "w") as f:
    f.write(">gene1\\nATGC\\n>gene2\\nGGTA\\n")

n = 0
with open("geni.fa") as f:
    for riga in f:
        if riga.startswith(">"):
            n += 1
print(n)   # 2` },
        { t: "order", q: "Conta le sequenze di un FASTA.", lines: ["n = 0", "with open(\"reads.fa\") as f:", "    for riga in f:", "        if riga.startswith(\">\"):", "            n += 1", "print(n)"], why: "Ogni header \">\" corrisponde a una sequenza." }
    ]},
    { id: "p6b", title: "CSV", sub: "csv.DictReader e sorted", ex: [
        { t: "info", title: "File CSV", text: "Un file **CSV** è una tabella in testo: una riga per record, valori separati da virgole. La prima riga di solito contiene i nomi delle colonne. Se i valori sono separati da tab si chiama **TSV**.\n\nIl modulo `csv` li legge correttamente, anche quando un valore contiene una virgola tra virgolette, cosa che `split(\",\")` sbaglierebbe.", points: ["`csv.reader(f)` → ogni riga è una **lista** di stringhe.", "`csv.DictReader(f)` → ogni riga è un **dizionario** con i nomi delle colonne come chiavi.", "Per i TSV: `csv.reader(f, delimiter=\"\\t\")`."], code: `import csv
with open("geni.csv", "w") as f:
    f.write("gene,cromosoma\\nTP53,17\\nMYC,8\\n")

with open("geni.csv") as f:
    for riga in csv.DictReader(f):
        print(riga["gene"], riga["cromosoma"])` },
        { t: "mc", q: "Come restituisce ogni riga DictReader?", opts: ["Come dizionario con i nomi delle colonne", "Come lista di numeri", "Come stringa"], a: 0, why: "Le chiavi vengono dalla prima riga del file." },
        { t: "info", title: "Ordinare: sorted, key e lambda", text: "`sorted(lista)` restituisce una **nuova** lista ordinata; `reverse=True` inverte l’ordine. Con `key=` dici **in base a cosa** ordinare: una funzione che riceve un elemento e restituisce il valore da confrontare.\n\nUna `lambda` è una funzione anonima scritta in una riga: `lambda g: g[\"fc\"]` significa “dato `g`, restituisci `g[\"fc\"]`”.", code: `print(sorted([3, 1, 2]))                 # [1, 2, 3]
geni = [{"nome": "A", "fc": 1.5}, {"nome": "B", "fc": 3.2}]
for g in sorted(geni, key=lambda g: g["fc"], reverse=True):
    print(g["nome"])                      # B poi A`, note: "`lista.sort()` invece ordina la lista **sul posto** e restituisce `None`: non scrivere `x = lista.sort()`." },
        { t: "fill", q: "Ordina dal più grande al più piccolo.", code: `sorted(geni, key=lambda g: g["fc"], ___=True)`, bank: ["reverse", "desc", "invert"], ans: ["reverse"], why: "reverse=True inverte l’ordine." },
        { t: "mc", q: "Cosa restituisce sorted([3, 1, 2])?", opts: ["[1, 2, 3]", "[3, 2, 1]", "None"], mono: 1, a: 0, why: "sorted restituisce una nuova lista ordinata." },
        { t: "type", q: "Scrivi cosa stampa.", code: `campi = "chr1,100,A,G".split(",")
print(len(campi))`, ans: ["4"], why: "Quattro valori separati da virgole." },
        { t: "mc", q: "Per leggere un file TSV con csv.reader, quale delimiter usi?", opts: ["\"\\t\"", "\",\"", "\";\""], mono: 1, a: 0, why: "TSV = valori separati da tabulazioni." }
    ]}
  ]},
  { title: "Settimana 7 · Espressioni regolari", lessons: [
    { id: "p7a", title: "re.search", sub: "Pattern di testo", ex: [
        { t: "info", title: "Cos’è un’espressione regolare", text: "Un’**espressione regolare** (*regex*) è un modello che descrive un insieme di stringhe: “inizia con ATG”, “un indirizzo email”, “solo cifre”. Il modulo `re` le usa per cercare, controllare ed estrarre testo.\n\n`re.search(pattern, testo)` cerca il pattern **in qualsiasi punto** del testo. Restituisce un oggetto *match* se lo trova, altrimenti `None`, quindi si può usare direttamente in un `if`.", code: `import re
seq = "GCTATAAAG"
if re.search(r"TATA", seq):
    print("TATA box trovata")` },
        { t: "info", title: "I simboli principali", text: "Nelle regex alcuni caratteri hanno un significato speciale:", points: ["`.` qualsiasi carattere (tranne l’a capo)", "`*` zero o più ripetizioni del precedente; `+` una o più; `?` zero o una", "`{n}` esattamente n volte; `{n,m}` da n a m volte", "`^` inizio della stringa; `$` fine della stringa", "`\\d` una cifra; `\\w` lettera, cifra o `_`; `\\s` spazio", "`[ACGT]` uno qualsiasi dei caratteri elencati; `[^0-9]` uno qualsiasi **tranne** quelli", "`a|b` una cosa o l’altra; `\\.` un punto vero (il `\\` toglie il significato speciale)"], code: `import re
print(bool(re.search(r"^ATG", "ATGCCC")))   # True: inizia con ATG
print(bool(re.search(r"A+$", "CCAAA")))     # True: finisce con una o più A
email = "malan@harvard.edu"
print(bool(re.search(r"^\\w+@\\w+\\.edu$", email)))   # True` },
        { t: "mc", q: "In una regex, cosa indica ^?", opts: ["L’inizio della stringa", "La fine della stringa", "Qualsiasi carattere"], a: 0, why: "$ indica la fine." },
        { t: "mc", q: "Cosa riconosce A+?", opts: ["Una o più A", "Zero o più A", "Esattamente una A"], mono: 1, a: 0, why: "+ significa “almeno una volta”." },
        { t: "fill", q: "Cerca il motivo nella sequenza.", code: `if re.___(r"TATA", seq):
    print("TATA box")`, bank: ["search", "find", "grep"], ans: ["search"], why: "re.search restituisce un match o None." },
        { t: "info", title: "Perché r\"...\"", text: "Nelle stringhe normali Python interpreta `\\` come inizio di un carattere speciale (`\"\\n\"` è l’a capo). Le regex usano molti `\\` (`\\d`, `\\w`, `\\.`). Con una **stringa raw**, `r\"...\"`, Python lascia i backslash così come sono e li passa intatti a `re`.\n\nRegola semplice: scrivi le regex sempre come `r\"...\"`." },
        { t: "mc", q: "Perché si scrive r\"...\" per le regex?", opts: ["È una stringa raw: Python non interpreta i backslash", "Rende la regex più veloce", "È obbligatorio"], a: 0, why: "Così \\w arriva intatto al motore delle regex." },
        { t: "type", q: "Scrivi cosa stampa.", code: `import re
print(bool(re.search(r"^ATG", "ATGCCC")))`, ans: ["True"], why: "La stringa inizia con ATG." }
    ]},
    { id: "p7b", title: "Gruppi e motivi", sub: "finditer, group, sub", ex: [
        { t: "info", title: "Classi di caratteri", text: "Le parentesi quadre definiscono un **insieme** di caratteri ammessi in quella posizione: `[ACGT]` riconosce **un** carattere tra A, C, G e T. Con `-` indichi un intervallo: `[0-9]`, `[A-Z]`.", code: `import re
print(re.findall(r"[GC]", "ATGCGA"))   # ['G', 'C', 'G']` },
        { t: "mc", q: "Cosa riconosce [ACGT]?", opts: ["Uno qualsiasi tra A, C, G, T", "La stringa \"ACGT\"", "Nessuna base"], mono: 1, a: 0, why: "Le parentesi quadre definiscono un insieme di caratteri." },
        { t: "info", title: "Gruppi: estrarre pezzi", text: "Le parentesi tonde creano un **gruppo**: una parte del pattern che puoi poi estrarre. Dal match, `m.group(1)` restituisce il testo del primo gruppo, `m.group(2)` del secondo, e `m.group()` tutto il match.\n\n`(?:...)` è un gruppo *non catturante*: raggruppa (ad esempio per ripetere) ma non viene salvato.", code: `import re
m = re.search(r"(\\w+)@(\\w+)\\.edu", "malan@harvard.edu")
print(m.group(1))   # malan
print(m.group(2))   # harvard` },
        { t: "fill", q: "Estrai il primo gruppo.", code: `m = re.search(r"(\\w+)@", email)
utente = m.___(1)`, bank: ["group", "get", "match"], ans: ["group"], why: "group(1) restituisce ciò che è tra le prime parentesi." },
        { t: "info", title: "findall, finditer e sub", text: "Oltre a `search`:", points: ["`re.findall(p, s)` restituisce la **lista** di tutti i match (che non si sovrappongono).", "`re.finditer(p, s)` restituisce i match uno alla volta: con `m.start()` sai dove si trovano.", "`re.sub(p, nuovo, s)` sostituisce ogni match con `nuovo`."], code: `import re
seq = "CCGAATTCGGGAATTCA"
print([m.start() for m in re.finditer("GAATTC", seq)])   # [2, 10]
print(re.findall(r"A{2}", "AAAA"))      # ['AA', 'AA']
print(re.sub(r"T", "U", "ATTG"))        # AUUG` },
        { t: "mc", q: "Cosa restituisce re.findall(r\"A{2}\", \"AAAA\")?", opts: ["[\"AA\", \"AA\"]", "[\"AAAA\"]", "[\"A\", \"A\", \"A\", \"A\"]"], mono: 1, a: 0, why: "{2} = esattamente due volte; i match non si sovrappongono." },
        { t: "type", q: "Scrivi cosa stampa.", code: `import re
print(re.sub(r"T", "U", "ATTG"))`, ans: ["AUUG"], why: "re.sub sostituisce ogni match." },
        { t: "info", title: "Avido e non avido", text: "`*` e `+` sono **avidi**: prendono più testo possibile. Aggiungendo `?` (`*?`, `+?`) diventano **non avidi** e si fermano appena possono.\n\nPer un ORF (open reading frame, dal codone di start ATG al primo codone di stop) ti serve proprio il primo stop: `ATG(?:...)*?(?:TAA|TAG|TGA)` prende triplette (`...` = tre caratteri qualsiasi) il meno possibile, fino al primo stop nello stesso frame di lettura.", code: `import re
s = "ATGAAATAGCCCTAA"
print(re.search(r"ATG(?:...)*(?:TAA|TAG|TGA)", s).group())    # avido: fino all'ultimo stop
print(re.search(r"ATG(?:...)*?(?:TAA|TAG|TGA)", s).group())   # non avido: ATGAAATAG` },
        { t: "mc", q: "Quale regex trova un ATG seguito da codoni fino a uno stop?", opts: ["ATG(?:...)*?(?:TAA|TAG|TGA)", "ATG*TAA", "^TAA$"], mono: 1, a: 0, why: "(?:...)*? prende triplette in modo non avido fino al primo stop." }
    ]}
  ]},
  { title: "Settimana 8 · Programmazione a oggetti", lessons: [
    { id: "p8a", title: "Classi", sub: "class, __init__, self", ex: [
        { t: "info", title: "Classi e oggetti", text: "Una **classe** è uno stampo per creare **oggetti** di un tipo nuovo, che hai inventato tu. Ogni oggetto ha i suoi dati (**attributi**) e le funzioni che lavorano su quei dati (**metodi**).\n\n`__init__` è il metodo speciale chiamato quando crei l’oggetto: lì imposti gli attributi. Il primo parametro di ogni metodo è `self`, cioè l’oggetto su cui stai lavorando; quando chiami `s.gc()`, Python passa `s` come `self`.", code: `class Sequenza:
    def __init__(self, nome, seq):
        self.nome = nome
        self.seq = seq.upper()

    def gc(self):
        return (self.seq.count("G") + self.seq.count("C")) / len(self.seq)

s = Sequenza("x", "ggat")   # crea l'oggetto: chiama __init__
print(s.nome, s.gc())       # x 0.5`, cpp: "`self` è come `this`, ma va scritto esplicitamente come primo parametro, e per accedere agli attributi serve sempre `self.`. Non ci sono `public`/`private`: per convenzione un nome che inizia con `_` è “privato”." },
        { t: "mc", q: "Cos’è self?", opts: ["L’oggetto su cui si chiama il metodo", "Una variabile globale", "Il nome della classe"], a: 0, why: "s.gc() passa automaticamente s come self." },
        { t: "fill", q: "Il metodo che inizializza l’oggetto.", code: `class Gene:
    def ___(self, nome):
        self.nome = nome`, bank: ["__init__", "init", "__new__"], ans: ["__init__"], why: "Due trattini bassi prima e dopo." },
        { t: "info", title: "Metodi speciali: __str__", text: "I metodi con doppio trattino basso prima e dopo (*dunder*, da *double underscore*) hanno un significato speciale per Python. `__str__` decide come appare l’oggetto quando lo stampi con `print` o lo converti con `str()`.", code: `class Gene:
    def __init__(self, nome):
        self.nome = nome
    def __str__(self):
        return f"Gene {self.nome}"

print(Gene("TP53"))   # Gene TP53` },
        { t: "mc", q: "A cosa serve __str__?", opts: ["Definisce come appare l’oggetto con print()", "Confronta oggetti", "Cancella l’oggetto"], a: 0, why: "print(obj) chiama obj.__str__()." },
        { t: "type", q: "Scrivi cosa stampa.", code: `class C:
    def __init__(self, n):
        self.n = n

c = C(5)
print(c.n * 2)`, ans: ["10"], why: "c.n vale 5." },
        { t: "order", q: "Scrivi la classe Gene.", lines: ["class Gene:", "    def __init__(self, nome):", "        self.nome = nome", "    def __str__(self):", "        return f\"Gene {self.nome}\""], why: "Prima il costruttore, poi gli altri metodi, tutti indentati nella classe." }
    ]},
    { id: "p8b", title: "Ereditarietà e proprietà", sub: "super, @property", ex: [
        { t: "info", title: "Ereditarietà", text: "Una classe può **ereditare** da un’altra: `class DNA(Sequenza):` significa che `DNA` ha automaticamente tutti gli attributi e i metodi di `Sequenza` (la classe *madre*), e può aggiungerne di nuovi o ridefinirli.\n\n`super()` dà accesso ai metodi della classe madre. Si usa spesso in `__init__` per non riscrivere il codice già presente lì.", code: `class Sequenza:
    def __init__(self, seq):
        self.seq = seq

class RNA(Sequenza):
    def __init__(self, seq):
        super().__init__(seq.replace("T", "U"))

class DNA(Sequenza):
    def trascrivi(self):
        return RNA(self.seq)

print(DNA("ATG").trascrivi().seq)   # AUG` },
        { t: "mc", q: "Cosa significa class DNA(Sequenza)?", opts: ["DNA eredita da Sequenza", "Sequenza eredita da DNA", "Sono la stessa classe"], mono: 0, a: 0, why: "La classe tra parentesi è la madre." },
        { t: "fill", q: "Chiama il costruttore della classe madre.", code: `class RNA(Sequenza):
    def __init__(self, seq):
        ___().__init__(seq)`, bank: ["super", "self", "parent"], ans: ["super"], why: "super() dà accesso ai metodi della classe madre." },
        { t: "info", title: "Decoratori: @classmethod e @property", text: "Un **decoratore** è una riga con `@` sopra un metodo che ne cambia il comportamento.", points: ["`@classmethod`: il metodo riceve la **classe** (`cls`) invece dell’oggetto. Si usa per esempio per creare oggetti in modi alternativi.", "`@property`: permette di leggere un metodo come se fosse un attributo (`g.nome` invece di `g.nome()`). Con un *setter* puoi controllare i valori assegnati e rifiutare quelli non validi.", "`@staticmethod`: un metodo che non riceve né oggetto né classe."], code: `class Gene:
    def __init__(self, nome):
        self.nome = nome          # passa dal setter qui sotto

    @property
    def nome(self):
        return self._nome

    @nome.setter
    def nome(self, valore):
        if not valore:
            raise ValueError("nome vuoto")
        self._nome = valore

    @classmethod
    def da_testo(cls, testo):
        return cls(testo.strip())

g = Gene.da_testo("  TP53 ")
print(g.nome)    # TP53` },
        { t: "mc", q: "Un @classmethod riceve come primo argomento…", opts: ["cls, la classe", "self, l’istanza", "niente"], a: 0, why: "Lavora sulla classe, non su un singolo oggetto." },
        { t: "mc", q: "Cosa fa @property?", opts: ["Fa usare un metodo come attributo, anche per validare", "Rende l’attributo privato per sempre", "Crea una costante"], a: 0, why: "Con un setter puoi rifiutare valori non validi." },
        { t: "info", title: "Ricerca dei metodi", text: "Quando chiami `oggetto.metodo()`, Python cerca il metodo prima nella classe dell’oggetto, poi nella classe madre, e così via. Se la figlia non ridefinisce un metodo, si usa quello della madre.\n\n`pass` in una classe vuota significa: “nessun metodo nuovo, eredita tutto”." },
        { t: "type", q: "Scrivi cosa stampa.", code: `class A:
    def ciao(self):
        return "A"

class B(A):
    pass

print(B().ciao())`, ans: ["A"], why: "B non ridefinisce ciao, quindi usa quello di A." }
    ]}
  ]},
  { title: "Settimana 9 · Et cetera", lessons: [
    { id: "p9a", title: "set, type hint, docstring", sub: "Strumenti utili", ex: [
        { t: "info", title: "Gli insiemi (set)", text: "Un **set** è una collezione **senza duplicati** e senza ordine, tra graffe: `{\"A\", \"C\"}`. Per crearlo da una lista: `set(lista)`. Un set vuoto si scrive `set()`, perché `{}` è un dizionario vuoto.", points: ["`x in s` è velocissimo, anche con milioni di elementi.", "`a | b` unione, `a & b` intersezione, `a - b` differenza (in `a` ma non in `b`)."], code: `basi = set(["A", "A", "C"])
print(len(basi))                 # 2
print({"A", "C"} | {"G"})        # unione (l'ordine di stampa può variare)
print({"p1", "p2"} - {"p2"})     # {'p1'}` },
        { t: "mc", q: "Cosa restituisce set([\"A\", \"A\", \"C\"])?", opts: ["{\"A\", \"C\"}", "[\"A\", \"A\", \"C\"]", "3"], mono: 1, a: 0, why: "Il set elimina i duplicati." },
        { t: "type", q: "Scrivi cosa stampa.", code: `print(len({"A", "T", "A", "G"}))`, ans: ["3"], why: "Le A duplicate contano una volta sola." },
        { t: "info", title: "any e all", text: "`any(sequenza)` è vero se **almeno un** elemento è vero; `all(sequenza)` se **tutti** lo sono. Spesso si usano con un’espressione che produce un valore per ogni elemento.", code: `print(any([False, True]))                        # True
print(all(b in "ACGT" for b in "ATGX"))          # False: X non è una base` },
        { t: "mc", q: "Cosa restituisce any([False, True])?", opts: ["True", "False", "[True]"], mono: 1, a: 0, why: "any è vero se almeno un elemento è vero." },
        { t: "info", title: "Type hint e docstring", text: "I **type hint** indicano che tipo ti aspetti per i parametri e per il valore restituito: `def gc(seq: str) -> float:`. Python **non** li controlla mentre il programma gira, ma strumenti come `mypy` sì, e aiutano chi legge.\n\nUna **docstring** è una stringa tra tripli apici subito sotto `def`: spiega cosa fa la funzione.", code: `def gc(seq: str) -> float:
    """Restituisce la frazione di G e C nella sequenza."""
    return (seq.count("G") + seq.count("C")) / len(seq)

print(gc("GGAT"))` },
        { t: "mc", q: "A cosa servono i type hint come seq: str?", opts: ["Documentano i tipi; strumenti come mypy li controllano", "Python li impone sempre quando il programma gira", "Accelerano il codice"], a: 0, why: "Python non li verifica a runtime." },
        { t: "info", title: "List comprehension", text: "Una **list comprehension** crea una lista in una riga: `[espressione for elemento in sequenza if condizione]`. Il `for` e l’`if` funzionano come in un ciclo normale; l’`if` è facoltativo.", code: `seq = "ACNNGT"
pulita = [b for b in seq if b != "N"]
print(pulita)                       # ['A', 'C', 'G', 'T']
quadrati = [n * n for n in range(5)]
print(quadrati)                     # [0, 1, 4, 9, 16]` },
        { t: "fill", q: "List comprehension che toglie le N.", code: `pulita = [b ___ b in seq if b != "N"]`, bank: ["for", "in", "with"], ans: ["for"], why: "[espressione for elemento in sequenza if condizione]." }
    ]},
    { id: "p9b", title: "Comprehension e unpacking", sub: "Python idiomatico", ex: [
        { t: "info", title: "enumerate e dict comprehension", text: "`enumerate(sequenza)` dà coppie (indice, valore): utile quando ti serve anche la posizione. Con `start=1` parti a contare da 1.\n\nCome per le liste, esiste la **dict comprehension**: `{chiave: valore for x in sequenza}`.", code: `geni = ["TP53", "MYC"]
for i, g in enumerate(geni, start=1):
    print(i, g)

lunghezze = {g: len(g) for g in geni}
print(lunghezze)    # {'TP53': 4, 'MYC': 3}` },
        { t: "type", q: "Scrivi cosa stampa.", code: `print([x for x in range(6) if x % 2 == 0])`, ans: ["[0, 2, 4]"], why: "Solo i pari tra 0 e 5." },
        { t: "mc", q: "Cosa produce enumerate([\"a\", \"b\"])?", opts: ["(0, \"a\"), (1, \"b\")", "\"a\", \"b\"", "0, 1"], mono: 1, a: 0, why: "Coppie (indice, valore)." },
        { t: "info", title: "*args, **kwargs e unpacking", text: "Con `*` davanti a un parametro la funzione accetta **quanti argomenti vuoi**: arrivano in una tupla (una lista che non si può modificare). Con `**` raccogli gli argomenti con nome in un dizionario.\n\nL’*unpacking* permette anche di scambiare due variabili in una riga: `a, b = b, a`. Python calcola prima tutto il lato destro, poi assegna.", code: `def somma(*numeri):
    return sum(numeri)

print(somma(1, 2, 3))     # 6

a, b = 1, 2
a, b = b, a
print(a, b)               # 2 1` },
        { t: "fill", q: "Accetta un numero qualsiasi di argomenti.", code: `def somma(___numeri):
    return sum(numeri)`, bank: ["*", "**", "&"], ans: ["*"], why: "*args raccoglie gli argomenti posizionali in una tupla; ** raccoglie quelli con nome." },
        { t: "mc", q: "Cosa fa a, b = b, a?", opts: ["Scambia i valori", "Errore", "Crea una tupla vuota"], mono: 0, a: 0, why: "Unpacking: il lato destro viene valutato prima." },
        { t: "info", title: "map e filter", text: "`map(funzione, sequenza)` applica la funzione a ogni elemento; `filter(funzione, sequenza)` tiene solo gli elementi per cui la funzione restituisce vero. Restituiscono un *iteratore*: per vedere tutti i valori trasformalo in lista con `list()`.\n\nSpesso una list comprehension fa la stessa cosa in modo più leggibile.", code: `print(list(map(str.upper, ["a", "t"])))          # ['A', 'T']
print(list(filter(lambda n: n % 2 == 0, range(6))))  # [0, 2, 4]` },
        { t: "mc", q: "Cosa restituisce list(map(str.upper, [\"a\", \"t\"]))?", opts: ["[\"A\", \"T\"]", "\"AT\"", "[\"a\", \"t\"]"], mono: 1, a: 0, why: "map applica la funzione a ogni elemento." }
    ]}
  ]}
  ]
});
