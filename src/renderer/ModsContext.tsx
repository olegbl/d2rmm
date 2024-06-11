import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useSavedState from './useSavedState';
import { useLogger } from './Logs';
import useToast from './useToast';
import { ModConfigSingleValue, ModConfigValue } from './ModConfigValue';

const BridgeAPI = window.electron.BridgeAPI;

// inversse of Readonly<T>
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type IEnabledMods = { [id: string]: boolean };

type IEnabledModsMutator = React.Dispatch<React.SetStateAction<IEnabledMods>>;

type ISelectedMod = Mod | null;

type ISelectedModMutator = React.Dispatch<React.SetStateAction<ISelectedMod>>;

type IModOrder = string[];

type IReorderMod = (from: number, to: number) => unknown;

export type IModsContext = {
  enabledMods: IEnabledMods;
  mods: Mod[];
  orderedMods: Mod[];
  refreshMods: () => void;
  reorderMod: IReorderMod;
  selectedMod: ISelectedMod;
  setEnabledMods: IEnabledModsMutator;
  setModConfig: (
    id: string,
    value: React.SetStateAction<ModConfigValue>
  ) => void;
  setSelectedMod: ISelectedModMutator;
};

export const Context = React.createContext<IModsContext | null>(null);

export function ModsContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const logger = useLogger();
  const showToast = useToast();

  const getMods = useCallback((): Mod[] => {
    const modIDs = BridgeAPI.readModDirectory();
    return modIDs
      .map((modID) => {
        try {
          const info = BridgeAPI.readModInfo(modID);

          if (info == null) {
            // ignore folder as it may not be a mod
            return null;
          }

          const config = BridgeAPI.readModConfig(
            modID
          ) as unknown as ModConfigValue;

          const defaultConfig = info.config?.reduce((agg, field) => {
            if (field.type !== 'section') {
              agg[field.id] =
                field.defaultValue as unknown as ModConfigSingleValue;
            }
            return agg;
          }, {} as Mutable<ModConfigValue>);

          return {
            id: modID,
            info,
            config: { ...defaultConfig, ...config },
          };
        } catch (error) {
          logger.error('Failed to load mod', modID, error);
          showToast({
            severity: 'error',
            title: `Failed to load mod ${modID}`,
            description: String(error),
          });
          return null;
        }
      })
      .filter((mod): mod is Mod => mod != null);
  }, [logger, showToast]);

  const [mods, setMods] = useState<Mod[]>(() => getMods());

  const setModConfig = useCallback(
    (id: string, value: React.SetStateAction<ModConfigValue>): void => {
      const getConfig = typeof value !== 'function' ? () => value : value;
      setMods((prevMods) =>
        prevMods.map((mod) => {
          if (mod.id === id) {
            const config = getConfig(mod.config);
            BridgeAPI.writeModConfig(id, config);
            return { ...mod, config };
          }
          return mod;
        })
      );
    },
    []
  );

  const refreshMods = useCallback((): void => {
    // manually refresh mods
    setMods(getMods());
  }, [getMods]);

  const [enabledMods, setEnabledMods] = useSavedState(
    'enabled-mods',
    {} as IEnabledMods,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str)
  );

  const [modOrder, setModOrder] = useSavedState(
    'mods-order',
    [] as IModOrder,
    (arr) => JSON.stringify(arr),
    (str) => JSON.parse(str)
  );

  const modByID = useMemo(
    () =>
      mods.reduce(
        (agg, mod) => ({ ...agg, [mod.id]: mod }),
        {} as { [id: string]: Mod }
      ),
    [mods]
  );

  const orderedMods = useMemo(
    () => modOrder.map((mod) => modByID[mod]).filter(Boolean),
    [modByID, modOrder]
  );

  const reorderMod = useCallback(
    (from: number, to: number): void => {
      setModOrder((prevOrder) => {
        const newOrder = prevOrder.slice();
        const [removed] = newOrder.splice(from, 1);
        newOrder.splice(to, 0, removed);
        return newOrder;
      });
    },
    [setModOrder]
  );

  // update modOrder to match current mods state
  useEffect(() => {
    const modIDs = mods.map((mod) => mod.id);
    const addMods = modIDs.filter((mod) => modOrder.indexOf(mod) === -1);
    const remMods = modOrder.filter((mod) => modIDs.indexOf(mod) === -1);
    if (addMods.length > 0 || remMods.length > 0) {
      setModOrder((prevOrder) => [
        ...prevOrder.filter((mod) => modIDs.indexOf(mod) !== -1),
        ...addMods,
      ]);
    }
  }, [mods, modOrder, setModOrder]);

  const [selectedModID, setSelectedModID] = useState<string | null>(null);

  const getModByID = useCallback(
    (modID: string | null): Mod | null =>
      mods.filter((mod) => mod.id === modID).shift() ?? null,
    [mods]
  );

  const selectedMod: ISelectedMod = useMemo(
    () => getModByID(selectedModID),
    [selectedModID, getModByID]
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
    [getModByID]
  );

  const context = useMemo(
    (): IModsContext => ({
      enabledMods,
      mods,
      orderedMods,
      refreshMods,
      reorderMod,
      selectedMod,
      setEnabledMods,
      setModConfig,
      setSelectedMod,
    }),
    [
      enabledMods,
      mods,
      orderedMods,
      refreshMods,
      reorderMod,
      selectedMod,
      setEnabledMods,
      setModConfig,
      setSelectedMod,
    ]
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

export function useToggleMod(): (mod: Mod) => void {
  const [, setEnabledMods] = useEnabledMods();
  return useCallback(
    (mod: Mod): void =>
      setEnabledMods((prev) => ({
        ...prev,
        [mod.id]: !prev[mod.id],
      })),
    [setEnabledMods]
  );
}

export function useMods(): [Mod[], () => unknown] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.mods, context.refreshMods];
}

export function useOrderedMods(): [Mod[], IReorderMod] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.orderedMods, context.reorderMod];
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
