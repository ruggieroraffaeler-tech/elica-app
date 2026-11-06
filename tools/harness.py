# Elica — esecuzione e correzione del codice (gira dentro Pyodide, in un Web Worker).
# Riceve una richiesta JSON e restituisce un risultato JSON. Niente backtick in questo file.
import json, sys, io, os, builtins, traceback, contextlib, math, types, importlib

_USER_FILE = "tuo_codice.py"
sys.dont_write_bytecode = True  # i moduli riscritti (es. le versioni con difetto) vanno sempre riletti
_RUN = [0]


class _InputFinito(Exception):
    pass


def _fresh_dir(files):
    _RUN[0] += 1
    d = "/tmp/elica_%d" % _RUN[0]
    os.makedirs(d, exist_ok=True)
    os.chdir(d)
    if d not in sys.path:
        sys.path.insert(0, d)
    for name, content in (files or {}).items():
        with open(name, "w") as f:
            f.write(content)
    return d


def _err_info(e, code):
    info = {"type": type(e).__name__, "msg": str(e), "line": None, "text": None}
    if isinstance(e, SyntaxError):
        info["line"] = e.lineno
        info["msg"] = e.msg
    else:
        for fr in traceback.extract_tb(e.__traceback__):
            if fr.filename == _USER_FILE:
                info["line"] = fr.lineno
    if info["line"]:
        righe = code.split("\n")
        if 0 < info["line"] <= len(righe):
            info["text"] = righe[info["line"] - 1].strip()
    return info


def _pytest_shim():
    # versione minima di pytest.raises, se pytest non e' disponibile
    try:
        import pytest  # noqa: F401
        return
    except Exception:
        pass
    mod = types.ModuleType("pytest")

    class _Raises:
        def __init__(self, exc):
            self.exc = exc

        def __enter__(self):
            return self

        def __exit__(self, t, v, tb):
            if t is None:
                raise AssertionError("era attesa l'eccezione " + self.exc.__name__ + ", ma non e' stata sollevata")
            return issubclass(t, self.exc)

    mod.raises = lambda exc: _Raises(exc)
    sys.modules["pytest"] = mod


def _exec_program(code, stdin=None, argv=None):
    # esegue un programma intero: input() legge da stdin, print va in out
    righe = list(stdin or [])
    out = io.StringIO()
    vecchio_input, vecchio_argv = builtins.input, sys.argv

    def finto_input(prompt=""):
        if not righe:
            raise _InputFinito()
        return righe.pop(0)

    builtins.input = finto_input
    sys.argv = list(argv or [_USER_FILE])
    res = {"stdout": "", "error": None, "exit": None, "input_finito": False}
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            g = {"__name__": "__main__", "__file__": _USER_FILE}
            exec(compile(code, _USER_FILE, "exec"), g)
    except _InputFinito:
        res["input_finito"] = True
    except SystemExit as e:
        if isinstance(e.code, str):
            out.write(e.code + "\n")
            res["exit"] = e.code
        elif e.code not in (None, 0):
            res["exit"] = str(e.code)
    except BaseException as e:
        res["error"] = _err_info(e, code)
    finally:
        builtins.input, sys.argv = vecchio_input, vecchio_argv
    res["stdout"] = out.getvalue()
    return res


def _norm_out(s):
    righe = [r.rstrip() for r in str(s).replace("\r\n", "\n").split("\n")]
    while righe and not righe[-1]:
        righe.pop()
    while righe and not righe[0]:
        righe.pop(0)
    return "\n".join(righe)


