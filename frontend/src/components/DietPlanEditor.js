import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Save, Eye, Send, Plus, Trash2, Copy, Loader2, ArrowLeftRight, X, Check, Wand2, Utensils, Target } from 'lucide-react';
import { adminAPI } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import FoodPicker from './FoodPicker';
import {
  MAIN_KEYS, MACRO_COLORS, MACRO_LABEL, fmt, fmt0, parseNum, valuesFor, sumValues, per100Of, kcalFromMacros,
  alternativesFor, altToSaved, gramsForMacro, dominantMacro, uniqueByValues, uid, newDay, emptyPlan, norm,
} from '../lib/foods';

const TARGET_FIELDS = [
  { key: 'kcal', label: 'Calorie', unit: 'kcal' },
  { key: 'carbs', label: 'Carboidrati', unit: 'g' },
  { key: 'sugars', label: 'Zuccheri (max)', unit: 'g', max: true },
  { key: 'protein', label: 'Proteine', unit: 'g' },
  { key: 'fat', label: 'Grassi', unit: 'g' },
];
const COLS = [
  { key: 'kcal', label: 'Kcal', dec: 0 }, { key: 'carbs', label: 'Carbo', dec: 1 }, { key: 'sugars', label: 'Zucch.', dec: 1 },
  { key: 'protein', label: 'Prot.', dec: 1 }, { key: 'fat', label: 'Grassi', dec: 1 },
];
const draftKey = (id) => `lc-plan-draft-${id}`;
const clone = (x) => JSON.parse(JSON.stringify(x));

const NumBox = ({ value, onChange, className = '', placeholder = '', testid }) => (
  <input inputMode="decimal" value={value ?? ''} placeholder={placeholder} data-testid={testid}
    onChange={(e) => onChange(e.target.value)}
    className={`h-8 w-full rounded-md border border-input bg-background px-2 text-right tabular-nums font-semibold ${className}`} />
);

