import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldOrSection } from 'bridge/ModConfig';
import type {
  ModConfigSingleValue,
  ModConfigValue,
} from 'bridge/ModConfigValue';
import BridgeAPI from './BridgeAPI';
import { useLogger } from './Logs';
import useSavedState from './useSavedState';
import useToast from './useToast';

// inversse of Readonly<T>
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type IMods = Mod[];

type IModsRefresher = () => void;

type IEnabledMods = { [id: string]: boolean };

type IEnabledModsMutator = React.Dispatch<React.SetStateAction<IEnabledMods>>;

type IInstalledMods = { id: Mod['id']; config: Mod['config'] }[];

type IInstalledModsMutator = React.Dispatch<
  React.SetStateAction<IInstalledMods>
>;

type ISelectedMod = Mod | null;

type ISelectedModMutator = React.Dispatch<React.SetStateAction<ISelectedMod>>;

type IOrderedMods = Mod[];

type IModOrder = string[];

type IModOrderMutator = (from: number, to: number) => unknown;

type IModConfigMutator = (
  id: string,
  value: React.SetStateAction<ModConfigValue>,
) => void;

export type IModsContext = {
  enabledMods: IEnabledMods;
  installedMods: IInstalledMods;
  isInstallConfigChanged: boolean;
  mods: IMods;
  modsToInstall: IOrderedMods;
  orderedMods: IOrderedMods;
  refreshMods: IModsRefresher;
  reorderMod: IModOrderMutator;
  selectedMod: ISelectedMod;
  setEnabledMods: IEnabledModsMutator;
  setInstalledMods: IInstalledModsMutator;
  setModConfig: IModConfigMutator;
  setSelectedMod: ISelectedModMutator;
};

export const Context = React.createContext<IModsContext | null>(null);

function getDefaultConfig(
  fields?: readonly ModConfigFieldOrSection[] | null,
): ModConfigValue {
  if (fields == null) {
    return {};
  }
  const defaultConfig: Mutable<ModConfigValue> = {};
  for (const field of fields) {
    if (field.type === 'section') {
      Object.assign(defaultConfig, getDefaultConfig(field.children));
    } else {
      defaultConfig[field.id] =
        field.defaultValue as unknown as ModConfigSingleValue;
    }
  }
  return defaultConfig;
}

