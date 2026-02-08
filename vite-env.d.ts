/// <reference types="vite/client" />

type ViteEnvString = string | undefined;

interface ImportMetaEnv {
  readonly VITE_API_KEY: ViteEnvString;
  readonly VITE_API_BASE: ViteEnvString;
  readonly VITE_MODEL: ViteEnvString;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
