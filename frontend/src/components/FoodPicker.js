import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Database } from 'lucide-react';
import { toast } from 'sonner';
import { adminAPI } from '../api';
import { searchFoods, fmt0, fmt } from '../lib/foods';

/**
 * Campo "alimento" con suggerimenti dal database del coach.
 * Se l'alimento non c'è: cerca sul CREA (e lo aggiunge al database) oppure usa il testo libero.
 */
const FoodPicker = ({ foods, value = '', onPick, onFoodAdded, placeholder = 'Scrivi un alimento…', autoFocus = false, testid, className = '' }) => {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);
  const [crea, setCrea] = useState(null); // null | {loading} | {results}
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => { setQ(value); }, [value]);
  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setCrea(null); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const local = open && q.trim() ? searchFoods(foods, q, 8) : [];
  const options = [
    ...local.map((f) => ({ type: 'food', f })),
    ...(crea?.results || []).map((r) => ({ type: 'crea', r })),
  ];

  const pick = (food) => { onPick(food); setQ(food.name); setOpen(false); setCrea(null); };
  const pickFree = () => { const name = q.trim(); if (!name) return; onPick({ name, free: true }); setOpen(false); setCrea(null); };

  const searchCrea = async () => {
    setCrea({ loading: true });
    try {
      const r = await adminAPI.searchCrea(q.trim());
      setCrea({ results: r.data.results || [] });
      setHi(local.length);
    } catch (e) {
      setCrea({ results: [], error: e.response?.data?.detail || 'Ricerca CREA non riuscita' });
    }
  };

  const pickCrea = async (r) => {
    setCrea({ ...crea, adding: r.code });
    try {
      const res = await adminAPI.addFoodFromCrea(r.code);
      onFoodAdded && onFoodAdded(res.data);
      toast.success(`${res.data.name} aggiunto dal CREA al tuo database`);
      pick(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Non riuscito');
      setCrea({ ...crea, adding: null });
    }
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, Math.max(options.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const o = options[hi];
      if (o?.type === 'food') pick(o.f); else if (o?.type === 'crea') pickCrea(o.r); else if (q.trim()) pickFree();
    } else if (e.key === 'Escape') { setOpen(false); setCrea(null); }
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <input value={q} autoFocus={autoFocus} placeholder={placeholder} data-testid={testid}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); setCrea(null); }}
        onFocus={() => setOpen(true)} onKeyDown={onKey}
        className="w-full h-8 px-2 rounded-md border border-transparent hover:border-input focus:border-input bg-transparent focus:bg-background outline-none font-medium" />
      {open && q.trim() && (
        <div className="absolute z-30 left-0 top-full mt-1 w-[340px] max-w-[85vw] rounded-xl border bg-popover text-popover-foreground shadow-lg p-1 text-sm" data-testid={testid ? `${testid}-menu` : undefined}>
          {local.map((f, i) => (
            <button key={f.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(f)}
              className={`w-full flex justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left ${hi === i ? 'bg-accent/10' : 'hover:bg-muted'}`}>
              <span className="truncate font-medium">{f.name}{f.source === 'CREA' && <span className="ml-1.5 text-[9px] font-bold text-accent">CREA</span>}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">{fmt0(f.kcal)} kcal · P {fmt(f.protein)}</span>
            </button>
          ))}
          {crea?.loading && <div className="px-2.5 py-2 text-muted-foreground flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Cerco sul CREA…</div>}
          {crea?.error && <div className="px-2.5 py-2 text-destructive text-xs">{crea.error}</div>}
          {crea?.results && !crea.results.length && !crea.error && <div className="px-2.5 py-2 text-muted-foreground text-xs">Nessun risultato CREA</div>}
          {(crea?.results || []).map((r, j) => (
            <button key={r.code} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickCrea(r)} disabled={!!crea.adding}
              className={`w-full flex justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left ${hi === local.length + j ? 'bg-accent/10' : 'hover:bg-muted'}`}>
              <span className="truncate">{r.name}</span>
              <span className="text-[10px] font-bold text-accent flex-shrink-0">{crea.adding === r.code ? <Loader2 className="w-3 h-3 animate-spin" /> : `CREA ${r.code}`}</span>
            </button>
          ))}
          <div className="border-t mt-1 pt-1">
            {!crea && (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={searchCrea} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-accent font-semibold hover:bg-muted" data-testid={testid ? `${testid}-crea` : undefined}>
                <Database className="w-3.5 h-3.5" />Cerca “{q.trim()}” sul CREA
              </button>
            )}
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={pickFree} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-muted-foreground hover:bg-muted">
              <Search className="w-3.5 h-3.5" />Usa “{q.trim()}” senza valori (es. verdura libera)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodPicker;
