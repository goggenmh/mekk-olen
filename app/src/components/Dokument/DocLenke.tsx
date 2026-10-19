import type { CSSProperties, ReactNode } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { safeHref } from '../../lib/url';

/**
 * Opnar eit vedlegg via ei signert, kortliva lenke (filene ligg privat).
 * Fana blir opna med ein gong ved klikket, elles stoppar mobilnettlesarar
 * henne som sprettopp-vindauge medan lenka blir laga.
 */
export function DocLenke({ filUrl, children, style }: { filUrl: string; children: ReactNode; style?: CSSProperties }) {
  const { docFileUrl } = useAppData();
  const opne = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fane = window.open('', '_blank');
    const url = safeHref(await docFileUrl(filUrl));
    if (url !== '#' && fane) {
      fane.opener = null;
      fane.location.href = url;
    } else {
      fane?.close();
      window.alert('Kunne ikkje opne fila. Prøv igjen.');
    }
  };
  return (
    <a href="#" onClick={opne} style={style}>
      {children}
    </a>
  );
}
