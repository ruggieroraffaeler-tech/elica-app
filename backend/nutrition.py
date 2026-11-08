"""
Alimenti, piano alimentare e PDF per l'atleta (funzioni "pure", senza database).

- Database alimenti del coach: valori per 100 g (kcal, carboidrati, zuccheri, proteine, grassi, fibre).
- Lettura delle schede CREA (www.alimentinutrizione.it). I dati CREA si possono riusare
  solo citando la fonte: gli alimenti presi da lì tengono "Fonte: CREA" e il codice,
  e il PDF riporta la citazione.
- Piano alimentare: "dieta" (giorni → pasti → alimenti) oppure "macro" (solo obiettivi).
"""
import html as _html
import io
import os
import re
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional

# valori per 100 g; il sodio è in mg (in Notion la colonna si chiamava "Sale in mg": sono i valori del sodio CREA)
FOOD_FIELDS = ["kcal", "carbs", "sugars", "protein", "fat", "saturated", "fiber", "sodium"]
FIELD_MAX = {"kcal": 1000, "sodium": 50000}  # gli altri: massimo 100 g su 100 g
CREA_BASE = "https://www.alimentinutrizione.it"
CREA_CITATION = ("Valori nutrizionali: CREA - Centro di ricerca Alimenti e Nutrizione, "
                 "Tabelle di composizione degli alimenti, www.alimentinutrizione.it")
CODE_RE = re.compile(r"^[A-Z0-9]{6}$")


# ---------------------------------------------------------------- utilità

def norm(s: Any) -> str:
    """minuscolo, senza accenti e spazi doppi: per cercare e trovare i doppioni"""
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9%]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def num(v: Any) -> Optional[float]:
    """numero da testo: '12,5' '12.5' ' 1.234,5 ' 'tr' (tracce = 0); None se vuoto o non valido"""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v) if v == v and abs(v) != float("inf") else None
    s = str(v).strip().lower().replace(" ", " ")
    if not s or s in ("-", "--", "n.d.", "nd", "n.d"):
        return None
    if s in ("tr", "tracce", "traccia"):
        return 0.0
    s = re.sub(r"[^0-9,.\-]", "", s)
    if not s or s in ("-", ".", ","):
        return None
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    else:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def clean_food(d: Dict[str, Any]) -> Dict[str, Any]:
    out = {"name": re.sub(r"\s+", " ", str(d.get("name") or "")).strip()[:120]}
    for f in FOOD_FIELDS:
        v = num(d.get(f))
        out[f] = None if v is None or v < 0 or v > FIELD_MAX.get(f, 100) else round(v, 2)
    for k, lim in (("notes", 300), ("category", 60), ("source", 20), ("crea_code", 6)):
        v = d.get(k)
        out[k] = str(v).strip()[:lim] if v not in (None, "") else None
    return out


def _txt(fragment: str) -> str:
    t = re.sub(r"<[^>]+>", " ", fragment or "")
    t = _html.unescape(t).replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip()


# ---------------------------------------------------------------- CREA

def parse_crea_index(page: str) -> List[Dict[str, str]]:
    """Elenco alfabetico del CREA → [{code, name}] (link /tabelle-nutrizionali/CODICE)"""
    out, seen = [], set()
    for m in re.finditer(r'<a\b[^>]*href="(?:https?://(?:www\.)?alimentinutrizione\.it)?/tabelle-nutrizionali/([A-Za-z0-9]{6})/?"[^>]*>(.*?)</a>',
                         page or "", flags=re.S | re.I):
        code = m.group(1).upper()
        name = _txt(m.group(2)).strip("| ").replace('""', '"')
        if code in seen or not name or not CODE_RE.match(code):
            continue
        seen.add(code)
        out.append({"code": code, "name": name})
    return out


def search_index(items: List[Dict[str, str]], q: str, limit: int = 25) -> List[Dict[str, str]]:
    words = norm(q).split()
    if not words:
        return []
    scored = []
    for it in items:
        n = norm(it["name"])
        if all(w in n for w in words):
            first = n.split(" ")[0] if n else ""
            score = (0 if n.startswith(words[0]) else 1 if first.startswith(words[0]) else 2, len(n))
            scored.append((score, it))
    scored.sort(key=lambda x: x[0])
    return [it for _, it in scored[:limit]]


