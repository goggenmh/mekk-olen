import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useAnsatte } from '../context/AnsatteContext';
import type { View } from '../lib/view';

export interface NotifItem {
  id: string;
  ikon: string;
  tittel: string;
  tekst: string;
  view: View;
}

export function useNotifications() {
  const { user } = useAuth();
  const { meldinger, swaps, entries, tasks, orders } = useAppData();
  const { isLeder, findAnsatt } = useAnsatte();

  const items = useMemo<NotifItem[]>(() => {
    if (!user) return [];
    const leder = isLeder(user.id);
    const liste: NotifItem[] = [];

    meldinger
      .filter((m) => m.til === null || m.til === user.id)
      .forEach((m) => liste.push({
        id: `melding-${m.id}`,
        ikon: 'mail',
        tittel: `Melding frå ${findAnsatt(m.fra)?.navn ?? m.fra}`,
        tekst: m.tekst,
        view: 'dashbord',
      }));

    swaps
      .filter((s) => s.status === 'pending' && s.til === user.id)
      .forEach((s) => liste.push({
        id: `swap-${s.id}`,
        ikon: 'vaktplan',
        tittel: 'Bytteønske',
        tekst: `${findAnsatt(s.fra)?.navn ?? s.fra} vil bytte vakt ${s.dag} ${s.tid}.`,
        view: 'vaktplan',
      }));

    if (leder) {
      const venterTimar = entries.filter((e) => e.status === 'venter').length;
      if (venterTimar > 0) liste.push({
        id: 'timeliste-venter',
        ikon: 'timeliste',
        tittel: 'Timar til godkjenning',
        tekst: `${venterTimar} time-rad${venterTimar === 1 ? '' : 'er'} venter på godkjenning.`,
        view: 'timeliste',
      });

      const ufordelt = tasks.filter((t) => t.ansatt === 'ufordelt' && !t.ferdig).length;
      if (ufordelt > 0) liste.push({
        id: 'oppgaver-ufordelt',
        ikon: 'oppgaver',
        tittel: 'Ufordelte oppgåver',
        tekst: `${ufordelt} oppgåve${ufordelt === 1 ? '' : 'r'} er ikkje fordelt.`,
        view: 'oppgaver',
      });

      const komne = orders.filter((o) => o.status === 'komen' && !o.varsla).length;
      if (komne > 0) liste.push({
        id: 'bestilling-komen',
        ikon: 'bestilling',
        tittel: 'Bestilling komen',
        tekst: `${komne} bestilling${komne === 1 ? '' : 'ar'} venter på å bli varsla kunden.`,
        view: 'bestilling',
      });
    }

    return liste;
  }, [user, meldinger, swaps, entries, tasks, orders, isLeder, findAnsatt]);

  return { items, count: items.length };
}
