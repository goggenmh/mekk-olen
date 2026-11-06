import { createContext, useContext } from 'react';
import { type Employee, type EmployeeId, type Butikk } from '../constants';

// Konteksten, hooken og hjelparane (ingen komponentar) så react-refresh/HMR
// verkar reint for AnsatteProvider-fila.

/** Private lønsfelt: berre leiarar (via lonsdata()) og den tilsette sjølv (via min_profil()). */
export const PRIVATE_FELT = ['sats', 'skattetype', 'skatteprosent', 'frikortgrense', 'feriepengesats', 'tidlegare_ar', 'tidlegare_mekk', 'tidlegare_andre'] as const;
export type PrivatFelt = typeof PRIVATE_FELT[number];

export interface AnsatteState {
  loading: boolean;
  ansatte: Employee[];
  alleAnsatte: Employee[];
  /** Alle aktive tilsette på tvers av butikkar – trygg, økt-uavhengig
   *  kjelde til innloggings-skjermen (namn/initial/e-post, ikkje løn). */
  loginAnsatte: Employee[];
  butikkar: Butikk[];
  finnButikk: (id?: string | null) => Butikk | undefined;
  findAnsatt: (id: EmployeeId | null | undefined) => Employee;
  isLeder: (id: EmployeeId | null | undefined) => boolean;
  refreshAnsatte: () => Promise<void>;
  createAnsatt: (input: { navn: string; rolle: string; lonn: 'fast' | 'time'; sats: number; farge: string; init: string; telefon: string; leder: boolean; pin: string; email?: string; butikk_id?: string; konsern_admin?: boolean }) => Promise<string>;
  updateAnsatt: (id: EmployeeId, patch: Partial<Pick<Employee, 'navn' | 'rolle' | 'lonn' | 'farge' | 'init' | 'telefon' | 'leder' | 'feriedagar' | PrivatFelt>>) => Promise<void>;
  setAktiv: (id: EmployeeId, aktiv: boolean) => Promise<void>;
  resetPin: (id: EmployeeId, pin: string) => Promise<void>;
  updateEmail: (id: EmployeeId, email: string) => Promise<void>;
}

export const AnsatteContext = createContext<AnsatteState | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapAnsatt = (r: any): Employee => ({
  id: r.id, navn: r.navn, rolle: r.rolle, lonn: r.lonn, sats: r.sats, farge: r.farge, init: r.init,
  email: r.email, telefon: r.telefon || '', leder: r.leder, aktiv: r.aktiv,
  butikk_id: r.butikk_id ?? undefined, konsern_admin: r.konsern_admin ?? false,
  skattetype: r.skattetype ?? null, skatteprosent: r.skatteprosent ?? null, frikortgrense: r.frikortgrense ?? null, feriedagar: r.feriedagar ?? 25,
  feriepengesats: r.feriepengesats ?? null, tidlegare_ar: r.tidlegare_ar ?? null,
  tidlegare_mekk: r.tidlegare_mekk ?? null, tidlegare_andre: r.tidlegare_andre ?? null,
});

export function useAnsatte() {
  const ctx = useContext(AnsatteContext);
  if (!ctx) throw new Error('useAnsatte must be used within AnsatteProvider');
  return ctx;
}
