import { useCallback, useEffect, useState } from 'react';

const API = window.electron.API;

function getMods(paths: D2RMMPaths): Mod[] {
  const modIDs = API.readDirectory(paths.modPath, { directoriesOnly: true });
  return modIDs
    .map((modID) => {
      const info = API.readModInfo(paths.modPath, modID);
      console.log(modID, info);

      if (info == null) {
        return null;
      }

      const config = API.readModConfig(
        paths.modPath,
        modID
      ) as unknown as ModConfigValue;

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

export default function useMods(paths: D2RMMPaths): [Mod[], () => unknown] {
  const [mods, setMods] = useState<Mod[]>(() => getMods(paths));

  // automatically refresh mods when paths change
  useEffect(() => {
    setMods(getMods(paths));
  }, [paths]);

  // manually refresh mods
  const refreshMods = useCallback(() => {
    setMods(getMods(paths));
  }, [paths]);

  return [mods, refreshMods];
}
