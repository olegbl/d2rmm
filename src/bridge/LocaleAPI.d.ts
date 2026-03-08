export type ILocaleAPI = {
  /**
   * Persists the selected locale to disk (d2rmm-locale.json) so the main
   * process and future worker instances can read it at startup.
   */
  setLocale(locale: string): Promise<void>;

  /**
   * Returns the currently active locale for the worker process.
   */
  getLocale(): Promise<string>;
};
