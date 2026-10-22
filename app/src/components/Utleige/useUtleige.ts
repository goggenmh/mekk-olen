import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from '../../lib/toast';
import { erOktaFeil, feilTekst, type UtleigeEining, type UtleigeInnstillingar, type UtleigeKunde, type UtleigeProdukt, type UtleigeReservasjon, type UtleigeSperre, type PrisSvar, type ReturSjekk } from '../../lib/utleige';

const tal = (v: unknown) => (v == null ? null : Number(v));
const mapProdukt = (r: Record<string, unknown>): UtleigeProdukt => ({
  ...(r as unknown as UtleigeProdukt),
  dogn_pris: Number(r.dogn_pris), halvdag_pris: tal(r.halvdag_pris), helg_pris: tal(r.helg_pris),
  gebyr: Number(r.gebyr), depositum: Number(r.depositum), tilbehor: (r.tilbehor as string[]) || [],
});
const mapRes = (r: Record<string, unknown>): UtleigeReservasjon => ({
  ...(r as unknown as UtleigeReservasjon),
  pris_leige: Number(r.pris_leige), gebyr: Number(r.gebyr), depositum: Number(r.depositum), pris_total: Number(r.pris_total),
});

/**
 * All utleigedata for butikken til den innlogga, med live-oppdatering.
 * Lesing og skriving går mot tabellane (tilgangsreglane i databasen avgjer
 * kven som får gjere kva); retur går via utleige_retur.
 */
