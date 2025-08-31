export {};

declare global {
  interface Window {
    env: {
      platform: string;
    };
  }
}
