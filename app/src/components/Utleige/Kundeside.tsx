import { useCallback, useEffect, useState } from 'react';
import { DEMO, lesSti, skrivSti } from '../../lib/view';
import { UtleigeSide } from './UtleigeSide';
import { MiSide } from './MiSide';

// Offentleg utleige: vel mellom katalogen (/utleige) og «Mi side»
// (/utleige/mi-side) ut frå adressa, og held adressa i synk ved navigering.
// Ligg utanfor tilsett-innlogginga (sjå main.tsx), så kundeøkta lever i fred.
export function Kundeside() {
  const [sti, setSti] = useState(lesSti());

  useEffect(() => {
    const oppdater = () => setSti(lesSti());
    const hending = DEMO ? 'hashchange' : 'popstate';
    window.addEventListener(hending, oppdater);
    return () => window.removeEventListener(hending, oppdater);
  }, []);

  // Kundesida deler index.html med tilsett-appen, så tittel/beskriving er der
  // retta mot dei tilsette. Set rett tittel og meta for utleige, så fane og
  // deling viser kundeteksten.
  useEffect(() => {
    document.title = 'Leige verktøy og maskiner – MEKK Ølen';
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', 'Lei verktøy og maskiner hos MEKK Ølen. Sjekk kva som er ledig, send ein uforpliktande førespurnad og betal når du hentar.');
  }, []);

  const naviger = useCallback((mål: string) => {
    skrivSti(mål);
    setSti(mål);
    window.scrollTo(0, 0);
  }, []);

  return sti.startsWith('/utleige/mi-side')
    ? <MiSide naviger={naviger} />
    : <UtleigeSide naviger={naviger} />;
}