_CREA_NUTRIENTS = {
    # chiave → (inizio del nome nella tabella CREA, unità attesa)
    "kcal": ("energia", "kcal"),
    "protein": ("proteine", "g"),
    "fat": ("lipidi", "g"),
    "carbs": ("carboidrati disponibili", "g"),
    "sugars": ("zuccheri solubili", "g"),
    "fiber": ("fibra totale", "g"),
    "saturated": ("acidi grassi saturi", "g"),
    "sodium": ("sodio", "mg"),
}


def parse_crea_food(page: str, code: str = "") -> Dict[str, Any]:
    """Scheda CREA → valori per 100 g. Solleva ValueError se la pagina non ha la tabella attesa."""
    rows = []
    for tr in re.findall(r"<tr\b[^>]*>(.*?)</tr>", page or "", flags=re.S | re.I):
        cells = [_txt(c) for c in re.findall(r"<t[hd]\b[^>]*>(.*?)</t[hd]>", tr, flags=re.S | re.I)]
        if cells:
            rows.append(cells)
    values: Dict[str, Optional[float]] = {}
    info: Dict[str, str] = {}
    for cells in rows:
        label = norm(cells[0])
        if len(cells) >= 3:
            unit = norm(cells[1])
            for key, (start, want_unit) in _CREA_NUTRIENTS.items():
                if key in values:
                    continue
                if label.startswith(start) and (unit == want_unit or (key not in ("kcal", "sodium") and unit in ("g", ""))):
                    values[key] = num(cells[2])
        if len(cells) >= 2 and label in ("categoria", "nome scientifico", "parte edibile", "codice alimento", "nome alimento", "porzione"):
            info[label] = cells[1]
    if values.get("kcal") is None or all(values.get(k) is None for k in ("protein", "fat", "carbs")):
        raise ValueError("scheda CREA non riconosciuta")
    name = info.get("nome alimento")
    if not name:
        m = re.search(r"<title>\s*(?:AlimentiNUTrizione\s*[-–]\s*)?(.*?)\s*</title>", page or "", flags=re.S | re.I)
        name = _txt(m.group(1)) if m else ""
    if not name:
        m = re.search(r"<h1\b[^>]*>(.*?)</h1>", page or "", flags=re.S | re.I)
        name = _txt(m.group(1)) if m else code
    name = re.sub(r"^(scheda:?\s*)", "", name, flags=re.I).strip()
    food = {"name": name, "category": info.get("categoria"), "source": "CREA", "crea_code": code or None,
            "edible": info.get("parte edibile"), "url": f"{CREA_BASE}/tabelle-nutrizionali/{code}" if code else None}
    for f in FOOD_FIELDS:
        food[f] = values.get(f)
    return food


# ---------------------------------------------------------------- piano alimentare

def _clean_values(d: Any) -> Dict[str, Optional[float]]:
    d = d if isinstance(d, dict) else {}
    out = {}
    for f in FOOD_FIELDS:
        v = num(d.get(f))
        out[f] = None if v is None or v < 0 or v > 5000 else round(v, 2)
    return out


def _s(v: Any, lim: int) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()[:lim]


