/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Base URL of the Kinesis Cars REST API, e.g. http://localhost:8080/x/cars/ */
  readonly PUBLIC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