def _uguali(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-6)
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)) and type(a) is type(b):
        return len(a) == len(b) and all(_uguali(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_uguali(a[k], b[k]) for k in a)
    return a == b


def _tipo(x):
    return {"str": "testo (str)", "int": "numero intero (int)", "float": "numero decimale (float)",
            "bool": "booleano (bool)", "list": "lista", "dict": "dizionario", "NoneType": "None (niente)",
            "set": "insieme (set)", "tuple": "tupla"}.get(type(x).__name__, type(x).__name__)


def _check_func(req):
    code = req["code"]
    _fresh_dir(req.get("files"))
    out = io.StringIO()
    g = {"__name__": "elica_test", "__file__": _USER_FILE}
    vecchio_input = builtins.input

    def no_input(prompt=""):
        raise RuntimeError("in questa sfida non serve input(): la funzione riceve i dati come parametri")

    builtins.input = no_input
    try:
        with contextlib.redirect_stdout(out):
            exec(compile(code, _USER_FILE, "exec"), g)
    except BaseException as e:
        builtins.input = vecchio_input
        return {"load_error": _err_info(e, code), "stdout": out.getvalue()}
    nome = req.get("func")
    if nome and not callable(g.get(nome)):
        builtins.input = vecchio_input
        return {"missing": nome}
    risultati = []
    for t in req["tests"]:
        d = t.get("desc") or ""
        r = {"desc": d if d.startswith(t["call"]) else t["call"] + (" — " + d if d else ""), "call": t["call"], "pass": False}
        if "raises" in t:
            r["expect"] = "un errore " + t["raises"]
        else:
            r["expect"] = repr(eval(t["expect"], {}))
        buf = io.StringIO()
        try:
            for nome_f, contenuto in (t.get("files") or {}).items():
                with open(nome_f, "w") as f:
                    f.write(contenuto)
            with contextlib.redirect_stdout(buf):
                got = eval(t["call"], g)
            r["printed"] = buf.getvalue()
            if "raises" in t:
                r["got"] = repr(got)
                r["expect"] = "un errore " + t["raises"]
                r["pass"] = False
                r["no_raise"] = True
            else:
                exp = eval(t["expect"], {})
                r["got"] = repr(got)
                r["expect"] = repr(exp)
                r["got_type"] = _tipo(got)
                r["expect_type"] = _tipo(exp)
                r["got_none"] = got is None
                r["pass"] = _uguali(got, exp)
        except BaseException as e:
            r["printed"] = buf.getvalue()
            if "raises" in t and type(e).__name__ == t["raises"]:
                r["pass"] = True
                r["got"] = "errore " + type(e).__name__
                r["expect"] = "un errore " + t["raises"]
            else:
                r["error"] = _err_info(e, code)
                if "raises" in t:
                    r["expect"] = "un errore " + t["raises"]
        risultati.append(r)
    builtins.input = vecchio_input
    return {"tests": risultati, "stdout": out.getvalue()}


def _check_io(req):
    code = req["code"]
    risultati = []
    for t in req["tests"]:
        _fresh_dir(dict(req.get("files") or {}, **(t.get("files") or {})))
        res = _exec_program(code, t.get("stdin"), t.get("argv"))
        if t.get("argv"):
            base = "python " + " ".join(t["argv"])
        elif t.get("stdin"):
            base = "input: " + " → ".join(t["stdin"])
        else:
            base = "esecuzione"
        r = {"desc": base + (" — " + t["desc"] if t.get("desc") else ""), "stdin": t.get("stdin"), "argv": t.get("argv"),
             "expect": t["out"], "got": res["stdout"], "pass": False}
        if res["error"]:
            r["error"] = res["error"]
        elif res["input_finito"]:
            r["input_finito"] = True
        else:
            r["pass"] = _norm_out(res["stdout"]) == _norm_out(t["out"])
        risultati.append(r)
    return {"tests": risultati}


def _run_user_tests(test_code, module, impl):
    # scrive l'implementazione come modulo, esegue le funzioni test_* dell'utente
    with open(module + ".py", "w") as f:
        f.write(impl)
    sys.modules.pop(module, None)
    importlib.invalidate_caches()
    g = {"__name__": "elica_tests", "__file__": _USER_FILE}
    exec(compile(test_code, _USER_FILE, "exec"), g)
    nomi = [k for k, v in g.items() if k.startswith("test_") and callable(v)]
    esiti = {}
    for n in nomi:
        try:
            g[n]()
            esiti[n] = None
        except BaseException as e:
            esiti[n] = _err_info(e, test_code)
    return nomi, esiti


def _check_tests(req):
    _pytest_shim()
    _fresh_dir(req.get("files"))
    code, module = req["code"], req["module"]
    try:
        nomi, esiti = _run_user_tests(code, module, req["impl"])
    except BaseException as e:
        return {"load_error": _err_info(e, code)}
    if not nomi:
        return {"no_tests": True}
    corretti = [{"name": n, "pass": esiti[n] is None, "error": esiti[n]} for n in nomi]
    mutanti = []
    for m in req["mutants"]:
        try:
            _, es = _run_user_tests(code, module, m["code"])
            scovato = any(v is not None for v in es.values())
        except BaseException:
            scovato = True
        mutanti.append({"desc": m["desc"], "caught": scovato})
    with open(module + ".py", "w") as f:
        f.write(req["impl"])
    sys.modules.pop(module, None)
    return {"user_tests": corretti, "mutants": mutanti, "min_tests": req.get("min_tests", 1), "n_tests": len(nomi)}


def __elica_handle(req_json):
    req = json.loads(req_json)
    kind = req.get("kind")
    if kind == "run":
        _fresh_dir(req.get("files"))
        res = _exec_program(req["code"], req.get("stdin"), req.get("argv"))
    elif req.get("mode") == "func":
        res = _check_func(req)
    elif req.get("mode") == "io":
        res = _check_io(req)
    elif req.get("mode") == "tests":
        res = _check_tests(req)
    else:
        res = {"fatal": "richiesta sconosciuta"}
    return json.dumps(res)
