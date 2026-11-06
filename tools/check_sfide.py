# Usato da tools/check.js: esegue ogni sfida di codice con il correttore vero (harness.py).
# Controlla che la soluzione superi tutti i test, che il codice iniziale no,
# e (modalita' tests) che i test della soluzione scovino tutte le versioni con difetto.
import json, sys, os, shutil, glob, io, contextlib

harness_path = sys.argv[1]
for d in glob.glob("/tmp/elica_*"):
    shutil.rmtree(d, ignore_errors=True)
ns = {"__name__": "elica_harness"}
exec(compile(open(harness_path).read(), harness_path, "exec"), ns)
handle = ns["__elica_handle"]
casi = json.load(sys.stdin)
cwd = os.getcwd()


def esegui(ex, code):
    req = {k: ex.get(k) for k in ("mode", "func", "tests", "files", "module", "impl", "mutants", "min_tests")}
    req["code"] = code
    with contextlib.redirect_stdout(io.StringIO()):
        return json.loads(handle(json.dumps(req)))


def superato(ex, r):
    if r.get("load_error") or r.get("missing") or r.get("no_tests"):
        return False
    if "user_tests" in r:
        return (all(t["pass"] for t in r["user_tests"]) and r["n_tests"] >= r["min_tests"]
                and all(m["caught"] for m in r["mutants"]))
    return bool(r["tests"]) and all(t["pass"] for t in r["tests"])


out = []
for c in casi:
    ex, problems = c["ex"], []
    r = esegui(ex, ex["solution"])
    if not superato(ex, r):
        problems.append("la soluzione NON supera il correttore: " + json.dumps(r, ensure_ascii=False)[:600])
    r0 = esegui(ex, ex["starter"])
    if superato(ex, r0):
        problems.append("il codice iniziale supera gia' il correttore")
    out.append({"where": c["where"], "problems": problems})
    os.chdir(cwd)
print(json.dumps(out))
