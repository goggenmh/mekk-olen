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

  const naviger = useCallback((mål: string) => {
    skrivSti(mål);
    setSti(mål);
    window.scrollTo(0, 0);
  }, []);

  return sti.startsWith('/utleige/mi-side')
    ? <MiSide naviger={naviger} />
    : <UtleigeSide naviger={naviger} />;
}
