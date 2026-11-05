#!/usr/bin/env python3
"""Prepara Elica per la pubblicazione.

Uso:  python3 tools/build.py

1. Aggiorna sw.js con l'elenco dei file e una versione che cambia a ogni modifica:
   così chi ha l'app installata riceve l'avviso "È disponibile una nuova versione".
2. Crea dist/elica-portable.html: tutta l'app in un unico file, da aprire
   con doppio clic anche senza internet (utile su PC o come copia di sicurezza).
"""
import base64, hashlib, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATTERNS = ['index.html', 'manifest.webmanifest', 'css/*.css', 'js/*.js', 'content/*.js', 'fonts/*.woff2', 'icons/*.png']


def app_files():
    files = []
    for pat in PATTERNS:
        files += sorted(ROOT.glob(pat))
    return files


def app_version():
    m = re.search(r"APP_VERSION\s*=\s*'([^']+)'", (ROOT / 'js/version.js').read_text(encoding='utf-8'))
    if not m:
        sys.exit("APP_VERSION non trovata in js/version.js")
    return m.group(1)


def update_sw(files, version):
    h = hashlib.sha256()
    for f in files:
        h.update(f.relative_to(ROOT).as_posix().encode())
        h.update(f.read_bytes())
    full = f"{version}-{h.hexdigest()[:8]}"
    rel = ['./'] + [f.relative_to(ROOT).as_posix() for f in files]
    sw = ROOT / 'sw.js'
    text = sw.read_text(encoding='utf-8')
    text = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{full}';", text)
    text = re.sub(r"const FILES = \[[^\]]*\];", "const FILES = [\n  " + ",\n  ".join(f"'{r}'" for r in rel) + "\n];", text)
    sw.write_text(text, encoding='utf-8')
    return full


def build_portable():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'css/style.css').read_text(encoding='utf-8')

    def font(m):
        data = base64.b64encode((ROOT / 'fonts' / m.group(1)).read_bytes()).decode()
        return f"url('data:font/woff2;base64,{data}')"
    css = re.sub(r"url\('\.\./fonts/([^']+)'\)", font, css)

    scripts = re.findall(r'<script src="([^"]+)"></script>', html)
    js = []
    for s in scripts:
        js.append(f"/* ---- {s} ---- */\n" + (ROOT / s).read_text(encoding='utf-8'))
        if s == 'js/core.js':
            js.append("ELICA.PORTABLE = true;")
    icon = base64.b64encode((ROOT / 'icons/icon-192.png').read_bytes()).decode()

    out = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
    out = re.sub(r'<link rel="(icon|apple-touch-icon)"[^>]*>\n?', '', out)
    out = out.replace('<link rel="stylesheet" href="css/style.css">',
                      f'<link rel="icon" href="data:image/png;base64,{icon}">\n<style>\n{css}\n</style>')
    out = re.sub(r'<!-- ordine:[^>]*-->\n?', '', out)
    out = re.sub(r'(<script src="[^"]+"></script>\n?)+', lambda m: '<script>\n' + '\n'.join(js).replace('</script>', '<\\/script>') + '\n</script>\n', out, count=1)
    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    (dist / 'elica-portable.html').write_text(out, encoding='utf-8')
    return dist / 'elica-portable.html'


if __name__ == '__main__':
    files = app_files()
    v = update_sw(files, app_version())
    p = build_portable()
    print(f"sw.js aggiornato: versione {v}, {len(files) + 1} file in cache")
    print(f"Versione portabile: {p.relative_to(ROOT)} ({p.stat().st_size // 1024} KB)")