export function useUtleige() {
  const [lastar, setLastar] = useState(true);
  const [feil, setFeil] = useState<string | null>(null);
  const [produkt, setProdukt] = useState<UtleigeProdukt[]>([]);
  const [einingar, setEiningar] = useState<UtleigeEining[]>([]);
  const [kundar, setKundar] = useState<UtleigeKunde[]>([]);
  const [reservasjonar, setReservasjonar] = useState<UtleigeReservasjon[]>([]);
  const [sperrer, setSperrer] = useState<UtleigeSperre[]>([]);
  const [innstillingar, setInnstillingar] = useState<UtleigeInnstillingar | null>(null);

  const hent = useCallback(async () => {
    const kjor = () => Promise.all([
      supabase.from('utleige_produkt').select('*').order('sortering').order('namn'),
      supabase.from('utleige_eining').select('*').order('kode'),
      supabase.from('utleige_kunde').select('*').order('namn'),
      supabase.from('utleige_reservasjon').select('*').order('start', { ascending: false }),
      supabase.from('utleige_sperre').select('*'),
      supabase.from('utleige_innstillingar').select('*').limit(1).maybeSingle(),
    ]);
    let svar = await kjor();
    let forste = svar.find((x) => x.error)?.error;
    // Utgått økt (t.d. etter at mobilen har vore i bakgrunnen): då går kalla ut
    // som «anon» og blir avviste. Forny tokenet og prøv éin gong til.
    if (forste && erOktaFeil(forste)) {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) { svar = await kjor(); forste = svar.find((x) => x.error)?.error; }
    }
    const [p, e, k, r, s, i] = svar;
    if (forste) { setFeil(feilTekst(forste)); setLastar(false); return; }
    setProdukt((p.data || []).map(mapProdukt));
    setEiningar((e.data || []) as UtleigeEining[]);
    setKundar((k.data || []) as UtleigeKunde[]);
    setReservasjonar((r.data || []).map(mapRes));
    setSperrer((s.data || []) as UtleigeSperre[]);
    setInnstillingar((i.data as UtleigeInnstillingar) ?? null);
    setFeil(null);
    setLastar(false);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(hent, 0);
    const kanal = supabase.channel('utleige-live');
    for (const table of ['utleige_produkt', 'utleige_eining', 'utleige_reservasjon', 'utleige_sperre', 'utleige_kunde']) {
      kanal.on('postgres_changes', { event: '*', schema: 'public', table }, () => { clearTimeout(timer); timer = setTimeout(hent, 300); });
    }
    kanal.subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(kanal); };
  }, [hent]);

  // Køyr ein skriveoperasjon: vis feil som toast og kast vidare, hent på nytt.
  const gjer = async <T,>(fn: () => PromiseLike<{ data: T; error: unknown }>, ok?: string): Promise<T> => {
    const { data, error } = await fn();
    if (error) { const m = feilTekst(error); toast(m, 'feil'); throw new Error(m); }
    if (ok) toast(ok);
    await hent();
    return data;
  };

  const lagreProdukt = (p: Omit<UtleigeProdukt, 'id'> & { id?: string }) => {
    const { id, ...rad } = p;
    return gjer(() => (id ? supabase.from('utleige_produkt').update(rad).eq('id', id).select().single() : supabase.from('utleige_produkt').insert(rad).select().single()), 'Utstyr lagra')
      .then((d) => mapProdukt(d as Record<string, unknown>));
  };
  const slettProdukt = (id: string) => gjer(() => supabase.from('utleige_produkt').delete().eq('id', id), 'Utstyr sletta');

  const lagreEining = (e: Omit<UtleigeEining, 'id'> & { id?: string }) => {
    const { id, ...rad } = e;
    return gjer(() => (id ? supabase.from('utleige_eining').update(rad).eq('id', id) : supabase.from('utleige_eining').insert(rad)), 'Eining lagra');
  };
  const slettEining = (id: string) => gjer(() => supabase.from('utleige_eining').delete().eq('id', id), 'Eining sletta');

  const lastOppBilete = async (fil: File): Promise<string> => {
    const { data: butikk } = await supabase.rpc('min_butikk');
    const reint = fil.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_');
    const sti = `${butikk}/${Date.now()}-${reint}`;
    const { error } = await supabase.storage.from('utleige').upload(sti, fil, { contentType: fil.type, upsert: false });
    if (error) { toast('Kunne ikkje laste opp biletet', 'feil'); throw error; }
    return supabase.storage.from('utleige').getPublicUrl(sti).data.publicUrl;
  };

  const pris = useCallback(async (produktId: string, start: string, slutt: string) => {
    const { data, error } = await supabase.rpc('utleige_pris', { p_produkt: produktId, p_start: start, p_slutt: slutt });
    if (error) throw new Error(feilTekst(error));
    return data as PrisSvar;
  }, []);

  /** Ny reservasjon frå butikken (t.d. kunde i disken). */
  const nyReservasjon = async (r: { produkt_id: string; eining_id: string; start: string; slutt: string; status: UtleigeReservasjon['status']; kunde: { namn: string; telefon: string; epost: string }; internt_notat: string }) => {
    const tlf = r.kunde.telefon.replace(/[^0-9+]/g, '');
    const { data: kunde, error: kFeil } = await supabase.from('utleige_kunde')
      .upsert({ namn: r.kunde.namn.trim(), telefon: tlf, epost: r.kunde.epost.trim().toLowerCase() }, { onConflict: 'butikk_id,telefon' }).select().single();
    if (kFeil) { const m = feilTekst(kFeil); toast(m, 'feil'); throw new Error(m); }
    const p = await pris(r.produkt_id, r.start, r.slutt);
    return gjer(() => supabase.from('utleige_reservasjon').insert({
      produkt_id: r.produkt_id, eining_id: r.eining_id, kunde_id: kunde.id, start: r.start, slutt: r.slutt, status: r.status,
      pris_leige: p.leige, gebyr: p.gebyr, depositum: p.depositum, pris_total: p.total, internt_notat: r.internt_notat,
    }), 'Reservasjon lagra');
  };

  /** Endre periode/eining: prisen blir rekna på nytt frå prisreglane. */
  const endreReservasjon = async (r: UtleigeReservasjon, endring: { start: string; slutt: string; eining_id: string; produkt_id: string }) => {
    const p = await pris(endring.produkt_id, endring.start, endring.slutt);
    return gjer(() => supabase.from('utleige_reservasjon').update({
      ...endring, pris_leige: p.leige, gebyr: p.gebyr, depositum: p.depositum, pris_total: p.total,
    }).eq('id', r.id), 'Reservasjonen er endra');
  };

  const settStatus = (r: UtleigeReservasjon, status: UtleigeReservasjon['status'], melding: string) =>
    gjer(() => supabase.from('utleige_reservasjon').update({ status }).eq('id', r.id), melding);

  const lagreNotat = (r: UtleigeReservasjon, internt_notat: string) =>
    gjer(() => supabase.from('utleige_reservasjon').update({ internt_notat }).eq('id', r.id), 'Notat lagra');

  const retur = (r: UtleigeReservasjon, sjekk: ReturSjekk, vedlikehald: boolean, notat: string) =>
    gjer(() => supabase.rpc('utleige_retur', { p_res: r.id, p_sjekk: sjekk, p_vedlikehald: vedlikehald, p_notat: notat }),
      vedlikehald ? 'Returnert – eininga er sperra og ei oppgåve er laga' : 'Returnert');

  const nySperre = (s: Omit<UtleigeSperre, 'id' | 'oppgave_id'>) =>
    gjer(() => supabase.from('utleige_sperre').insert(s), 'Sperre lagra');
  const slettSperre = (id: string) => gjer(() => supabase.from('utleige_sperre').delete().eq('id', id), 'Sperre fjerna');
  const frigjer = (einingId: string) => gjer(() => supabase.rpc('utleige_frigjer', { p_eining: einingId }), 'Eininga er tilgjengeleg igjen');

  const lagreKunde = (k: UtleigeKunde) =>
    gjer(() => supabase.from('utleige_kunde').update({ namn: k.namn, telefon: k.telefon, epost: k.epost, notat: k.notat }).eq('id', k.id), 'Kunde lagra');

  const lagreInnstillingar = (i: UtleigeInnstillingar) => {
    const { butikk_id, ...rad } = i;
    return gjer(() => supabase.from('utleige_innstillingar').update({ ...rad, updated_at: new Date().toISOString() }).eq('butikk_id', butikk_id), 'Innstillingar lagra');
  };

  return {
    lastar, feil, produkt, einingar, kundar, reservasjonar, sperrer, innstillingar, hent,
    lagreProdukt, slettProdukt, lagreEining, slettEining, lastOppBilete, pris,
    nyReservasjon, endreReservasjon, settStatus, lagreNotat, retur, nySperre, slettSperre, frigjer, lagreKunde, lagreInnstillingar,
  };
}

export type UtleigeData = ReturnType<typeof useUtleige>;
