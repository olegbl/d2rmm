import { useCallback, useState } from 'react';

const API = window.electron.API;

function getMods(): Mod[] {
  const modIDs = API.readModDirectory();
  return modIDs
    .map((modID) => {
      const info = API.readModInfo(modID);

      if (info == null) {
        return null;
      }

      const config = API.readModConfig(modID) as unknown as ModConfigValue;

      const defaultConfig = info.config?.reduce((agg, field) => {
        agg[field.id] = field.defaultValue as unknown as ModConfigSingleValue;
        return agg;
      }, {} as ModConfigValue);

      return {
        id: modID,
        info,
        config: { ...defaultConfig, ...config },
      };
    })
    .filter((mod): mod is Mod => mod != null);
}

export default function useMods(): [Mod[], () => unknown] {
  const [mods, setMods] = useState<Mod[]>(() => getMods());

  // manually refresh mods
  const refreshMods = useCallback(() => {
    setMods(getMods());
  }, []);

  return [mods, refreshMods];
}