export function ModsContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const logger = useLogger();
  const showToast = useToast();

  const getMods = useCallback(async (): Promise<Mod[]> => {
    const modIDs = await BridgeAPI.readModDirectory();
    const mods: Mod[] = [];
    for (const modID of modIDs) {
      try {
        const info = await BridgeAPI.readModInfo(modID);

        if (info == null) {
          // ignore folder as it may not be a mod
          continue;
        }

        const config = (await BridgeAPI.readModConfig(
          modID,
        )) as unknown as ModConfigValue;

        const defaultConfig = getDefaultConfig(info.config);

        mods.push({
          id: modID,
          info,
          config: { ...defaultConfig, ...config },
        });
      } catch (error) {
        logger.error('Failed to load mod', modID, error as Error);
        showToast({
          severity: 'error',
          title: `Failed to load mod ${modID}`,
          description: String(error),
        });
      }
    }
    return mods;
  }, [logger, showToast]);

  const [mods, setMods] = useState<Mod[]>([]);

  useEffect(() => {
    getMods().then(setMods).catch(console.error);
  }, [getMods]);

  const setModConfig = useCallback(
    (id: string, value: React.SetStateAction<ModConfigValue>): void => {
      const getConfig = typeof value !== 'function' ? () => value : value;
      setMods((prevMods) =>
        prevMods.map((mod) => {
          if (mod.id === id) {
            const config = getConfig(mod.config);
            BridgeAPI.writeModConfig(id, config).catch(console.error);
            return { ...mod, config };
          }
          return mod;
        }),
      );
    },
    [],
  );

  const refreshMods = useCallback((): void => {
    // manually refresh mods
    getMods().then(setMods).catch(console.error);
  }, [getMods]);

  const [installedMods, setInstalledMods] = useSavedState(
    'installed-mods',
    {} as IInstalledMods,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str),
  );

  const [enabledMods, setEnabledMods] = useSavedState(
    'enabled-mods',
    {} as IEnabledMods,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str),
  );

  const [modOrder, setModOrder] = useSavedState(
    'mods-order',
    [] as IModOrder,
    (arr) => JSON.stringify(arr),
    (str) => JSON.parse(str),
  );

  const freshModOrder = useMemo(
    () => [
      ...modOrder.filter((modID) => mods.some((mod) => mod.id === modID)),
      ...mods.filter((mod) => !modOrder.includes(mod.id)).map((mod) => mod.id),
    ],
    [modOrder, mods],
  );

  const orderedMods = useMemo(
    () =>
      mods.sort(
        (a, b) => freshModOrder.indexOf(a.id) - freshModOrder.indexOf(b.id),
      ),
    [mods, freshModOrder],
  );

  const reorderMod = useCallback(
    (from: number, to: number): void => {
      const newOrder = freshModOrder.slice();
      const [removed] = newOrder.splice(from, 1);
      newOrder.splice(to, 0, removed);
      setModOrder(newOrder);
    },
    [freshModOrder, setModOrder],
  );

  const [selectedModID, setSelectedModID] = useState<string | null>(null);

  const getModByID = useCallback(
    (modID: string | null): Mod | null =>
      mods.filter((mod) => mod.id === modID).shift() ?? null,
    [mods],
  );

  const selectedMod: ISelectedMod = useMemo(
    () => getModByID(selectedModID),
    [selectedModID, getModByID],
  );

  const setSelectedMod: ISelectedModMutator = useCallback(
    (action: React.SetStateAction<ISelectedMod>): void => {
      setSelectedModID((previousID) => {
        if (typeof action === 'function') {
          return action(getModByID(previousID))?.id ?? null;
        }
        return action?.id ?? null;
      });
    },
    [getModByID],
  );

  const modsToInstall = useMemo(
    () => orderedMods.filter((mod) => enabledMods[mod.id] ?? false),
    [orderedMods, enabledMods],
  );

  const isInstallConfigChanged = useMemo(() => {
    const installedModsNew: IInstalledMods = modsToInstall.map((mod) => ({
      id: mod.id,
      config: mod.config,
    }));
    return JSON.stringify(installedMods) != JSON.stringify(installedModsNew);
  }, [modsToInstall, installedMods]);

  const context = useMemo(
    (): IModsContext => ({
      enabledMods,
      installedMods,
      isInstallConfigChanged,
      mods,
      modsToInstall,
      orderedMods,
      refreshMods,
      reorderMod,
      selectedMod,
      setEnabledMods,
      setInstalledMods,
      setModConfig,
      setSelectedMod,
    }),
    [
      enabledMods,
      installedMods,
      isInstallConfigChanged,
      mods,
      modsToInstall,
      orderedMods,
      refreshMods,
      reorderMod,
      selectedMod,
      setEnabledMods,
      setInstalledMods,
      setModConfig,
      setSelectedMod,
    ],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useEnabledMods(): [IEnabledMods, IEnabledModsMutator] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.enabledMods, context.setEnabledMods];
}

export function useInstalledMods(): [IInstalledMods, IInstalledModsMutator] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.installedMods, context.setInstalledMods];
}

export function useToggleMod(): (mod: Mod) => void {
  const [, setEnabledMods] = useEnabledMods();
  return useCallback(
    (mod: Mod): void =>
      setEnabledMods((prev) => ({
        ...prev,
        [mod.id]: !prev[mod.id],
      })),
    [setEnabledMods],
  );
}

export function useMods(): [IMods, IModsRefresher] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.mods, context.refreshMods];
}

export function useOrderedMods(): [IOrderedMods, IModOrderMutator] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.orderedMods, context.reorderMod];
}

export function useModsToInstall(): IOrderedMods {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return context.modsToInstall;
}

export function useSelectedMod(): [ISelectedMod, ISelectedModMutator] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.selectedMod, context.setSelectedMod];
}

export function useSetModConfig(): IModsContext['setModConfig'] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return context.setModConfig;
}

export function useIsInstallConfigChanged(): boolean {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return context.isInstallConfigChanged;
}
