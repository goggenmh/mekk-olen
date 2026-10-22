/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_PIN_SALT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Inter-pakken har ingen typefil; importen er berre CSS.
declare module '@fontsource-variable/inter';