// ------------------------------------------------------------------ pannello alternative
const AltPanel = ({ item, foods, onToggle, onClose }) => {
  const alts = useMemo(() => alternativesFor(item, foods, 6), [item, foods]);
  const macro = dominantMacro(item.per100 || {});
  const base = valuesFor(item.per100, item.grams);
  const chosen = new Set((item.alternatives || []).map((a) => norm(a.name)));
  return (
    <div className="rounded-xl border bg-popover shadow-lg p-3 my-1" data-testid="alt-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm flex items-center gap-1.5"><ArrowLeftRight className="w-4 h-4" />Alternative a {item.name} {fmt0(item.grams)} g</p>
          <p className="text-xs text-muted-foreground">
            {macro ? `A pari ${MACRO_LABEL[macro]} (${fmt(base[macro])} g), ordinate per somiglianza di calorie e macro. Scegline fino a 3 da mettere nel PDF.` : 'Servono i valori nutrizionali per calcolare le alternative.'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Chiudi"><X className="w-4 h-4" /></Button>
      </div>
      {alts.length > 0 && (
        <table className="w-full text-sm mt-2">
          <thead><tr className="text-[11px] text-muted-foreground"><th className="text-left font-semibold py-1">Alimento</th><th className="text-right font-semibold">Grammi</th><th className="text-right font-semibold">Kcal</th><th className="text-right font-semibold">C</th><th className="text-right font-semibold">P</th><th className="text-right font-semibold">G</th><th /></tr></thead>
          <tbody>
            {alts.map((a) => {
              const on = chosen.has(norm(a.name));
              return (
                <tr key={a.name} className="border-t">
                  <td className="py-1.5 font-medium">{a.name}</td>
                  <td className="text-right font-bold tabular-nums">{a.grams} g</td>
                  <td className="text-right tabular-nums">{fmt0(a.kcal)} <span className={`text-xs font-semibold ${Math.abs(a.dk) <= 20 ? 'text-accent' : 'text-amber-600'}`}>{a.dk > 0 ? '+' : a.dk < 0 ? '−' : '±'}{fmt0(Math.abs(a.dk))}</span></td>
                  <td className="text-right tabular-nums">{fmt(a.carbs)}</td>
                  <td className="text-right tabular-nums">{fmt(a.protein)}</td>
                  <td className="text-right tabular-nums">{fmt(a.fat)}</td>
                  <td className="text-right pl-2">
                    <button type="button" onClick={() => onToggle(a)} data-testid={`alt-toggle-${norm(a.name).replace(/ /g, '-')}`}
                      className={`text-xs font-semibold px-2 py-1 rounded-md whitespace-nowrap ${on ? 'bg-accent/15 text-accent' : 'bg-muted hover:bg-muted/70'}`}>
                      {on ? <><Check className="w-3 h-3 inline mr-0.5" />nel PDF</> : '+ aggiungi'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {macro && !alts.length && <p className="text-sm text-muted-foreground mt-2">Nel database non ci sono alimenti con lo stesso macro principale.</p>}
    </div>
  );
};

// ------------------------------------------------------------------ editor
const DietPlanEditor = ({ athleteId, athleteName, onPdfSent }) => {
  const [plan, setPlan] = useState(null);
  const [foods, setFoods] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(null); // 'save' | 'preview' | 'send'
  const [dayIdx, setDayIdx] = useState(0);
  const [altFor, setAltFor] = useState(null); // "meal:item"
  const [draft, setDraft] = useState(null);
  const [eqSearch, setEqSearch] = useState({});
  const [publishedAt, setPublishedAt] = useState(null); // ultimo "Invia all'atleta"

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, f, mac] = await Promise.all([adminAPI.getDietPlan(athleteId), adminAPI.getFoods(), adminAPI.getMacros(athleteId).catch(() => ({ data: {} }))]);
        const legacyMacros = mac.data || {};
        if (!alive) return;
        setFoods(f.data || []);
        setPublishedAt(p.data?.published_at || null);
        let base = p.data && p.data.mode ? { ...emptyPlan(), ...p.data } : emptyPlan();
        if (!p.data?.mode && legacyMacros && (legacyMacros.proteine || legacyMacros.carboidrati)) {
          // atleta che aveva già i macro nel vecchio riquadro: li porto nel nuovo "solo macro"
          base = { ...base, mode: 'macro', start_date: legacyMacros.data_inizio || null, notes: legacyMacros.note || '' };
          base.macro = { ...base.macro, days: [{ id: uid(), name: 'Tutti i giorni', protein: legacyMacros.proteine, carbs: legacyMacros.carboidrati, fat: legacyMacros.grassi }] };
        }
        if (!base.days?.length) base.days = [newDay('Giorno di allenamento')];
        setPlan(base);
        try {
          const d = JSON.parse(localStorage.getItem(draftKey(athleteId)) || 'null');
          if (d && d.savedAt && (!p.data?.updated_at || d.savedAt > p.data.updated_at)) setDraft(d);
        } catch { /* ok */ }
      } catch {
        if (alive) { setPlan(emptyPlan()); toast.error('Impossibile caricare il piano'); }
      }
    })();
    return () => { alive = false; };
  }, [athleteId]);

  // bozza locale: se si chiude la pagina o cade la rete non si perde niente
  useEffect(() => {
    if (!plan || !dirty) return;
    try { localStorage.setItem(draftKey(athleteId), JSON.stringify({ plan, savedAt: new Date().toISOString() })); } catch { /* ok */ }
  }, [plan, dirty, athleteId]);

  const update = (fn) => { setPlan((p) => { const n = clone(p); fn(n); return n; }); setDirty(true); };
  const day = plan?.days?.[Math.min(dayIdx, (plan?.days?.length || 1) - 1)];
  const di = plan ? Math.min(dayIdx, plan.days.length - 1) : 0;

  const totals = useMemo(() => {
    if (!day) return null;
    const meals = day.meals.map((m) => sumValues(m.items.map((it) => valuesFor(it.per100, it.grams))));
    return { meals, day: sumValues(meals) };
  }, [day]);

  // ---------------- salvataggio
  const prepare = (p) => {
    const out = clone(p);
    out.days.forEach((d) => d.meals.forEach((m) => {
      m.items = m.items.filter((it) => (it.name || '').trim());
      m.items.forEach((it) => { it.suggestions = alternativesFor(it, foods, 4).map(altToSaved); });
    }));
    out.macro.equivalents.forEach((e) => {
      e.items = e.items.map((it) => {
        const f = foods.find((x) => x.id === it.id) || foods.find((x) => norm(x.name) === norm(it.name));
        return f ? { id: f.id, name: f.name, source: f.source || null, grams: gramsForMacro(f, e.macro, e.amount), kcal: Math.round(valuesFor(per100Of(f), gramsForMacro(f, e.macro, e.amount)).kcal) } : it;
      });
    });
    return out;
  };

  const save = async (quiet = false) => {
    setBusy('save');
    try {
      const r = await adminAPI.saveDietPlan(athleteId, prepare(plan));
      setPlan((p) => ({ ...p, ...r.data, days: r.data.days?.length ? r.data.days : p.days }));
      setDirty(false);
      try { localStorage.removeItem(draftKey(athleteId)); } catch { /* ok */ }
      if (!quiet) toast.success('Piano salvato');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Salvataggio non riuscito: la bozza resta su questo dispositivo');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const preview = async () => {
    const win = window.open('', '_blank');
    if (dirty && !(await save(true))) { if (win) win.close(); return; }
    setBusy('preview');
    try {
      const r = await adminAPI.dietPlanPdf(athleteId, false);
      const bin = atob(r.data.pdf_data.split(',')[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      if (win) win.location.href = url; else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (win) win.close();
      toast.error(e.response?.data?.detail || 'Anteprima non riuscita');
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    if (!window.confirm(`Inviare il piano a ${athleteName || "l'atleta"}? Lo vedrà nell'app e troverà il PDF tra i suoi PDF dieta.`)) return;
    if (dirty && !(await save(true))) return;
    setBusy('send');
    try {
      const r = await adminAPI.dietPlanPdf(athleteId, true);
      onPdfSent && onPdfSent({ name: r.data.name, pdf_data: r.data.pdf_data, generated: true });
      setPublishedAt(r.data.published_at || new Date().toISOString());
      toast.success(`PDF inviato: “${r.data.name}”`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Invio non riuscito');
    } finally {
      setBusy(null);
    }
  };

  if (!plan) {
    return <Card><CardContent className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  const onFoodAdded = (food) => setFoods((list) => [...list.filter((f) => f.id !== food.id), food]);
  const setItemFood = (mi, ii, food) => update((p) => {
    const it = p.days[di].meals[mi].items[ii];
    it.name = food.name; it.food_id = food.free ? null : food.id; it.source = food.source || null;
    it.per100 = food.free ? {} : per100Of(food); it.alternatives = []; it.suggestions = [];
  });
  const addItem = (mi, food) => update((p) => {
    p.days[di].meals[mi].items.push({ food_id: food.free ? null : food.id, name: food.name, grams: food.free ? null : 100, note: '', per100: food.free ? {} : per100Of(food), source: food.source || null, alternatives: [], suggestions: [] });
  });
  const toggleAlt = (mi, ii, a) => update((p) => {
    const it = p.days[di].meals[mi].items[ii];
    const list = it.alternatives || [];
    const i = list.findIndex((x) => norm(x.name) === norm(a.name));
    if (i >= 0) list.splice(i, 1);
    else if (list.length >= 3) { toast.error('Massimo 3 alternative per alimento'); return; }
    else list.push(altToSaved(a));
    it.alternatives = list;
  });

  const modeBtn = (m, label, Icon) => (
    <button type="button" onClick={() => update((p) => { p.mode = m; })} data-testid={`plan-mode-${m}`}
      className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 ${plan.mode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );

  const sentLabel = publishedAt ? new Date(publishedAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const changedSinceSent = publishedAt && (dirty || (plan.updated_at && plan.updated_at > publishedAt));
  const publishStatus = !publishedAt
    ? "Non ancora inviato: l'atleta lo vedrà quando premi “Invia all'atleta”. Salva serve per lavorarci con calma."
    : changedSinceSent
      ? `L'atleta vede la versione inviata il ${sentLabel}: le modifiche arrivano quando lo invii di nuovo.`
      : `Inviato all'atleta il ${sentLabel}.`;

  return (
    <Card data-testid="diet-plan-editor">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg">Piano alimentare {dirty && <span className="ml-2 text-xs font-medium text-amber-600" data-testid="plan-dirty">modifiche non salvate</span>}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="plan-status">{publishStatus}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-muted rounded-lg p-1 gap-1">{modeBtn('dieta', 'Dieta completa', Utensils)}{modeBtn('macro', 'Solo macro', Target)}</div>
            <Button variant={dirty ? 'default' : 'outline'} size="sm" onClick={() => save()} disabled={!!busy} data-testid="plan-save">
              {busy === 'save' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}Salva
            </Button>
            <Button variant="outline" size="sm" onClick={preview} disabled={!!busy} data-testid="plan-preview">
              {busy === 'preview' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Eye className="w-4 h-4 mr-1.5" />}Anteprima PDF
            </Button>
            <Button size="sm" onClick={send} disabled={!!busy} data-testid="plan-send">
              {busy === 'send' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}Invia all'atleta
            </Button>
          </div>
        </div>
        {draft && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap">
            <span>Su questo dispositivo c'è una bozza non salvata del {new Date(draft.savedAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.</span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { try { localStorage.removeItem(draftKey(athleteId)); } catch { /* ok */ } setDraft(null); }}>Scarta</Button>
              <Button size="sm" onClick={() => { setPlan(draft.plan); setDirty(true); setDraft(null); }}>Ripristina</Button>
            </span>
          </div>
        )}
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <label className="flex items-center gap-2"><span className="text-muted-foreground">Data inizio</span>
            <Input type="date" value={plan.start_date || ''} onChange={(e) => update((p) => { p.start_date = e.target.value || null; })} className="h-8 w-auto" />
          </label>
          {plan.mode === 'dieta' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!plan.show_food_macros} onChange={(e) => update((p) => { p.show_food_macros = e.target.checked; })} data-testid="plan-show-macros" />
              Nel PDF mostra kcal e macro di ogni alimento
            </label>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {plan.mode === 'dieta' ? (
          <>
            {/* giorni */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {plan.days.map((d, i) => (
                <button key={d.id || i} type="button" onClick={() => { setDayIdx(i); setAltFor(null); }} data-testid={`plan-day-${i}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${i === di ? 'bg-foreground text-background border-foreground' : 'bg-background'}`}>{d.name || `Giorno ${i + 1}`}</button>
              ))}
              <button type="button" onClick={() => { update((p) => { p.days.push(newDay(`Giorno ${p.days.length + 1}`)); }); setDayIdx(plan.days.length); }}
                className="px-3 py-1.5 rounded-lg text-sm border border-dashed text-muted-foreground" data-testid="plan-add-day"><Plus className="w-3.5 h-3.5 inline" /> Giorno</button>
              <span className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => { update((p) => { const c = clone(p.days[di]); c.id = uid(); c.name = `${c.name} (copia)`; p.days.splice(di + 1, 0, c); }); setDayIdx(di + 1); }}><Copy className="w-4 h-4 mr-1" />Duplica</Button>
              {plan.days.length > 1 && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (window.confirm(`Eliminare "${day.name}"?`)) { update((p) => { p.days.splice(di, 1); }); setDayIdx(Math.max(0, di - 1)); } }}><Trash2 className="w-4 h-4 mr-1" />Elimina giorno</Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Nome del giorno</span>
              <Input value={day.name} onChange={(e) => update((p) => { p.days[di].name = e.target.value; })} className="h-8 max-w-xs" data-testid="plan-day-name" />
            </div>

            {/* obiettivi e totali */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border p-3" data-testid="plan-targets">
              {TARGET_FIELDS.map((t) => {
                const target = parseNum(day.targets?.[t.key]);
                const v = totals.day[t.key];
                const pct = target ? Math.min(100, (v / target) * 100) : 0;
                const off = target ? (t.max ? v > target : Math.abs(v - target) / target > 0.08) : false;
                return (
                  <div key={t.key} className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: MACRO_COLORS[t.key] }} />{t.label}</p>
                    <p className="text-lg font-bold tabular-nums leading-none" data-testid={`plan-total-${t.key}`}>{fmt0(v)}<span className="text-xs font-semibold text-muted-foreground"> {t.unit}</span></p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: MACRO_COLORS[t.key] }} /></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">obiettivo</span>
                      <NumBox value={day.targets?.[t.key] ?? ''} onChange={(val) => update((p) => { p.days[di].targets = { ...(p.days[di].targets || {}), [t.key]: val }; })} className="h-7 text-xs" placeholder="—" testid={`plan-target-${t.key}`} />
                    </div>
                    {target ? <p className={`text-[11px] font-semibold ${off ? 'text-amber-600' : 'text-accent'}`}>{t.max ? (v > target ? 'oltre il massimo' : 'ok') : `${v >= target ? '+' : '−'}${fmt0(Math.abs(v - target))} ${t.unit}${off ? '' : ' · ok'}`}</p> : null}
                  </div>
                );
              })}
            </div>

            {/* pasti */}
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/30 border-b">
                    <th className="text-left px-2 py-2 font-semibold w-[28%]">Alimento</th>
                    <th className="text-left px-2 py-2 font-semibold w-[9%]">Grammi</th>
                    <th className="text-left px-2 py-2 font-semibold w-[18%]">Note</th>
                    {COLS.map((c) => <th key={c.key} className="text-right px-2 py-2 font-semibold">{c.label}</th>)}
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody>
                  {day.meals.map((m, mi) => {
                    const mt = totals.meals[mi];
                    return (
                      <React.Fragment key={m.id || mi}>
                        <tr className="bg-muted/40 border-b">
                          <td colSpan={3} className="px-2 py-1.5">
                            <input value={m.name} onChange={(e) => update((p) => { p.days[di].meals[mi].name = e.target.value; })}
                              className="bg-transparent font-bold text-base outline-none w-full" data-testid={`meal-name-${mi}`} />
                          </td>
                          {COLS.map((c) => <td key={c.key} className="px-2 text-right tabular-nums text-xs font-bold">{m.items.length ? fmt(mt[c.key], c.dec) : ''}</td>)}
                          <td className="text-right pr-2">
                            <button type="button" className="text-muted-foreground hover:text-destructive p-1" aria-label={`Elimina ${m.name}`}
                              onClick={() => { if (!m.items.length || window.confirm(`Eliminare il pasto "${m.name}"?`)) update((p) => { p.days[di].meals.splice(mi, 1); }); }}><X className="w-4 h-4" /></button>
                          </td>
                        </tr>
                        {m.items.map((it, ii) => {
                          const v = valuesFor(it.per100, it.grams);
                          const key = `${mi}:${ii}`;
                          const noValues = !Object.values(it.per100 || {}).some((x) => parseNum(x) !== null);
                          return (
                            <React.Fragment key={key}>
                              <tr className="border-b" data-testid={`item-${mi}-${ii}`}>
                                <td className="px-1 py-1">
                                  <div className="flex items-center gap-1">
                                    <FoodPicker foods={foods} value={it.name} onPick={(f) => setItemFood(mi, ii, f)} onFoodAdded={onFoodAdded} className="flex-1" />
                                    {(it.alternatives || []).length > 0 && <span className="text-[10px] font-bold text-accent whitespace-nowrap">⇄ {it.alternatives.length}</span>}
                                  </div>
                                </td>
                                <td className="px-1 py-1">
                                  <div className="flex items-center gap-1"><NumBox value={it.grams ?? ''} onChange={(val) => update((p) => { p.days[di].meals[mi].items[ii].grams = val; })} testid={`item-grams-${mi}-${ii}`} /><span className="text-xs text-muted-foreground">g</span></div>
                                </td>
                                <td className="px-1 py-1">
                                  <input value={it.note || ''} onChange={(e) => update((p) => { p.days[di].meals[mi].items[ii].note = e.target.value; })} placeholder="nota"
                                    className="w-full h-8 px-2 rounded-md border border-transparent hover:border-input focus:border-input bg-transparent text-xs text-muted-foreground outline-none" />
                                </td>
                                {COLS.map((c) => <td key={c.key} className="px-2 text-right tabular-nums">{noValues ? <span className="text-muted-foreground/40">—</span> : fmt(v[c.key], c.dec)}</td>)}
                                <td className="text-right pr-1 whitespace-nowrap">
                                  <button type="button" disabled={noValues} onClick={() => setAltFor(altFor === key ? null : key)} title="Alternative a pari macro" data-testid={`item-alt-${mi}-${ii}`}
                                    className={`p-1 rounded ${altFor === key ? 'text-accent' : 'text-muted-foreground hover:text-accent'} disabled:opacity-30`}><ArrowLeftRight className="w-4 h-4" /></button>
                                  <button type="button" onClick={() => { update((p) => { p.days[di].meals[mi].items.splice(ii, 1); }); setAltFor(null); }} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Togli"><Trash2 className="w-4 h-4" /></button>
                                </td>
                              </tr>
                              {altFor === key && (
                                <tr><td colSpan={COLS.length + 4} className="px-2">
                                  <AltPanel item={it} foods={foods} onToggle={(a) => toggleAlt(mi, ii, a)} onClose={() => setAltFor(null)} />
                                </td></tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        <tr className="border-b">
                          <td colSpan={COLS.length + 4} className="px-1 py-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Plus className="w-4 h-4 ml-1 flex-shrink-0" />
                              <FoodPicker key={`${mi}-${m.items.length}`} foods={foods} value="" placeholder="Aggiungi alimento…" onPick={(f) => addItem(mi, f)} onFoodAdded={onFoodAdded} className="flex-1 max-w-sm" testid={`add-item-${mi}`} />
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-muted/40 font-bold">
                    <td colSpan={3} className="px-2 py-2 text-right text-sm">TOTALE GIORNATA</td>
                    {COLS.map((c) => <td key={c.key} className="px-2 text-right tabular-nums" data-testid={`day-total-${c.key}`}>{fmt(totals.day[c.key], c.dec)}</td>)}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
              <span>Fibre <b className="text-foreground">{fmt(totals.day.fiber)} g</b> · Saturi <b className="text-foreground">{fmt(totals.day.saturated)} g</b> · Sodio <b className="text-foreground">{fmt0(totals.day.sodium)} mg</b></span>
              <Button variant="outline" size="sm" onClick={() => update((p) => { p.days[di].meals.push({ id: uid(), name: 'Nuovo pasto', items: [] }); })}><Plus className="w-4 h-4 mr-1" />Aggiungi pasto</Button>
            </div>
          </>
        ) : (
          <MacroMode plan={plan} update={update} foods={foods} eqSearch={eqSearch} setEqSearch={setEqSearch} />
        )}

        <div>
          <p className="text-sm font-semibold mb-1">Note per l'atleta</p>
          <textarea value={plan.notes || ''} onChange={(e) => update((p) => { p.notes = e.target.value; })} rows={3} data-testid="plan-notes"
            placeholder="Es. pesa gli alimenti a crudo, verdura libera, 2 litri d'acqua al giorno…" className="w-full rounded-md border bg-transparent p-2 text-sm" />
        </div>
        {!foods.length && <p className="text-xs text-amber-600">Il database alimenti è vuoto: aggiungili dalla scheda “Alimenti” della dashboard (import da Notion o ricerca CREA).</p>}
      </CardContent>
    </Card>
  );
};

// ------------------------------------------------------------------ solo macro
const MacroMode = ({ plan, update, foods, eqSearch, setEqSearch }) => {
  const m = plan.macro;
  const ref = m.days[0] || {};
  const splitSum = m.split.reduce((a, s) => a + (parseNum(s.pct) || 0), 0);
  const suggest = (ei) => update((p) => {
    const e = p.macro.equivalents[ei];
    const cands = uniqueByValues(foods.filter((f) => dominantMacro(f) === e.macro && parseNum(f[e.macro]) > 0))
      .map((f) => ({ f, share: (parseNum(f[e.macro]) * (e.macro === 'fat' ? 9 : 4)) / Math.max(parseNum(f.kcal) || kcalFromMacros(f), 1) }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 6);
    e.items = cands.map(({ f }) => ({ id: f.id, name: f.name }));
  });
  return (
    <div className="space-y-5" data-testid="macro-mode">
      <div className="grid gap-4 md:grid-cols-2">
        {m.days.map((d, i) => {
          const k = kcalFromMacros(d);
          const pc = k ? ((parseNum(d.protein) || 0) * 4 / k) * 100 : 0;
          const cc = k ? ((parseNum(d.carbs) || 0) * 4 / k) * 100 : 0;
          const gc = k ? ((parseNum(d.fat) || 0) * 9 / k) * 100 : 0;
          return (
            <div key={d.id || i} className="rounded-xl border p-4 space-y-2" data-testid={`macro-day-${i}`}>
              <div className="flex items-center gap-2">
                <Input value={d.name} onChange={(e) => update((p) => { p.macro.days[i].name = e.target.value; })} className="h-8 font-semibold" />
                {m.days.length > 1 && <Button variant="ghost" size="icon" onClick={() => update((p) => { p.macro.days.splice(i, 1); })} aria-label="Elimina"><Trash2 className="w-4 h-4" /></Button>}
              </div>
              {[['protein', 'Proteine'], ['carbs', 'Carboidrati'], ['sugars', 'di cui zuccheri (max)'], ['fat', 'Grassi'], ['fiber', 'Fibre (min)']].map(([key, label]) => (
                <div key={key} className="grid grid-cols-[1fr_96px] items-center gap-3 border-b last:border-0 py-1">
                  <span className="text-sm font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ background: MACRO_COLORS[key] }} />{label}</span>
                  <div className="flex items-center gap-1"><NumBox value={d[key] ?? ''} onChange={(v) => update((p) => { p.macro.days[i][key] = v; })} testid={`macro-${i}-${key}`} /><span className="text-xs text-muted-foreground">g</span></div>
                </div>
              ))}
              <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-4">
                <div><p className="text-xs text-muted-foreground font-semibold">Calorie (calcolate)</p><p className="text-2xl font-bold tabular-nums" data-testid={`macro-kcal-${i}`}>{fmt0(k)} <span className="text-xs text-muted-foreground">kcal</span></p></div>
                <div className="flex-1">
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                    <i style={{ width: `${pc}%`, background: MACRO_COLORS.protein }} /><i style={{ width: `${cc}%`, background: MACRO_COLORS.carbs }} /><i style={{ width: `${gc}%`, background: MACRO_COLORS.fat }} />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold mt-1">
                    <span style={{ color: MACRO_COLORS.protein }}>P {fmt0(pc)}%</span><span style={{ color: MACRO_COLORS.carbs }}>C {fmt0(cc)}%</span><span style={{ color: MACRO_COLORS.fat }}>G {fmt0(gc)}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {m.days.length < 4 && <Button variant="outline" size="sm" onClick={() => update((p) => { p.macro.days.push({ id: uid(), name: `Giorno ${p.macro.days.length + 1}` }); })}><Plus className="w-4 h-4 mr-1" />Aggiungi tipo di giorno</Button>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border p-4">
          <p className="font-semibold">Suddivisione nei pasti <span className="text-xs font-normal text-muted-foreground">(facoltativa · calcolata su “{ref.name}”)</span></p>
          <table className="w-full text-sm mt-2">
            <thead><tr className="text-[11px] uppercase text-muted-foreground"><th className="text-left py-1">Pasto</th><th className="text-right w-20">%</th><th className="text-right">P</th><th className="text-right">C</th><th className="text-right">G</th><th /></tr></thead>
            <tbody>
              {m.split.map((s, i) => {
                const f = (parseNum(s.pct) || 0) / 100;
                return (
                  <tr key={i} className="border-t">
                    <td className="py-1"><input value={s.meal} onChange={(e) => update((p) => { p.macro.split[i].meal = e.target.value; })} className="bg-transparent outline-none font-medium w-full" /></td>
                    <td className="py-1"><NumBox value={s.pct ?? ''} onChange={(v) => update((p) => { p.macro.split[i].pct = v; })} className="h-7" /></td>
                    <td className="text-right tabular-nums">{fmt0((parseNum(ref.protein) || 0) * f)}</td>
                    <td className="text-right tabular-nums">{fmt0((parseNum(ref.carbs) || 0) * f)}</td>
                    <td className="text-right tabular-nums">{fmt0((parseNum(ref.fat) || 0) * f)}</td>
                    <td className="text-right"><button type="button" onClick={() => update((p) => { p.macro.split.splice(i, 1); })} className="p-1 text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs font-semibold ${Math.round(splitSum) === 100 || splitSum === 0 ? 'text-muted-foreground' : 'text-amber-600'}`}>Totale {fmt0(splitSum)}%{Math.round(splitSum) !== 100 && splitSum !== 0 ? ' (dovrebbe fare 100%)' : ''}</span>
            <Button variant="ghost" size="sm" onClick={() => update((p) => { p.macro.split.push({ meal: 'Pasto', pct: 0 }); })}><Plus className="w-4 h-4 mr-1" />Pasto</Button>
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-3" data-testid="equivalents">
          <div>
            <p className="font-semibold">Fonti e porzioni equivalenti</p>
            <p className="text-xs text-muted-foreground">Calcolate dal tuo database: finiscono nel PDF e nell'app dell'atleta.</p>
          </div>
          {m.equivalents.map((e, ei) => {
            const q = eqSearch[ei] || '';
            const matches = q.trim() ? foods.filter((f) => norm(f.name).includes(norm(q)) && !e.items.some((x) => norm(x.name) === norm(f.name))).slice(0, 6) : [];
            return (
              <div key={e.macro} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: MACRO_COLORS[e.macro] }} />
                  <div className="w-16"><NumBox value={e.amount ?? ''} onChange={(v) => update((p) => { p.macro.equivalents[ei].amount = v; })} className="h-7" testid={`eq-amount-${e.macro}`} /></div>
                  <span className="text-sm font-semibold">g di {MACRO_LABEL[e.macro]} =</span>
                  <span className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => suggest(ei)} disabled={!foods.length} data-testid={`eq-suggest-${e.macro}`}><Wand2 className="w-3.5 h-3.5 mr-1" />Suggerisci</Button>
                </div>
                <div className="mt-2 divide-y">
                  {e.items.map((it, ii) => {
                    const f = foods.find((x) => x.id === it.id) || foods.find((x) => norm(x.name) === norm(it.name));
                    const g = f ? gramsForMacro(f, e.macro, e.amount) : it.grams;
                    return (
                      <div key={it.name} className="flex items-center justify-between py-1 text-sm">
                        <span className="truncate">{it.name}</span>
                        <span className="flex items-center gap-2"><b className="tabular-nums">{g ? `${g} g` : '—'}</b>
                          <button type="button" onClick={() => update((p) => { p.macro.equivalents[ei].items.splice(ii, 1); })} className="p-0.5 text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button></span>
                      </div>
                    );
                  })}
                </div>
                <div className="relative mt-2">
                  <Input value={q} onChange={(ev) => setEqSearch({ ...eqSearch, [ei]: ev.target.value })} placeholder="+ aggiungi fonte dal database" className="h-8 text-sm" />
                  {matches.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-lg border bg-popover shadow p-1">
                      {matches.map((f) => (
                        <button key={f.id} type="button" className="w-full text-left px-2 py-1 rounded hover:bg-muted text-sm"
                          onClick={() => { update((p) => { p.macro.equivalents[ei].items.push({ id: f.id, name: f.name }); }); setEqSearch({ ...eqSearch, [ei]: '' }); }}>{f.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DietPlanEditor;
