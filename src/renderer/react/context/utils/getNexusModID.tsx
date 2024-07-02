import type { Mod } from 'bridge/BridgeAPI';

export default function getNexusModID(mod?: Mod | null): string | null {
  return (
    mod?.info?.website?.match(/\/diablo2resurrected\/mods\/(\d+)/)?.[1] ?? null
  );
}
