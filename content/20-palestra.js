/* Corso: Palestra della logica
   Allena le tecniche che servono per esercizi come "Vanity Plates" di CS50P
   (booleani, flag, return anticipato, controlli carattere per carattere)
   usando problemi diversi, senza riportare la soluzione ufficiale. */
ELICA.addCourse({
  id: "gym",
  order: 20,
  name: "Palestra",
  lang: "python",
  tag: "Allenamento sulla logica: booleani, flag, return anticipato e controlli carattere per carattere. Sono le tecniche di esercizi come Vanity Plates di CS50P, allenate su problemi diversi.",
  units: [
  { title: "Vero e falso", lessons: [
    { id: "g1", title: "Booleani e confronti", sub: "True, False, confronti concatenati", ex: [
        { t: "info", title: "Il tipo bool", text: "In Python i valori di verità sono `True` e `False` (con la maiuscola), di tipo `bool`. Ogni confronto (`==`, `!=`, `<`, `>`, `<=`, `>=`) produce uno di questi due valori, e puoi salvarlo in una variabile come qualsiasi altro valore.", code: `n = len("CS50")       # 4
lunghezza_ok = n >= 2
print(lunghezza_ok)   # True
print(type(lunghezza_ok))   # <class 'bool'>` },
        { t: "info", title: "Confronti concatenati", text: "Python permette di scrivere un intervallo come in matematica: `2 <= n <= 6`. Significa esattamente `2 <= n and n <= 6`: **entrambe** le parti devono essere vere.", code: `n = 7
print(2 <= n <= 6)        # False: 7 <= 6 è falso
print(2 <= n and n <= 6)  # stessa cosa` },
        { t: "info", title: "Domande alle stringhe", text: "Nella Palestra userai spesso alcuni metodi delle stringhe che rispondono `True` o `False` sull’**intera** stringa. Li approfondiamo nella lezione “Metodi utili”, ma eccoli subito:", points: ["`s.isalpha()`: solo lettere?", "`s.isdigit()`: solo cifre?", "`s.isalnum()`: solo lettere e/o cifre (niente spazi né simboli)?", "`s.isupper()`: tutte le lettere maiuscole?"], code: `print("CS".isalpha(), "50".isdigit(), "CS50".isalnum(), "CS50".isupper())   # True True True True
print("CS 50".isalnum())   # False: lo spazio non è né lettera né cifra` },
        { t: "mc", q: "Quanto vale 2 <= 7 <= 6?", opts: ["False", "True", "Errore"], mono: 1, a: 0, why: "Equivale a 2 <= 7 and 7 <= 6: la seconda parte è falsa." },
        { t: "type", q: "Scrivi cosa stampa.", code: `print(not (3 == 3))`, ans: ["False"], why: "3 == 3 è True, not lo inverte." },
        { t: "info", title: "Negare un intervallo", text: "Spesso devi bocciare un valore **fuori** da un intervallo. Hai due modi equivalenti:", points: ["`not (2 <= n <= 6)`: nega l’intervallo intero (servono le parentesi).", "`n < 2 or n > 6`: “troppo piccolo **oppure** troppo grande”."], note: "`n < 2 and n > 6` è sempre falso: nessun numero è insieme minore di 2 e maggiore di 6. È un errore molto comune.", cpp: "`not` sostituisce `!`. In Python `!` esiste solo dentro `!=`." },
        { t: "mc", q: "Quale condizione è vera quando la lunghezza n è FUORI dall’intervallo 2–6?", opts: ["n < 2 or n > 6", "n < 2 and n > 6", "2 <= n <= 6"], mono: 1, a: 0, why: "Un numero non può essere insieme minore di 2 e maggiore di 6: serve or." },
        { t: "fill", q: "Boccia le stringhe di lunghezza sbagliata.", code: `if ___ (2 <= len(s) <= 6):
    return False`, bank: ["not", "!", "no"], ans: ["not"], why: "In Python la negazione si scrive not; ! esiste solo dentro !=." },
        { t: "info", title: "Vero e falso “di fatto” (truthiness)", text: "In un `if` puoi mettere qualsiasi valore, non solo `True`/`False`. Alcuni valori contano come falsi (*falsy*):", points: ["`0` e `0.0`", "la stringa vuota `\"\"`", "la lista vuota `[]`, il dizionario vuoto `{}`", "`None`"], code: `s = ""
if not s:
    print("stringa vuota")
print(bool(""), bool("A"), bool(0), bool(42))   # False True False True` },
        { t: "mc", q: "Quanto vale bool(\"\")?", opts: ["False", "True", "Errore"], mono: 1, a: 0, why: "La stringa vuota è “falsy”: in un if conta come False." },
        { t: "bug", q: "La funzione deve dire se n è tra 2 e 6 compresi. Quale riga è sbagliata?", lines: ["def nel_range(n):", "    if n >= 2 and n < 6:", "        return True", "    return False"], bad: 1, why: "n < 6 esclude il 6: serve n <= 6, oppure 2 <= n <= 6." }
    ]},
    { id: "g2", title: "and, or, not", sub: "Combinare le regole", ex: [
        { t: "info", title: "Tradurre le regole a parole", text: "Una regola scritta in italiano si traduce quasi parola per parola: “valido se inizia con lettere **e** la lunghezza va bene” diventa `inizia_bene and lunghezza_ok`.\n\nTrucco utile: dai un **nome** a ogni condizione con una variabile. Il codice diventa leggibile come la regola.", code: `s = "CS50"
inizia_bene = s[0:2].isalpha()
lunghezza_ok = 2 <= len(s) <= 6
valido = inizia_bene and lunghezza_ok
print(valido)   # True` },
        { t: "info", title: "La legge di De Morgan", text: "Per **negare** una combinazione di condizioni, nega ognuna e scambia `and` con `or`:", points: ["`not (A and B)` equivale a `(not A) or (not B)`", "`not (A or B)` equivale a `(not A) and (not B)`"], code: `A, B = True, False
print(not (A and B), (not A) or (not B))   # True True` },
        { t: "mc", q: "not (A and B) equivale a…", opts: ["not A or not B", "not A and not B", "A or B"], mono: 1, a: 0, why: "Legge di De Morgan: basta che una delle due sia falsa." },
        { t: "info", title: "Chi viene prima: la precedenza", text: "Senza parentesi, Python valuta prima `not`, poi `and`, poi `or`. Quindi `True or False and False` si legge `True or (False and False)`, cioè `True`.\n\nNel dubbio **metti le parentesi**: non costano niente e rendono chiaro cosa intendi." },
        { t: "mc", q: "Quanto vale True or False and False?", opts: ["True", "False"], mono: 1, a: 0, why: "and ha la precedenza su or: True or (False and False) = True. Nel dubbio, metti le parentesi." },
        { t: "type", q: "Scrivi cosa stampa.", code: `a = True
b = False
print(a and not b)`, ans: ["True"], why: "not b è True, e True and True è True." },
        { t: "fill", q: "Valida se è solo alfanumerica e lunga almeno 2.", code: `return s.isalnum() ___ len(s) >= 2`, bank: ["and", "or", "&"], ans: ["and"], why: "Entrambe le regole devono essere vere." },
        { t: "bug", q: "Deve rifiutare le stringhe vuote o più lunghe di 6. Quale riga è sbagliata?", lines: ["def ok(s):", "    if s == \"\" and len(s) > 6:", "        return False", "    return True"], bad: 1, why: "Una stringa non può essere vuota e lunga più di 6 insieme: serve or." }
    ]}
  ]},
  { title: "Flag e return", lessons: [
    { id: "g3", title: "Variabili flag", sub: "Ricordare qualcosa durante un ciclo", ex: [
        { t: "info", title: "Il flag: una bandierina", text: "Un **flag** è una variabile booleana che usi per **ricordare** se durante un ciclo è successo qualcosa. Lo schema è sempre lo stesso:", points: ["**prima** del ciclo: imposti il flag a un valore iniziale;", "**dentro** il ciclo: lo cambi quando succede l’evento;", "**dopo** il ciclo: leggi il flag per sapere com’è andata."], code: `trovato_numero = False          # 1) prima del ciclo
for c in "AB12":
    if c.isdigit():
        trovato_numero = True   # 2) alzo la bandierina
print(trovato_numero)           # 3) dopo: True` },
        { t: "mc", q: "Dove va inizializzato un flag?", opts: ["Prima del ciclo", "Dentro il ciclo", "Dopo il ciclo"], a: 0, why: "Se lo metti dentro, viene azzerato a ogni giro." },
        { t: "type", q: "Scrivi cosa stampa.", code: `ha_vocale = False
for c in "BCD":
    if c in "AEIOU":
        ha_vocale = True
print(ha_vocale)`, ans: ["False"], why: "Nessuna vocale: il flag resta False." },
        { t: "info", title: "Errori tipici con i flag", text: "Due errori capitano spesso:", points: ["**Flag dentro il ciclo:** viene rimesso al valore iniziale a ogni giro, e alla fine ricorda solo l’ultimo carattere.", "**Flag mai inizializzato:** se il ciclo non parte (stringa vuota), la variabile non esiste e Python dà errore quando la leggi."], note: "Quando qualcosa “ricorda solo l’ultimo elemento”, controlla dove hai inizializzato le variabili." },
        { t: "bug", q: "Deve dire se la stringa contiene almeno una cifra. Quale riga è sbagliata?", lines: ["def ha_cifre(s):", "    for c in s:", "        trovato = False", "        if c.isdigit():", "            trovato = True", "    return trovato"], bad: 2, why: "Il flag si azzera a ogni carattere: con \"1A\" restituisce False. Va messo prima del for." },
        { t: "info", title: "Partire da vero o da falso?", text: "Dipende dalla domanda:", points: ["“C’è **almeno un**…?” → parti da `False` e metti `True` quando lo trovi.", "“Sono **tutti**…?” → parti da `True` e metti `False` al primo controesempio."], code: `tutte_lettere = True
for c in "ABC1":
    if not c.isalpha():
        tutte_lettere = False
print(tutte_lettere)   # False` },
        { t: "fill", q: "Verifica che siano tutte lettere.", code: `tutte_lettere = ___
for c in s:
    if not c.isalpha():
        tutte_lettere = False`, bank: ["True", "False", "None"], ans: ["True"], why: "Parti da “vero” e lo smentisci appena trovi un controesempio." },
        { t: "order", q: "Controlla se è tutto maiuscolo.", lines: ["tutte_maiuscole = True", "for c in s:", "    if not c.isupper():", "        tutte_maiuscole = False", "print(tutte_maiuscole)"], why: "Flag prima, ciclo che lo smentisce, risultato dopo." },
        { t: "info", title: "Scorciatoie: any() e all()", text: "Questi due schemi sono così comuni che Python ha due funzioni già pronte: `any(…)` per “almeno uno” e `all(…)` per “tutti”.", code: `s = "AB12"
print(any(c.isdigit() for c in s))   # True: c'è almeno una cifra
print(all(c.isupper() for c in s))   # False: le cifre non sono maiuscole` },
        { t: "mc", q: "all(c.isupper() for c in s) fa la stessa cosa del flag?", opts: ["Sì, all() è vero solo se tutti gli elementi sono veri", "No, all() controlla solo il primo", "No, all() conta gli elementi"], a: 0, why: "all() e any() sono scorciatoie per i flag più comuni." }
    ]},
    { id: "g4", title: "Return anticipato", sub: "Bocciare subito", ex: [
        { t: "info", title: "Bocciare subito (return anticipato)", text: "Quando una funzione deve controllare tante regole, il modo più chiaro è controllarne **una alla volta** e, appena una non va, uscire subito con `return False`. Queste righe si chiamano *guard clause* (clausole di guardia).\n\nSe il codice arriva in fondo, vuol dire che **nessuna** regola ha bocciato l’input: lì metti `return True`.", code: `def password_ok(p):
    if len(p) < 8:
        return False
    if not any(c.isdigit() for c in p):
        return False
    if p.lower() == p:
        return False      # nessuna maiuscola
    return True

print(password_ok("abc"), password_ok("Biologia2026"))   # False True` },
        { t: "mc", q: "Dove va return True?", opts: ["In fondo, fuori da tutti gli if e i cicli", "Dentro il primo if", "Dentro il ciclo"], a: 0, why: "Solo arrivando in fondo sai che tutte le regole sono passate." },
        { t: "info", title: "return dentro un ciclo", text: "`return` esce **dall’intera funzione**, non solo dal ciclo. Per questo:", points: ["`return False` dentro il ciclo va bene: basta un carattere sbagliato per bocciare.", "`return True` dentro il ciclo è quasi sempre un bug: la funzione esce dopo il primo carattere, senza guardare gli altri.", "`return True` va **dopo** il ciclo, allineato con il `for`, non dentro."], note: "Controlla l’indentazione: una riga spostata di 4 spazi cambia il significato del programma." },
        { t: "bug", q: "Deve restituire True solo se TUTTI i caratteri sono cifre. Quale riga è sbagliata?", lines: ["def tutte_cifre(s):", "    for c in s:", "        if not c.isdigit():", "            return False", "        return True"], bad: 4, why: "return True è dentro il ciclo: la funzione esce dopo il primo carattere. Va spostato fuori dal for, al livello di def." },
        { t: "type", q: "Scrivi cosa stampa.", code: `def f(s):
    if len(s) < 2:
        return False
    if not s.isalpha():
        return False
    return True

print(f("A1"), f("ok"))`, ans: ["False True"], why: "\"A1\" non è fatta di sole lettere; \"ok\" passa entrambe le regole." },
        { t: "fill", q: "Boccia se i primi due caratteri non sono lettere.", code: `if not s[0:2].isalpha():
    ___ False`, bank: ["return", "print", "break"], ans: ["return"], why: "return esce subito dalla funzione con il risultato." },
        { t: "order", q: "Scrivi un validatore con due regole.", lines: ["def valido(s):", "    if not 3 <= len(s) <= 8:", "        return False", "    if not s.isalnum():", "        return False", "    return True"], why: "Una regola per blocco, return True alla fine." },
        { t: "info", title: "Perché questo stile funziona", text: "Ogni regola è un blocco separato: si legge dall’alto in basso come l’elenco delle regole. Se una regola cambia, modifichi solo il suo blocco, e non ci sono `if` annidati uno dentro l’altro." },
        { t: "mc", q: "Perché il return anticipato è comodo?", opts: ["Ogni regola è separata e leggibile, senza if annidati", "È più veloce da scrivere", "Python lo richiede"], a: 0, why: "Se una regola cambia, tocchi un solo blocco." }
    ]}
  ]},
  { title: "Carattere per carattere", lessons: [
    { id: "g5", title: "Metodi utili", sub: "isalpha, isdigit, isalnum, slicing", ex: [
        { t: "info", title: "I metodi “is…”", text: "Le stringhe hanno metodi che rispondono `True` o `False` **sull’intera stringa**:", points: ["`isalpha()`: solo lettere.", "`isdigit()`: solo cifre da 0 a 9.", "`isalnum()`: solo lettere e/o cifre (niente spazi, trattini, punti).", "`isupper()` / `islower()`: tutte le lettere maiuscole / minuscole.", "Su una stringa **vuota** restituiscono tutti `False`."], code: `print("AB".isalpha(), "42".isdigit(), "AB42".isalnum())   # True True True
print("AB 42".isalnum(), "CS-50".isalnum())                # False False
print("".isalpha())                                         # False` },
        { t: "mc", q: "Quanto vale \"CS-50\".isalnum()?", opts: ["False", "True"], mono: 1, a: 0, why: "Il trattino non è né lettera né cifra." },
        { t: "mc", q: "Quanto vale \"\".isalpha()?", opts: ["False", "True"], mono: 1, a: 0, why: "Su una stringa vuota questi metodi restituiscono False." },
        { t: "info", title: "Indici e slicing", text: "`s[i]` prende un carattere; `s[a:b]` prende un pezzo dalla posizione `a` (inclusa) alla `b` (esclusa).\n\nDifferenza importante: un indice fuori dalla stringa (`s[10]`) causa `IndexError`, mentre lo **slicing non dà mai errore**: si ferma dove finisce la stringa.", code: `s = "CS50"
print(s[0], s[0:2], s[2:])   # C CS 50
print("A"[0:2])              # A (nessun errore)` },
        { t: "type", q: "Scrivi cosa stampa.", code: `print("50"[0] == "0")`, ans: ["False"], why: "\"50\"[0] è \"5\"." },
        { t: "mc", q: "Cosa restituisce \"A\"[0:2]?", opts: ["\"A\"", "Errore", "\"\""], mono: 1, a: 0, why: "Lo slicing oltre la fine si ferma dove finisce la stringa." },
        { t: "info", title: "Caratteri e numeri non sono la stessa cosa", text: "Quando scorri una stringa, ogni elemento è un **carattere**, cioè una stringa lunga 1, anche se rappresenta una cifra. `\"0\"` (stringa) e `0` (intero) sono valori diversi: `\"0\" == 0` è `False`.\n\nPer confrontare una cifra usa le virgolette: `c == \"0\"`. Oppure convertila prima: `int(c) == 0`.", code: `c = "0"
print(c == 0)     # False
print(c == "0")   # True
print(int(c) == 0)  # True` },
        { t: "fill", q: "Trova la prima cifra.", code: `for c in s:
    if c.___():
        print("prima cifra:", c)
        break`, bank: ["isdigit", "isnumber", "isint"], ans: ["isdigit"], why: "isdigit() è vero per i caratteri da \"0\" a \"9\"." },
        { t: "mc", q: "c = \"0\". Quanto vale c == 0?", opts: ["False: \"0\" è una stringa, 0 un intero", "True", "Errore"], a: 0, why: "Uno dei bug più frequenti: confronta con \"0\" tra virgolette." }
    ]},
    { id: "g6", title: "Ricordare lo stato", sub: "Prima lettere, poi numeri", ex: [
        { t: "info", title: "Ricordare lo stato", text: "Alcune regole dipendono da **cosa è venuto prima**. Per esempio: “dopo il primo numero non possono più comparire lettere”. Guardando un carattere da solo non puoi deciderlo: devi ricordare se hai già visto una cifra. Ti serve un flag.", code: `def lettere_poi_numeri(s):
    visto_numero = False
    for c in s:
        if c.isdigit():
            visto_numero = True
        elif visto_numero:
            return False   # lettera dopo un numero
    return True

print(lettere_poi_numeri("ABC12"))  # True
print(lettere_poi_numeri("AB1C2"))  # False` },
        { t: "info", title: "Seguire il codice a mano", text: "Il modo migliore per capire (e correggere) un ciclo così è eseguirlo **a mano**, scrivendo il valore delle variabili a ogni giro. Con `\"AB1C2\"`:", points: ["`A`: non è cifra; `visto_numero` è False → continua", "`B`: come sopra → continua", "`1`: è cifra → `visto_numero = True`", "`C`: non è cifra e `visto_numero` è True → `return False`"], note: "Fallo con carta e penna quando un esercizio non ti torna: è la tecnica di debug più potente che esista." },
        { t: "type", q: "Scrivi cosa stampa.", code: `def lettere_poi_numeri(s):
    visto_numero = False
    for c in s:
        if c.isdigit():
            visto_numero = True
        elif visto_numero:
            return False
    return True

print(lettere_poi_numeri("12AB"))`, ans: ["False"], why: "Dopo \"1\" e \"2\" arriva una lettera: bocciata." },
        { t: "mc", q: "Cosa restituisce lettere_poi_numeri(\"ABC\")?", opts: ["True", "False"], mono: 1, a: 0, why: "Nessuna cifra: nessuna regola violata." },
        { t: "info", title: "Controllare solo la prima cifra", text: "Per una regola come “la prima cifra non può essere 0”: scorri finché trovi la prima cifra, controllala, poi esci dal ciclo con `break`, perché le cifre successive non ti interessano.", code: `def prima_cifra_ok(s):
    for c in s:
        if c.isdigit():
            if c == "0":
                return False
            break
    return True

print(prima_cifra_ok("AB05"), prima_cifra_ok("AB50"))   # False True` },
        { t: "fill", q: "Boccia se la prima cifra è zero.", code: `for c in s:
    if c.isdigit():
        if c ___ "0":
            return False
        break`, bank: ["==", "!=", "is"], ans: ["=="], why: "Controlli solo la prima cifra, poi break esce dal ciclo." },
        { t: "bug", q: "Deve bocciare le stringhe in cui la prima cifra è zero. Quale riga è sbagliata?", lines: ["def prima_cifra_ok(s):", "    for c in s:", "        if c.isdigit():", "            return c != 0", "    return True"], bad: 3, why: "c è una stringa: va confrontata con \"0\", non con l’intero 0. Così restituisce sempre True." },
        { t: "order", q: "Ricostruisci il corpo della funzione lettere_poi_numeri.", lines: ["visto_numero = False", "for c in s:", "    if c.isdigit():", "        visto_numero = True", "    elif visto_numero:", "        return False", "return True"], why: "Flag, ciclo con i due casi, return True in fondo." },
        { t: "info", title: "Un’alternativa con gli indici", text: "Invece del flag puoi trovare la **posizione** della prima cifra e controllare il pezzo che segue con lo slicing: `s[i:]` è tutto da `i` in poi. Se è fatto solo di cifre, i numeri sono tutti in fondo.", code: `s = "ABC123"
for i, c in enumerate(s):
    if c.isdigit():
        print(s[i:], s[i:].isdigit())   # 123 True
        break` },
        { t: "mc", q: "Altro metodo: i è la posizione della prima cifra. Quale espressione verifica che da lì in poi ci siano solo cifre?", opts: ["s[i:].isdigit()", "s[:i].isdigit()", "s[i].isdigit()"], mono: 1, a: 0, why: "s[i:] è tutto ciò che viene dopo, compresa la posizione i." }
    ]}
  ]},
  { title: "Validatore completo", lessons: [
    { id: "g7", title: "Un validatore da zero", sub: "ID di un campione di laboratorio", ex: [
        { t: "info", title: "Come affrontare un problema di validazione", text: "Prima di scrivere codice:", points: ["**elenca** le regole una per una, in italiano;", "per ogni regola chiediti quale metodo o confronto la controlla;", "metti **per prime** le regole che garantiscono che gli indici esistano (di solito la lunghezza);", "scrivi un blocco `if … return False` per regola e `return True` alla fine;", "prova a mano con esempi validi e non validi."] },
        { t: "info", title: "Le regole del nostro esempio", text: "Un ID di campione di laboratorio è valido se: 1) è lungo tra 5 e 10 caratteri; 2) inizia con 3 lettere maiuscole; 3) il quarto carattere è un trattino; 4) dopo il trattino ci sono solo cifre; 5) la prima cifra non è 0.\n\nEsempi: `\"HSR-1024\"` valido, `\"HSR-0024\"` no (zero iniziale), `\"HS-1024\"` no (solo due lettere).", code: `# "HSR-1024"
#  ^^^ lettere maiuscole
#     ^ trattino
#      ^^^^ cifre, la prima non è 0` },
        { t: "info", title: "La soluzione, regola per regola", text: "Un blocco per regola, `return False` appena qualcosa non va. Il controllo della lunghezza va per primo: con almeno 5 caratteri, `s[3]` esiste sempre e `s[4:]` non è mai vuoto.", code: `def id_valido(s):
    if not 5 <= len(s) <= 10:
        return False
    if not (s[:3].isalpha() and s[:3].isupper()):
        return False
    if s[3] != "-":
        return False
    numeri = s[4:]
    if not numeri.isdigit():
        return False
    if numeri[0] == "0":
        return False
    return True

for prova in ["HSR-1024", "HSR-0024", "HS-1024"]:
    print(prova, id_valido(prova))` },
        { t: "type", q: "Scrivi cosa stampa.", code: `print(id_valido("HSR-0024"))`, ans: ["False"], why: "La prima cifra è 0." },
        { t: "type", q: "Scrivi cosa stampa.", code: `print(id_valido("abc-123"))`, ans: ["False"], why: "Le lettere devono essere maiuscole." },
        { t: "mc", q: "Perché il controllo della lunghezza va per primo?", opts: ["Così s[3] e numeri[0] esistono sempre quando li usi", "È solo una convenzione", "È più veloce"], a: 0, why: "Con almeno 5 caratteri, s[3] non dà IndexError e s[4:] non è vuoto." },
        { t: "fill", q: "Completa la regola sulle lettere.", code: `if not (s[:3].isalpha() ___ s[:3].isupper()):
    return False`, bank: ["and", "or", "+"], ans: ["and"], why: "Devono essere lettere E maiuscole." },
        { t: "bug", q: "Questa versione semplificata ha una riga con la logica invertita. Quale?", lines: ["def id_valido(s):", "    if not 5 <= len(s) <= 10:", "        return False", "    if s[3] != \"-\":", "        return False", "    if s[4:].isdigit():", "        return False", "    return True"], bad: 5, why: "Manca il not: così boccia proprio gli ID corretti, quelli con solo cifre dopo il trattino." },
        { t: "mc", q: "Cosa restituisce id_valido(\"HSR-12A4\")?", opts: ["False", "True"], mono: 1, a: 0, why: "\"12A4\" non è fatta di sole cifre." }
    ]},
    { id: "g8", title: "Testare il validatore", sub: "pytest e casi limite", ex: [
        { t: "info", title: "Un test per regola", text: "Per un validatore scrivi una funzione di test per **ogni regola**. Se un test fallisce, il nome ti dice subito quale regola si è rotta.\n\nPer ogni regola prova un caso che la rispetta e uno che la viola. Testa sempre il **bordo**: l’ultimo valore valido e il primo non valido.", code: `from labid import id_valido

def test_lunghezza():
    assert id_valido("ABC-1")            # 5: minimo valido
    assert not id_valido("ABC-")         # 4: troppo corto
    assert not id_valido("ABC-1234567")  # 11: troppo lungo

def test_zero_iniziale():
    assert not id_valido("ABC-0123")` },
        { t: "mc", q: "Quale coppia di input testa meglio il limite di 10 caratteri?", opts: ["\"ABC-123456\" (10) e \"ABC-1234567\" (11)", "Solo \"ABC-12\"", "\"ABCDEFGHIJKLMNOP\""], mono: 1, a: 0, why: "I bug si nascondono sul bordo: testa l’ultimo valido e il primo non valido." },
        { t: "mc", q: "Perché scrivere un test per ogni regola?", opts: ["Quando un test fallisce sai subito quale regola è rotta", "pytest lo impone", "Per avere più righe"], a: 0, why: "Test piccoli e mirati = errori facili da trovare." },
        { t: "info", title: "assert e assert not", text: "`assert x` passa se `x` è vero. Per verificare che una funzione **bocci** un input, scrivi `assert not funzione(input)`: passa se la funzione restituisce `False`.\n\nIl file di test deve **importare** la funzione da provare (`from labid import id_valido`), altrimenti Python non sa cosa sia `id_valido`." },
        { t: "fill", q: "Verifica che un ID venga bocciato.", code: `assert ___ id_valido("abc-123")`, bank: ["not", "!", "False"], ans: ["not"], why: "assert not … passa se la funzione restituisce False." },
        { t: "type", q: "Con id_valido della lezione precedente, scrivi cosa stampa.", code: `prove = ["ABC-1", "AB-12", "ABC-0"]
print([id_valido(p) for p in prove])`, ans: ["[True, False, False]"], why: "\"AB-12\" ha solo due lettere; \"ABC-0\" inizia con zero." },
        { t: "mc", q: "Cosa succede se dimentichi from labid import id_valido?", opts: ["NameError quando pytest esegue i test", "I test passano comunque", "pytest lo importa da solo"], a: 0, why: "Il nome id_valido non esiste nel file di test." }
    ]}
  ]}
  ]
});
