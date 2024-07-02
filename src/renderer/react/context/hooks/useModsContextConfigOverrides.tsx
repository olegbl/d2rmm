import type { ModConfig } from 'bridge/ModConfig';
import useSavedState from 'renderer/react/hooks/useSavedState';

export type IModConfigOverride = Partial<ModConfig>;

export type ISetModConfigOverride = React.Dispatch<
  React.SetStateAction<IModConfigOverride>
>;

export type IModConfigOverrides = Record<string, IModConfigOverride>;

export type ISetModConfigOverrides = React.Dispatch<
  React.SetStateAction<IModConfigOverrides>
>;

export default function useModsContextConfigOverrides(): [
  IModConfigOverrides,
  ISetModConfigOverrides,
] {
  const [modConfigOverrides, setModConfigOverrides] = useSavedState(
    'mod-config-overrides',
    {} as IModConfigOverrides,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str),
  );

  return [modConfigOverrides, setModConfigOverrides];
}
