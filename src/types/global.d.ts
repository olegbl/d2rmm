export {};

declare global {
  interface Window {
    env: {
      platform: string;
      locale: string | null;
    };
  }
}