def _alt(a: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(a, dict) or not _s(a.get("name"), 120):
        return None
    g = num(a.get("grams"))
    return {"name": _s(a.get("name"), 120), "grams": round(g) if g and 0 < g < 5000 else None,
            "source": _s(a.get("source"), 20) or None, **_clean_values(a)}


def clean_plan(p: Dict[str, Any]) -> Dict[str, Any]:
    """Ripulisce il piano che arriva dall'app (limiti di dimensione, numeri validi)."""
    p = p if isinstance(p, dict) else {}
    mode = "macro" if p.get("mode") == "macro" else "dieta"
    days = []
    for d in (p.get("days") or [])[:14]:
        if not isinstance(d, dict):
            continue
        meals = []
        for m in (d.get("meals") or [])[:12]:
            if not isinstance(m, dict):
                continue
            items = []
            for it in (m.get("items") or [])[:40]:
                if not isinstance(it, dict) or not _s(it.get("name"), 120):
                    continue
                g = num(it.get("grams"))
                items.append({
                    "food_id": _s(it.get("food_id"), 40) or None,
                    "name": _s(it.get("name"), 120),
                    "grams": round(g, 1) if g is not None and 0 <= g < 5000 else None,
                    "note": _s(it.get("note"), 200),
                    "per100": _clean_values(it.get("per100")),
                    "source": _s(it.get("source"), 20) or None,
                    "alternatives": [a for a in (_alt(x) for x in (it.get("alternatives") or [])[:3]) if a],
                    "suggestions": [a for a in (_alt(x) for x in (it.get("suggestions") or [])[:5]) if a],
                })
            meals.append({"id": _s(m.get("id"), 40), "name": _s(m.get("name"), 40) or "Pasto", "items": items})
        days.append({"id": _s(d.get("id"), 40), "name": _s(d.get("name"), 40) or "Giorno",
                     "targets": _clean_values(d.get("targets")), "meals": meals})
    macro_in = p.get("macro") if isinstance(p.get("macro"), dict) else {}
    mdays = []
    for d in (macro_in.get("days") or [])[:6]:
        if isinstance(d, dict):
            mdays.append({"id": _s(d.get("id"), 40), "name": _s(d.get("name"), 40) or "Giorno", **_clean_values(d)})
    split = []
    for s in (macro_in.get("split") or [])[:8]:
        if isinstance(s, dict) and _s(s.get("meal"), 40):
            pct = num(s.get("pct"))
            split.append({"meal": _s(s.get("meal"), 40), "pct": round(pct, 1) if pct is not None and 0 <= pct <= 100 else 0})
    eqs = []
    for e in (macro_in.get("equivalents") or [])[:3]:
        if not isinstance(e, dict) or e.get("macro") not in ("carbs", "protein", "fat"):
            continue
        amount = num(e.get("amount"))
        eqs.append({"macro": e["macro"], "amount": round(amount, 1) if amount and 0 < amount < 500 else None,
                    "items": [a for a in (_alt(x) for x in (e.get("items") or [])[:12]) if a]})
    start = _s(p.get("start_date"), 10)
    return {
        "mode": mode,
        "start_date": start if re.match(r"^\d{4}-\d{2}-\d{2}$", start) else None,
        "notes": str(p.get("notes") or "").strip()[:3000],
        "show_food_macros": bool(p.get("show_food_macros")),
        "days": days,
        "macro": {"days": mdays, "split": split, "equivalents": eqs},
    }


def item_values(it: Dict[str, Any]) -> Dict[str, float]:
    g = it.get("grams") or 0
    per = it.get("per100") or {}
    return {f: (per.get(f) or 0) * g / 100 for f in FOOD_FIELDS}


def sum_values(lst: List[Dict[str, float]]) -> Dict[str, float]:
    return {f: sum(x.get(f, 0) for x in lst) for f in FOOD_FIELDS}


def macro_kcal(d: Dict[str, Any]) -> float:
    if d.get("kcal"):
        return d["kcal"]
    return (d.get("protein") or 0) * 4 + (d.get("carbs") or 0) * 4 + (d.get("fat") or 0) * 9


def plan_uses_crea(plan: Dict[str, Any]) -> bool:
    """True se nel PDF compare almeno un alimento preso dal CREA (serve la citazione della fonte)."""
    is_crea = lambda x: (x.get("source") or "").upper() == "CREA"
    if plan.get("mode") == "macro":
        return any(is_crea(a) for e in (plan.get("macro") or {}).get("equivalents") or [] for a in e.get("items") or [])
    for d in plan.get("days") or []:
        for m in d.get("meals") or []:
            for it in m.get("items") or []:
                if is_crea(it) or any(is_crea(a) for a in it.get("alternatives") or []):
                    return True
    return False


# ---------------------------------------------------------------- PDF

def _it_num(v: float, dec: int = 0) -> str:
    s = f"{v:,.{dec}f}" if dec else f"{round(v):,}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def _date_it(iso: Optional[str]) -> str:
    months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto",
              "settembre", "ottobre", "novembre", "dicembre"]
    try:
        d = datetime.strptime(iso, "%Y-%m-%d")
        return f"{d.day} {months[d.month - 1]} {d.year}"
    except Exception:
        return ""


