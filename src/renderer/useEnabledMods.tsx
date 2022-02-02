import { useEffect, useState } from 'react';

const ENABLED_MODS_KEY = 'enabled-mods';

type EnabledMods = { [id: string]: boolean };

export default function useEnabledMods(): [
  EnabledMods,
  React.Dispatch<React.SetStateAction<EnabledMods>>
] {
  const [enabledMods, setEnabledMods] = useState<EnabledMods>(() => {
    try {
      return JSON.parse(localStorage.getItem(ENABLED_MODS_KEY) ?? '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(ENABLED_MODS_KEY, JSON.stringify(enabledMods));
  }, [enabledMods]);

  return [enabledMods, setEnabledMods];
}
