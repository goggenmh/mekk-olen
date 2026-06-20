import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Manglar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Sjå supabase/SETUP.md for oppsett.'
  );
}

export const supabase = createClient(url || '', anonKey || '');

/** Non-secret salt mixed into the PIN to form the Supabase Auth password. See SETUP.md. */
export const PIN_SALT = (import.meta.env.VITE_APP_PIN_SALT as string) || 'mekk-olen-';

export const pinToPassword = (pin: string) => `${PIN_SALT}${pin}`;
