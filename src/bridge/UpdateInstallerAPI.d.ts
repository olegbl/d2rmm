export type IUpdateInstallerAPI = {
  /**
   * Quits the app and runs the provided executable and args.
   */
  quitAndRun: (executablePath: string, args: string[]) => void;
};
