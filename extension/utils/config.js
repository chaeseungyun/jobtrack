export const DEV_WEB_ORIGIN = "http://localhost:3000";
export const PROD_WEB_ORIGIN = "https://jobtrack-phi.vercel.app";

export const WEB_ORIGINS = {
  development: DEV_WEB_ORIGIN,
  production: PROD_WEB_ORIGIN,
};

export const DEFAULT_WEB_ENV = "development";

export function getInitialApiBase() {
  return WEB_ORIGINS[DEFAULT_WEB_ENV];
}
