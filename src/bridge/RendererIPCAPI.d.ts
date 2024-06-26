export interface IRendererIPCAPI {
  /**
   * Disconnected from the IPC bridge, removing all listeners.
   */
  disconnect: () => Promise<void>;
}
