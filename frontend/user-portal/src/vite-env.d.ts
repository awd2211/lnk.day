/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_USER_SERVICE_URL: string;
  readonly VITE_ANALYTICS_SERVICE_URL: string;
  readonly VITE_QR_SERVICE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
