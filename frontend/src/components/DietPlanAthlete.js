import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, X, Calculator, Loader2 } from 'lucide-react';
import { athleteAPI } from '../api';
import { readCache, writeCache, isOnline } from '../lib/offline';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  MACRO_COLORS, MACRO_LABEL, fmt, fmt0, parseNum, valuesFor, sumValues, per100Of, kcalFromMacros,
  alternativesFor, gramsForMacro, searchFoods, norm, CREA_CITATION,
} from '../lib/foods';

// ------------------------------------------------------------------ alternative (foglio dal basso)
const AltSheet = ({ item, onClose }) => {
  const coach = item.alternatives || [];
  const seen = new Set(coach.map((a) => norm(a.name)));
  const more = (item.suggestions || []).filter((a) => !seen.has(norm(a.name)));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="alt-sheet">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-2xl p-4 pb-8 shadow-2xl max-h-[75vh] overflow-y-auto">
        <div className="w-10 h-1.5 rounded-full bg-muted mx-auto mb-3" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold flex items-center gap-1.5"><ArrowLeftRight className="w-4 h-4" />Al posto di {item.name}{item.grams ? ` ${fmt0(item.grams)} g` : ''}</p>
            <p className="text-xs text-muted-foreground">Stesso macro principale, calorie simili</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground" aria-label="Chiudi"><X className="w-5 h-5" /></button>
        </div>
        <div className="mt-2 divide-y">
          {[...coach.map((a) => ({ ...a, coach: true })), ...more].map((a) => (
            <div key={a.name} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0"><b>{a.name}</b>{a.coach && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent">consigliata dal coach</span>}</span>
              <span className="whitespace-nowrap"><b>{a.grams ? `${a.grams} g` : '—'}</b>{a.kcal ? <span className="text-xs text-muted-foreground"> {fmt0(a.kcal)} kcal</span> : null}</span>
            </div>
          ))}
          {!coach.length && !more.length && <p className="text-sm text-muted-foreground py-3">Nessuna alternativa per questo alimento.</p>}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ calcolatore porzioni
