export type ILocaleAPI = {
  /**
   * Sets t he currently active locale (and persists the change to disk).
   */
  setLocale(locale: string): Promise<void>;

  /**
   * Returns the currently active locale.
   */
  getLocale(): string;
};
