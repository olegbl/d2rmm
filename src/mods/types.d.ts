import { ConsoleAPI } from '../bridge/ConsoleAPI';
import { ModAPI } from '../bridge/ModAPI';
import { ModConfigValue } from '../bridge/ModConfigValue';

declare global {
  /**
   * The config for the mod, as set by the user, with default values filled in.
   */
  const config: ModConfigValue;

  /**
   * The global console object. It works similarly to the one provided by DOM or Node.
   */
  // @ts-ignore[2649]: overriding global console
  const console: ConsoleAPI;

  /**
   * The D2RMM API. Use this to interact with the game's files.
   */
  const D2RMM: ModAPI;
}