const PortionCalculator = () => {
  const [foods, setFoods] = useState(() => readCache('foods')?.data || []);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('40');
  const [macro, setMacro] = useState('carbs');
  const [q, setQ] = useState('');
  const [food, setFood] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isOnline()) return;
    setLoading(!foods.length);
    athleteAPI.getFoods()
      .then((r) => { setFoods(r.data || []); writeCache('foods', r.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const candidates = useMemo(() => foods.filter((f) => parseNum(f[macro]) > 0), [foods, macro]);
  const matches = open && q.trim() ? searchFoods(candidates, q, 6) : [];
  const grams = food ? gramsForMacro(food, macro, amount) : null;
  const v = food && grams ? valuesFor(per100Of(food), grams) : null;
  const others = useMemo(() => {
    if (!food || !grams) return [];
    return alternativesFor({ name: food.name, grams, per100: per100Of(food) }, candidates, 4);
  }, [food, grams, candidates]);
  const usesCrea = foods.some((f) => f.source === 'CREA');

  return (
    <Card data-testid="portion-calc">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" />Quanto ne devo mangiare?</CardTitle>
        <p className="text-xs text-muted-foreground">Scegli quanti grammi di un macro vuoi e da quale alimento</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carico gli alimenti…</p>}
        {!loading && !foods.length && <p className="text-sm text-muted-foreground">Gli alimenti non sono ancora disponibili{isOnline() ? '' : ' (serve la connessione la prima volta)'}.</p>}
        {foods.length > 0 && (
          <>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-1">VOGLIO</p>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 w-28">
                  <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="calc-amount"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 font-bold text-right" /><span className="text-sm text-muted-foreground">g</span>
                </div>
                <select value={macro} onChange={(e) => { setMacro(e.target.value); setFood(null); setQ(''); }} data-testid="calc-macro"
                  className="h-10 flex-1 rounded-lg border border-input bg-background px-3 font-semibold">
                  <option value="carbs">di carboidrati</option>
                  <option value="protein">di proteine</option>
                  <option value="fat">di grassi</option>
                </select>
              </div>
            </div>
            <div className="relative">
              <p className="text-[11px] font-bold text-muted-foreground mb-1">DA</p>
              <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Cerca un alimento (es. riso)" data-testid="calc-food"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 font-semibold" />
              {matches.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border bg-popover shadow-lg p-1">
                  {matches.map((f) => (
                    <button key={f.id || f.name} type="button" onClick={() => { setFood(f); setQ(f.name); setOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm flex justify-between gap-2">
                      <span className="truncate">{f.name}</span><span className="text-xs text-muted-foreground">{fmt(f[macro])} g/100 g</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {food && grams && v && (
              <div className="rounded-xl bg-accent/10 p-3 text-center" data-testid="calc-result">
                <p className="text-3xl font-extrabold text-accent">{grams} g</p>
                <p className="text-xs">di {food.name} · {fmt0(v.kcal)} kcal · C {fmt(v.carbs)} · P {fmt(v.protein)} · G {fmt(v.fat)}</p>
              </div>
            )}
            {others.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">Oppure, sempre {fmt(parseNum(amount))} g di {MACRO_LABEL[macro]}</p>
                <div className="divide-y rounded-lg border">
                  {others.map((a) => (
                    <div key={a.name} className="flex justify-between px-3 py-2 text-sm"><span className="truncate">{a.name}</span><span><b>{a.grams} g</b> <span className="text-xs text-muted-foreground">{fmt0(a.kcal)} kcal</span></span></div>
                  ))}
                </div>
              </div>
            )}
            {usesCrea && <p className="text-[10px] text-muted-foreground">{CREA_CITATION}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ------------------------------------------------------------------ vista atleta
const DietPlanAthlete = ({ plan }) => {
  const [dayIdx, setDayIdx] = useState(0);
  const [sheet, setSheet] = useState(null);
  const isMacro = plan.mode === 'macro';
  const days = isMacro ? (plan.macro?.days || []) : (plan.days || []).filter((d) => d.meals?.some((m) => m.items?.length));
  const di = Math.min(dayIdx, Math.max(days.length - 1, 0));
  const day = days[di];
  const start = plan.start_date ? new Date(`${plan.start_date}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : null;

  const chips = days.length > 1 && (
    <div className="flex gap-1.5 flex-wrap">
      {days.map((d, i) => (
        <button key={d.id || i} type="button" onClick={() => setDayIdx(i)} data-testid={`athlete-plan-day-${i}`}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border ${i === di ? 'bg-foreground text-background border-foreground' : 'bg-background'}`}>{d.name}</button>
      ))}
    </div>
  );

  if (!day) return <PortionCalculator />;

  if (isMacro) {
    const k = kcalFromMacros(day);
    const split = (plan.macro?.split || []).filter((s) => parseNum(s.pct));
    const ref = days[0] || day;
    const eqs = (plan.macro?.equivalents || []).filter((e) => e.items?.length && e.amount);
    return (
      <div className="space-y-4" data-testid="athlete-plan">
        {chips}
        <Card>
          <CardContent className="pt-5 text-center space-y-3">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">OBIETTIVO {days.length > 1 ? `· ${day.name.toUpperCase()}` : 'DI OGNI GIORNO'}</p>
              <p className="text-4xl font-extrabold tabular-nums" data-testid="athlete-macro-kcal">{fmt0(k)} <span className="text-sm text-muted-foreground">kcal</span></p>
              {start && <p className="text-xs text-muted-foreground">dal {start}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['protein', 'Proteine'], ['carbs', 'Carbo'], ['fat', 'Grassi']].map(([key, label]) => (
                <div key={key} className="rounded-xl border p-2" style={{ borderTop: `3px solid ${MACRO_COLORS[key]}` }}>
                  <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{fmt0(parseNum(day[key]))} g</p>
                </div>
              ))}
            </div>
            {(parseNum(day.sugars) || parseNum(day.fiber)) ? (
              <p className="text-xs text-muted-foreground">{parseNum(day.sugars) ? `Zuccheri max ${fmt0(parseNum(day.sugars))} g` : ''}{parseNum(day.sugars) && parseNum(day.fiber) ? ' · ' : ''}{parseNum(day.fiber) ? `Fibre min ${fmt0(parseNum(day.fiber))} g` : ''}</p>
            ) : null}
          </CardContent>
        </Card>
        {split.length > 0 && (
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-base">Come dividerli</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {split.map((s) => {
                const f = parseNum(s.pct) / 100;
                return (
                  <div key={s.meal} className="flex justify-between py-2 text-sm">
                    <span>{s.meal}</span>
                    <span className="text-muted-foreground text-xs">P <b className="text-foreground">{fmt0((parseNum(ref.protein) || 0) * f)}</b> · C <b className="text-foreground">{fmt0((parseNum(ref.carbs) || 0) * f)}</b> · G <b className="text-foreground">{fmt0((parseNum(ref.fat) || 0) * f)}</b></span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
        {eqs.map((e) => (
          <Card key={e.macro}>
            <CardHeader className="pb-1"><CardTitle className="text-base">{fmt(e.amount)} g di {MACRO_LABEL[e.macro]} =</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {e.items.map((it) => <div key={it.name} className="flex justify-between py-2 text-sm"><span>{it.name}</span><b>{it.grams ? `${it.grams} g` : '—'}</b></div>)}
            </CardContent>
          </Card>
        ))}
        {plan.notes && <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">📝 {plan.notes}</p>}
        <PortionCalculator />
      </div>
    );
  }

  const mealTotals = day.meals.map((m) => sumValues((m.items || []).map((it) => valuesFor(it.per100, it.grams))));
  const tot = sumValues(mealTotals);
  return (
    <div className="space-y-4" data-testid="athlete-plan">
      {chips}
      <div className="grid grid-cols-4 gap-2">
        {[['Kcal', fmt0(tot.kcal)], ['Carbo', `${fmt0(tot.carbs)} g`], ['Prot.', `${fmt0(tot.protein)} g`], ['Grassi', `${fmt0(tot.fat)} g`]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card px-2 py-1.5"><p className="text-[10px] font-bold text-muted-foreground uppercase">{l}</p><p className="font-bold">{v}</p></div>
        ))}
      </div>
      {start && <p className="text-xs text-muted-foreground -mt-2">Piano dal {start}</p>}
      {day.meals.filter((m) => m.items?.length).map((m) => {
        const mt = mealTotals[day.meals.indexOf(m)];
        return (
          <Card key={m.id || m.name} className="overflow-hidden">
            <div className="flex items-baseline justify-between px-4 py-2.5 border-b">
              <p className="font-bold">{m.name}</p><p className="text-xs text-muted-foreground">{fmt0(mt.kcal)} kcal</p>
            </div>
            <div className="divide-y">
              {m.items.map((it, ii) => {
                const hasAlt = (it.alternatives?.length || 0) + (it.suggestions?.length || 0) > 0;
                return (
                  <button key={`${it.name}-${ii}`} type="button" disabled={!hasAlt} onClick={() => setSheet(it)} data-testid={`athlete-item-${ii}`}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left disabled:cursor-default">
                    <span className="min-w-0">
                      <span className="block">{it.name}</span>
                      {it.note && <span className="block text-xs text-muted-foreground">{it.note}</span>}
                    </span>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <b>{it.grams ? `${fmt0(it.grams)} g` : ''}</b>
                      {hasAlt && <ArrowLeftRight className="w-4 h-4 text-accent" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
      <p className="text-[11px] text-muted-foreground">Tocca un alimento con ⇄ per vedere con cosa puoi sostituirlo.</p>
      {plan.notes && <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">📝 {plan.notes}</p>}
      <PortionCalculator />
      {sheet && <AltSheet item={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
};

export default DietPlanAthlete;