def _p(text: str) -> str:
    """testo sicuro per i Paragraph di reportlab"""
    return _html.escape(str(text or ""), quote=False).replace("\n", "<br/>")


def build_plan_pdf(plan: Dict[str, Any], athlete_name: str, logo_path: Optional[str] = None,
                   crea_used: bool = False) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table,
                                    TableStyle)

    INK = colors.HexColor("#121310")
    MUTED = colors.HexColor("#62665d")
    LINE = colors.HexColor("#dcdfd5")
    SOFT = colors.HexColor("#f4f6f1")
    GREEN = colors.HexColor("#157f3b")
    COL = {"kcal": INK, "carbs": colors.HexColor("#16a34a"), "sugars": colors.HexColor("#db2777"),
           "protein": colors.HexColor("#2563eb"), "fat": colors.HexColor("#d97706"), "fiber": colors.HexColor("#78716c")}

    st = {
        "title": ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=22, leading=25, textColor=INK),
        "big": ParagraphStyle("big", fontName="Helvetica", fontSize=9, leading=24, textColor=INK, spaceAfter=2),
        "name": ParagraphStyle("n", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=INK),
        "meta": ParagraphStyle("m", fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED, alignment=TA_RIGHT),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=INK),
        "day": ParagraphStyle("d", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=GREEN, spaceBefore=8),
        "small": ParagraphStyle("s", fontName="Helvetica", fontSize=8, leading=10.5, textColor=MUTED),
        "smallr": ParagraphStyle("sr", fontName="Helvetica", fontSize=8, leading=10.5, textColor=MUTED, alignment=TA_RIGHT),
        "cell": ParagraphStyle("c", fontName="Helvetica", fontSize=9.5, leading=12, textColor=INK),
        "cellb": ParagraphStyle("cb", fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=INK),
        "cellr": ParagraphStyle("cr", fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=INK, alignment=TA_RIGHT),
        "num": ParagraphStyle("nm", fontName="Helvetica", fontSize=8.5, leading=11, textColor=MUTED, alignment=TA_RIGHT),
        "note": ParagraphStyle("no", fontName="Helvetica", fontSize=9, leading=13, textColor=INK),
        "lab": ParagraphStyle("lb", fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=MUTED),
        "big": ParagraphStyle("bg", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=INK),
    }
    W = A4[0] - 36 * mm
    buf = io.BytesIO()
    footer_text = f"LC Performance - piano personale di {athlete_name}"

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.line(18 * mm, 16 * mm, A4[0] - 18 * mm, 16 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, 11.5 * mm, footer_text)
        canvas.drawRightString(A4[0] - 18 * mm, 11.5 * mm, f"Pagina {doc.page}")
        if crea_used:
            canvas.setFont("Helvetica", 6.5)
            canvas.drawString(18 * mm, 8 * mm, CREA_CITATION)
        canvas.restoreState()

    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                            bottomMargin=22 * mm, title="Piano alimentare" if plan.get("mode") != "macro" else "I tuoi macro",
                            author="LC Performance")
    story: List[Any] = []

    # intestazione
    title = "I tuoi macro" if plan.get("mode") == "macro" else "Piano alimentare"
    left = [Paragraph(_p(title), st["title"]), Spacer(1, 2), Paragraph(_p(athlete_name), st["name"])]
    logo = None
    if logo_path and os.path.isfile(logo_path):
        try:
            logo = Image(logo_path, width=17 * mm, height=17 * mm)
        except Exception:
            logo = None
    start = _date_it(plan.get("start_date"))
    meta = (f"Dal <b>{_p(start)}</b><br/>" if start else "") + "LC Performance"
    head = Table([[logo or "", left, Paragraph(meta, st["meta"])]], colWidths=[21 * mm, W - 21 * mm - 55 * mm, 55 * mm])
    head.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("LINEBELOW", (0, 0), (-1, 0), 1.4, INK),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story += [head, Spacer(1, 10)]

    def boxes(pairs):
        cells = [[Paragraph(_p(lab.upper()), st["lab"]), Paragraph(val, st["big"])] for lab, val in pairs]
        t = Table([cells], colWidths=[W / len(pairs)] * len(pairs))
        t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
                               ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 6),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 7), ("LEFTPADDING", (0, 0), (-1, -1), 7)]))
        return t

    def notes_box(text):
        t = Table([[Paragraph("<b>Note del coach</b><br/>" + _p(text), st["note"])]], colWidths=[W])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), SOFT), ("LEFTPADDING", (0, 0), (-1, -1), 10),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]))
        return t

    if plan.get("mode") != "macro":
        show_macros = bool(plan.get("show_food_macros"))
        for di, day in enumerate(plan.get("days") or []):
            all_items = [it for m in day.get("meals") or [] for it in m.get("items") or []]
            if not all_items:
                continue
            tot = sum_values([item_values(it) for it in all_items])
            if di > 0:
                story.append(Spacer(1, 6))
            story.append(Paragraph(_p(day.get("name") or "Giorno").upper(), st["day"]))
            story.append(Spacer(1, 4))
            story.append(boxes([("Calorie", f"{_it_num(tot['kcal'])} kcal"), ("Carboidrati", f"{_it_num(tot['carbs'])} g"),
                                ("di cui zuccheri", f"{_it_num(tot['sugars'])} g"), ("Proteine", f"{_it_num(tot['protein'])} g"),
                                ("Grassi", f"{_it_num(tot['fat'])} g")]))
            for meal in day.get("meals") or []:
                items = meal.get("items") or []
                if not items:
                    continue
                mt = sum_values([item_values(it) for it in items])
                mh = Table([[Paragraph(_p(meal.get("name")), st["h2"]),
                             Paragraph(f"{_it_num(mt['kcal'])} kcal · C {_it_num(mt['carbs'])} · P {_it_num(mt['protein'])} · G {_it_num(mt['fat'])}", st["smallr"])]],
                           colWidths=[W * 0.5, W * 0.5])
                mh.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, 0), 0.9, INK), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                        ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
                rows = []
                for it in items:
                    name = f"<b>{_p(it.get('name'))}</b>"
                    alts = [a for a in it.get("alternatives") or [] if a.get("name")]
                    if alts:
                        alt_txt = " · ".join(f"{_p(a['name'])} {_it_num(a['grams'])} g" if a.get("grams") else _p(a["name"]) for a in alts)
                        name += f"<br/><font size=8 color='#157f3b'>oppure {alt_txt}</font>"
                    grams = f"{_it_num(it['grams'])} g" if it.get("grams") else ""
                    row = [Paragraph(name, st["cell"]), Paragraph(grams, st["cellr"]), Paragraph(_p(it.get("note")), st["small"])]
                    if show_macros:
                        per = it.get("per100") or {}
                        if it.get("grams") and any(per.get(k) is not None for k in ("kcal", "carbs", "protein", "fat")):
                            v = item_values(it)
                            row += [Paragraph(_it_num(v[k], 0 if k == "kcal" else 1), st["num"]) for k in ("kcal", "carbs", "protein", "fat")]
                        else:  # alimento libero (es. verdura a piacere): niente numeri finti
                            row += [Paragraph("–", st["num"]) for _ in range(4)]
                    rows.append(row)
                if show_macros:
                    hdr = ["", "", "", *[Paragraph(x, st["num"]) for x in ("kcal", "C", "P", "G")]]
                    rows = [hdr] + rows
                    widths = [W * 0.36, W * 0.1, W * 0.22, W * 0.08, W * 0.08, W * 0.08, W * 0.08]
                else:
                    widths = [W * 0.5, W * 0.13, W * 0.37]
                t = Table(rows, colWidths=widths)
                t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#ecede8")),
                                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                       ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 5),
                                       ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
                story.append(Spacer(1, 9))
                story.append(KeepTogether([mh, t]))
    else:
        mdays = (plan.get("macro") or {}).get("days") or []
        cards = []
        for d in mdays[:4]:
            k = macro_kcal(d)
            lines = [[Paragraph(f"<b>{_p(d.get('name'))}</b>", st["h2"]), ""],
                     [Paragraph(f"<font size=18><b>{_it_num(k)}</b></font> <font color='#62665d'>kcal</font>", st["big"]), ""]]
            for key, lab in (("protein", "Proteine"), ("carbs", "Carboidrati"), ("sugars", "di cui zuccheri (max)"),
                             ("fat", "Grassi"), ("fiber", "Fibre (min)")):
                if d.get(key) is not None:
                    lines.append([Paragraph(f"<font color='{COL[key].hexval()}'>•</font> {lab}", st["cell"]),
                                  Paragraph(f"{_it_num(d[key])} g", st["cellr"])])
            ct = Table(lines, colWidths=[None, 22 * mm])
            ct.setStyle(TableStyle([("LINEBELOW", (0, 2), (-1, -1), 0.4, colors.HexColor("#e3e5dd")),
                                    ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                    ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                                    ("SPAN", (0, 0), (1, 0)), ("SPAN", (0, 1), (1, 1))]))
            cards.append(ct)
        if cards:
            per_row = 2 if len(cards) > 1 else 1
            grid = [cards[i:i + per_row] + [""] * (per_row - len(cards[i:i + per_row])) for i in range(0, len(cards), per_row)]
            gt = Table(grid, colWidths=[W / per_row] * per_row)
            gt.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
                                    ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 10),
                                    ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8),
                                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
            story += [gt, Spacer(1, 12)]
        eqs = [e for e in (plan.get("macro") or {}).get("equivalents") or [] if e.get("items") and e.get("amount")]
        if eqs:
            labels = {"carbs": "carboidrati", "protein": "proteine", "fat": "grassi"}
            story.append(Paragraph("Porzioni equivalenti", st["h2"]))
            story.append(Paragraph("Ogni riga della stessa colonna vale uguale: scegli quella che preferisci. Pesi a crudo, se non indicato.", st["small"]))
            story.append(Spacer(1, 4))
            cols = []
            for e in eqs:
                rows = [[Paragraph(f"<font color='{COL[e['macro']].hexval()}'>•</font> <b>{_it_num(e['amount'])} g di {labels[e['macro']]}</b>", st["cell"]), ""]]
                rows += [[Paragraph(_p(a["name"]), st["small"]), Paragraph(f"<b>{_it_num(a['grams'])} g</b>" if a.get("grams") else "", st["cellr"])] for a in e["items"]]
                t = Table(rows, colWidths=[None, 16 * mm])
                t.setStyle(TableStyle([("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#ecede8")), ("SPAN", (0, 0), (1, 0)),
                                       ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                                       ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
                cols.append(t)
            gt = Table([cols], colWidths=[W / len(cols)] * len(cols))
            gt.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                    ("RIGHTPADDING", (0, 0), (-1, -1), 10)]))
            story += [gt, Spacer(1, 12)]
        split = [s for s in (plan.get("macro") or {}).get("split") or [] if s.get("pct")]
        if split and mdays:
            ref = mdays[0]
            story.append(Paragraph(f"Come dividerli nella giornata <font size=9 color='#62665d'>({_p(ref.get('name'))})</font>", st["h2"]))
            rows = [[Paragraph(x, st["lab"]) for x in ("PASTO", "PROTEINE", "CARBOIDRATI", "GRASSI", "KCAL")]]
            for s in split:
                f = s["pct"] / 100
                rows.append([Paragraph(f"<b>{_p(s['meal'])}</b>", st["cell"])] +
                            [Paragraph(f"{_it_num((ref.get(k) or 0) * f)} g", st["cell"]) for k in ("protein", "carbs", "fat")] +
                            [Paragraph(_it_num(macro_kcal(ref) * f), st["cell"])])
            t = Table(rows, colWidths=[W * 0.32, W * 0.17, W * 0.17, W * 0.17, W * 0.17])
            t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#ecede8")),
                                   ("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 4),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
            story += [Spacer(1, 4), t, Spacer(1, 12)]

    if (plan.get("notes") or "").strip():
        story += [Spacer(1, 12), notes_box(plan["notes"])]
    if len(story) <= 2:
        story.append(Paragraph("Il piano è vuoto.", st["cell"]))
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()
