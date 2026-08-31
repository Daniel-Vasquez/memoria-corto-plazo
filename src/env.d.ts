/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly MONGODB_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
