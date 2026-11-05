/* Corso: Palestra della logica
   Allena le tecniche che servono per esercizi come "Vanity Plates" di CS50P
   (booleani, flag, return anticipato, controlli carattere per carattere)
   usando problemi diversi, senza riportare la soluzione ufficiale. */
ELICA.addCourse({id:'gym',order:20,name:'Palestra',lang:'python',tag:'Allenamento sulla logica: booleani, flag, return anticipato e controlli carattere per carattere. Sono le tecniche di esercizi come Vanity Plates di CS50P, allenate su problemi diversi.',units:[
 {title:'Vero e falso',lessons:[
  {id:'g1',title:'Booleani e confronti',sub:'True, False, confronti concatenati',ex:[
   {t:'info',title:'Ogni confronto è una domanda',text:'Un confronto risponde True o False. Python permette di concatenare i confronti: 2 <= n <= 6 si legge “n è tra 2 e 6, estremi compresi”.',code:`n = len("CS50")\nprint(n == 4)           # True\nprint(2 <= n <= 6)      # True\nprint(n < 2 or n > 6)   # False`},
   {t:'mc',q:'Quanto vale 2 <= 7 <= 6?',opts:['False','True','Errore'],mono:1,a:0,why:'Equivale a 2 <= 7 and 7 <= 6: la seconda parte è falsa.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print(not (3 == 3))`,ans:['False'],why:'3 == 3 è True, not lo inverte.'},
   {t:'mc',q:'Quale condizione è vera quando la lunghezza n è FUORI dall’intervallo 2–6?',opts:['n < 2 or n > 6','n < 2 and n > 6','2 <= n <= 6'],mono:1,a:0,why:'Un numero non può essere insieme minore di 2 e maggiore di 6: serve or.'},
   {t:'fill',q:'Boccia le stringhe di lunghezza sbagliata.',code:`if ___ (2 <= len(s) <= 6):\n    return False`,bank:['not','!','no'],ans:['not'],why:'In Python la negazione si scrive not; ! esiste solo dentro !=.'},
   {t:'mc',q:'Quanto vale bool("")?',opts:['False','True','Errore'],mono:1,a:0,why:'La stringa vuota è “falsy”: in un if conta come False.'},
   {t:'bug',q:'La funzione deve dire se n è tra 2 e 6 compresi. Quale riga è sbagliata?',lines:['def nel_range(n):','    if n >= 2 and n < 6:','        return True','    return False'],bad:1,why:'n < 6 esclude il 6: serve n <= 6, oppure 2 <= n <= 6.'}
  ]},
  {id:'g2',title:'and, or, not',sub:'Combinare le regole',ex:[
   {t:'info',title:'Tradurre le regole in codice',text:'and = tutte vere, or = almeno una, not = inverte. Per negare una combinazione usa De Morgan: not (A and B) equivale a (not A) or (not B).',code:`s = "CS50"\ninizia_bene = s[0:2].isalpha()\nlunghezza_ok = 2 <= len(s) <= 6\nvalido = inizia_bene and lunghezza_ok`},
   {t:'mc',q:'not (A and B) equivale a…',opts:['not A or not B','not A and not B','A or B'],mono:1,a:0,why:'Legge di De Morgan: basta che una delle due sia falsa.'},
   {t:'mc',q:'Quanto vale True or False and False?',opts:['True','False'],mono:1,a:0,why:'and ha la precedenza su or: True or (False and False) = True. Nel dubbio, metti le parentesi.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`a = True\nb = False\nprint(a and not b)`,ans:['True'],why:'not b è True, e True and True è True.'},
   {t:'fill',q:'Valida se è solo alfanumerica e lunga almeno 2.',code:`return s.isalnum() ___ len(s) >= 2`,bank:['and','or','&'],ans:['and'],why:'Entrambe le regole devono essere vere.'},
   {t:'bug',q:'Deve rifiutare le stringhe vuote o più lunghe di 6. Quale riga è sbagliata?',lines:['def ok(s):','    if s == "" and len(s) > 6:','        return False','    return True'],bad:1,why:'Una stringa non può essere vuota e lunga più di 6 insieme: serve or.'}
  ]}
 ]},
 {title:'Flag e return',lessons:[
  {id:'g3',title:'Variabili flag',sub:'Ricordare qualcosa durante un ciclo',ex:[
   {t:'info',title:'Alzare la bandierina',text:'Un flag è una variabile booleana che “alza la bandierina” quando nel ciclo succede qualcosa. Va inizializzato PRIMA del ciclo.',code:`trovato_numero = False\nfor c in "AB12":\n    if c.isdigit():\n        trovato_numero = True\nprint(trovato_numero)   # True`},
   {t:'mc',q:'Dove va inizializzato un flag?',opts:['Prima del ciclo','Dentro il ciclo','Dopo il ciclo'],a:0,why:'Se lo metti dentro, viene azzerato a ogni giro.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`ha_vocale = False\nfor c in "BCD":\n    if c in "AEIOU":\n        ha_vocale = True\nprint(ha_vocale)`,ans:['False'],why:'Nessuna vocale: il flag resta False.'},
   {t:'bug',q:'Deve dire se la stringa contiene almeno una cifra. Quale riga è sbagliata?',lines:['def ha_cifre(s):','    for c in s:','        trovato = False','        if c.isdigit():','            trovato = True','    return trovato'],bad:2,why:'Il flag si azzera a ogni carattere: con "1A" restituisce False. Va messo prima del for.'},
   {t:'fill',q:'Verifica che siano tutte lettere.',code:`tutte_lettere = ___\nfor c in s:\n    if not c.isalpha():\n        tutte_lettere = False`,bank:['True','False','None'],ans:['True'],why:'Parti da “vero” e lo smentisci appena trovi un controesempio.'},
   {t:'order',q:'Controlla se è tutto maiuscolo.',lines:['tutte_maiuscole = True','for c in s:','    if not c.isupper():','        tutte_maiuscole = False','print(tutte_maiuscole)'],why:'Flag prima, ciclo che lo smentisce, risultato dopo.'},
   {t:'mc',q:'all(c.isupper() for c in s) fa la stessa cosa del flag?',opts:['Sì, all() è vero solo se tutti gli elementi sono veri','No, all() controlla solo il primo','No, all() conta gli elementi'],a:0,why:'all() e any() sono scorciatoie per i flag più comuni.'}
  ]},
  {id:'g4',title:'Return anticipato',sub:'Bocciare subito',ex:[
   {t:'info',title:'Una regola alla volta',text:'In una funzione di validazione controlla una regola alla volta: appena una fallisce, return False. Se arrivi in fondo vuol dire che tutte sono passate: return True.',code:`def password_ok(p):\n    if len(p) < 8:\n        return False\n    if not any(c.isdigit() for c in p):\n        return False\n    if p.lower() == p:\n        return False      # nessuna maiuscola\n    return True`},
   {t:'mc',q:'Dove va return True?',opts:['In fondo, fuori da tutti gli if e i cicli','Dentro il primo if','Dentro il ciclo'],a:0,why:'Solo arrivando in fondo sai che tutte le regole sono passate.'},
   {t:'bug',q:'Deve restituire True solo se TUTTI i caratteri sono cifre. Quale riga è sbagliata?',lines:['def tutte_cifre(s):','    for c in s:','        if not c.isdigit():','            return False','        return True'],bad:4,why:'return True è dentro il ciclo: la funzione esce dopo il primo carattere. Va spostato fuori dal for, al livello di def.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`def f(s):\n    if len(s) < 2:\n        return False\n    if not s.isalpha():\n        return False\n    return True\n\nprint(f("A1"), f("ok"))`,ans:['False True'],why:'"A1" non è fatta di sole lettere; "ok" passa entrambe le regole.'},
   {t:'fill',q:'Boccia se i primi due caratteri non sono lettere.',code:`if not s[0:2].isalpha():\n    ___ False`,bank:['return','print','break'],ans:['return'],why:'return esce subito dalla funzione con il risultato.'},
   {t:'order',q:'Scrivi un validatore con due regole.',lines:['def valido(s):','    if not 3 <= len(s) <= 8:','        return False','    if not s.isalnum():','        return False','    return True'],why:'Una regola per blocco, return True alla fine.'},
   {t:'mc',q:'Perché il return anticipato è comodo?',opts:['Ogni regola è separata e leggibile, senza if annidati','È più veloce da scrivere','Python lo richiede'],a:0,why:'Se una regola cambia, tocchi un solo blocco.'}
  ]}
 ]},
 {title:'Carattere per carattere',lessons:[
  {id:'g5',title:'Metodi utili',sub:'isalpha, isdigit, isalnum, slicing',ex:[
   {t:'info',title:'Gli attrezzi',text:'Questi metodi rispondono True o False sull’intera stringa. Lo slicing prende un pezzo senza mai dare errore.',code:`"AB".isalpha()     # True: solo lettere\n"42".isdigit()     # True: solo cifre\n"AB42".isalnum()   # True: lettere e/o cifre\n"AB 42".isalnum()  # False: lo spazio no\n"CS50"[0:2]        # "CS"`},
   {t:'mc',q:'Quanto vale "CS-50".isalnum()?',opts:['False','True'],mono:1,a:0,why:'Il trattino non è né lettera né cifra.'},
   {t:'mc',q:'Quanto vale "".isalpha()?',opts:['False','True'],mono:1,a:0,why:'Su una stringa vuota questi metodi restituiscono False.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print("50"[0] == "0")`,ans:['False'],why:'"50"[0] è "5".'},
   {t:'mc',q:'Cosa restituisce "A"[0:2]?',opts:['"A"','Errore','""'],mono:1,a:0,why:'Lo slicing oltre la fine si ferma dove finisce la stringa.'},
   {t:'fill',q:'Trova la prima cifra.',code:`for c in s:\n    if c.___():\n        print("prima cifra:", c)\n        break`,bank:['isdigit','isnumber','isint'],ans:['isdigit'],why:'isdigit() è vero per i caratteri da "0" a "9".'},
   {t:'mc',q:'c = "0". Quanto vale c == 0?',opts:['False: "0" è una stringa, 0 un intero','True','Errore'],a:0,why:'Uno dei bug più frequenti: confronta con "0" tra virgolette.'}
  ]},
  {id:'g6',title:'Ricordare lo stato',sub:'Prima lettere, poi numeri',ex:[
   {t:'info',title:'Il ciclo con memoria',text:'Per una regola come “dopo il primo numero non possono esserci lettere”, scorri la stringa ricordando con un flag se hai già visto una cifra.',code:`def lettere_poi_numeri(s):\n    visto_numero = False\n    for c in s:\n        if c.isdigit():\n            visto_numero = True\n        elif visto_numero:\n            return False   # lettera dopo un numero\n    return True\n\nprint(lettere_poi_numeri("ABC12"))  # True\nprint(lettere_poi_numeri("AB1C2"))  # False`},
   {t:'type',q:'Scrivi cosa stampa.',code:`def lettere_poi_numeri(s):\n    visto_numero = False\n    for c in s:\n        if c.isdigit():\n            visto_numero = True\n        elif visto_numero:\n            return False\n    return True\n\nprint(lettere_poi_numeri("12AB"))`,ans:['False'],why:'Dopo "1" e "2" arriva una lettera: bocciata.'},
   {t:'mc',q:'Cosa restituisce lettere_poi_numeri("ABC")?',opts:['True','False'],mono:1,a:0,why:'Nessuna cifra: nessuna regola violata.'},
   {t:'fill',q:'Boccia se la prima cifra è zero.',code:`for c in s:\n    if c.isdigit():\n        if c ___ "0":\n            return False\n        break`,bank:['==','!=','is'],ans:['=='],why:'Controlli solo la prima cifra, poi break esce dal ciclo.'},
   {t:'bug',q:'Deve bocciare le stringhe in cui la prima cifra è zero. Quale riga è sbagliata?',lines:['def prima_cifra_ok(s):','    for c in s:','        if c.isdigit():','            return c != 0','    return True'],bad:3,why:'c è una stringa: va confrontata con "0", non con l’intero 0. Così restituisce sempre True.'},
   {t:'order',q:'Ricostruisci il corpo della funzione lettere_poi_numeri.',lines:['visto_numero = False','for c in s:','    if c.isdigit():','        visto_numero = True','    elif visto_numero:','        return False','return True'],why:'Flag, ciclo con i due casi, return True in fondo.'},
   {t:'mc',q:'Altro metodo: i è la posizione della prima cifra. Quale espressione verifica che da lì in poi ci siano solo cifre?',opts:['s[i:].isdigit()','s[:i].isdigit()','s[i].isdigit()'],mono:1,a:0,why:'s[i:] è tutto ciò che viene dopo, compresa la posizione i.'}
  ]}
 ]},
 {title:'Validatore completo',lessons:[
  {id:'g7',title:'Un validatore da zero',sub:'ID di un campione di laboratorio',ex:[
   {t:'info',title:'Le regole',text:'Un ID campione è valido se: 1) è lungo tra 5 e 10 caratteri; 2) inizia con 3 lettere maiuscole; 3) il quarto carattere è un trattino; 4) dopo il trattino ci sono solo cifre; 5) la prima cifra non è 0. Esempi: "HSR-1024" sì, "HSR-0024" no, "HS-1024" no.',code:`# "HSR-1024"\n#  ^^^ lettere maiuscole\n#     ^ trattino\n#      ^^^^ cifre, la prima non è 0`},
   {t:'info',title:'La soluzione, regola per regola',text:'Un blocco per regola, return False appena qualcosa non va. Il controllo della lunghezza va per primo: così s[3] esiste sempre.',code:`def id_valido(s):\n    if not 5 <= len(s) <= 10:\n        return False\n    if not (s[:3].isalpha() and s[:3].isupper()):\n        return False\n    if s[3] != "-":\n        return False\n    numeri = s[4:]\n    if not numeri.isdigit():\n        return False\n    if numeri[0] == "0":\n        return False\n    return True`},
   {t:'type',q:'Scrivi cosa stampa.',code:`print(id_valido("HSR-0024"))`,ans:['False'],why:'La prima cifra è 0.'},
   {t:'type',q:'Scrivi cosa stampa.',code:`print(id_valido("abc-123"))`,ans:['False'],why:'Le lettere devono essere maiuscole.'},
   {t:'mc',q:'Perché il controllo della lunghezza va per primo?',opts:['Così s[3] e numeri[0] esistono sempre quando li usi','È solo una convenzione','È più veloce'],a:0,why:'Con almeno 5 caratteri, s[3] non dà IndexError e s[4:] non è vuoto.'},
   {t:'fill',q:'Completa la regola sulle lettere.',code:`if not (s[:3].isalpha() ___ s[:3].isupper()):\n    return False`,bank:['and','or','+'],ans:['and'],why:'Devono essere lettere E maiuscole.'},
   {t:'bug',q:'Questa versione semplificata ha una riga con la logica invertita. Quale?',lines:['def id_valido(s):','    if not 5 <= len(s) <= 10:','        return False','    if s[3] != "-":','        return False','    if s[4:].isdigit():','        return False','    return True'],bad:5,why:'Manca il not: così boccia proprio gli ID corretti, quelli con solo cifre dopo il trattino.'},
   {t:'mc',q:'Cosa restituisce id_valido("HSR-12A4")?',opts:['False','True'],mono:1,a:0,why:'"12A4" non è fatta di sole cifre.'}
  ]},
  {id:'g8',title:'Testare il validatore',sub:'pytest e casi limite',ex:[
   {t:'info',title:'Un test per regola',text:'Un validatore si testa sui casi limite: lunghezze al bordo, lettere sbagliate, zero iniziale, simboli strani. Un test per regola ti dice subito quale si è rotta.',code:`from labid import id_valido\n\ndef test_lunghezza():\n    assert id_valido("ABC-1")            # 5: minimo\n    assert not id_valido("ABC-")         # 4: troppo corto\n    assert not id_valido("ABC-1234567")  # 11: troppo lungo\n\ndef test_zero_iniziale():\n    assert not id_valido("ABC-0123")`},
   {t:'mc',q:'Quale coppia di input testa meglio il limite di 10 caratteri?',opts:['"ABC-123456" (10) e "ABC-1234567" (11)','Solo "ABC-12"','"ABCDEFGHIJKLMNOP"'],mono:1,a:0,why:'I bug si nascondono sul bordo: testa l’ultimo valido e il primo non valido.'},
   {t:'mc',q:'Perché scrivere un test per ogni regola?',opts:['Quando un test fallisce sai subito quale regola è rotta','pytest lo impone','Per avere più righe'],a:0,why:'Test piccoli e mirati = errori facili da trovare.'},
   {t:'fill',q:'Verifica che un ID venga bocciato.',code:`assert ___ id_valido("abc-123")`,bank:['not','!','False'],ans:['not'],why:'assert not … passa se la funzione restituisce False.'},
   {t:'type',q:'Con id_valido della lezione precedente, scrivi cosa stampa.',code:`prove = ["ABC-1", "AB-12", "ABC-0"]\nprint([id_valido(p) for p in prove])`,ans:['[True, False, False]'],why:'"AB-12" ha solo due lettere; "ABC-0" inizia con zero.'},
   {t:'mc',q:'Cosa succede se dimentichi from labid import id_valido?',opts:['NameError quando pytest esegue i test','I test passano comunque','pytest lo importa da solo'],a:0,why:'Il nome id_valido non esiste nel file di test.'}
  ]}
 ]}
]});
