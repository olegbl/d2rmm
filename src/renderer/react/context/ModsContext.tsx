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
import BridgeAPI from '../../BridgeAPI';
import useSavedState from '../hooks/useSavedState';
import useToast from '../hooks/useToast';
import { useLogger } from './LogContext';

// inversse of Readonly<T>
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type IMods = Mod[];

type IModsRefresher = () => Promise<void>;

type IEnabledMods = { [id: string]: boolean };

type IEnabledModsMutator = React.Dispatch<React.SetStateAction<IEnabledMods>>;

type IInstalledMod = { id: Mod['id']; config: Mod['config'] };

type IInstalledMods = IInstalledMod[];

type IInstalledModsMutator = React.Dispatch<
  React.SetStateAction<IInstalledMods>
>;

type ISelectedMod = Mod | null;

type ISelectedModMutator = React.Dispatch<React.SetStateAction<ISelectedMod>>;

export type ISectionHeader = {
  id: string;
  label: string;
  isExpanded: boolean;
};

type ISectionHeaders = {
  nextIndex: number;
  headers: ISectionHeader[];
};

type ISectionHeadersMutator = React.Dispatch<
  React.SetStateAction<ISectionHeaders>
>;

type IOrderedMod = {
  type: 'mod';
  id: string;
  mod: Mod;
};

type IOrderedSectionHeader = {
  type: 'sectionHeader';
  id: string;
  sectionHeader: ISectionHeader;
};

type IOrderedItem = IOrderedMod | IOrderedSectionHeader;

type IOrderedItems = IOrderedItem[];

type IOrderedMods = Mod[];

type IItemsOrder = string[];

type IItemsOrderMutator = (from: number, to: number) => unknown;

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
  orderedItems: IOrderedItems;
  refreshMods: IModsRefresher;
  reoderItems: IItemsOrderMutator;
  sectionHeaders: ISectionHeaders;
  selectedMod: ISelectedMod;
  setEnabledMods: IEnabledModsMutator;
  setInstalledMods: IInstalledModsMutator;
  setModConfig: IModConfigMutator;
  setSectionHeaders: ISectionHeadersMutator;
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

  const refreshMods = useCallback(async (): Promise<void> => {
    // manually refresh mods
    setMods(await getMods());
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

  const [sectionHeaders, setSectionHeaders] = useSavedState(
    'section-headers',
    { nextIndex: 0, headers: [] } as ISectionHeaders,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str),
  );

  const [itemsOrder, setItemsOrder] = useSavedState(
    'mods-order',
    [] as IItemsOrder,
    (arr) => JSON.stringify(arr),
    (str) => JSON.parse(str),
  );

  const updatedItemsOrder = useMemo(
    () => [
      ...itemsOrder.filter(
        (id) =>
          mods.some((mod) => mod.id === id) ||
          sectionHeaders.headers.some(
            (sectionHeader) => sectionHeader.id === id,
          ),
      ),
      ...mods.map((mod) => mod.id).filter((id) => !itemsOrder.includes(id)),
      ...sectionHeaders.headers
        .map((sectionHeader) => sectionHeader.id)
        .filter((id) => !itemsOrder.includes(id)),
    ],
    [itemsOrder, mods, sectionHeaders],
  );

  const orderedItems = useMemo(
    () =>
      [
        ...mods.map((mod) => ({
          type: 'mod' as const,
          id: mod.id,
          mod,
        })),
        ...sectionHeaders.headers.map((sectionHeader) => ({
          type: 'sectionHeader' as const,
          id: sectionHeader.id,
          sectionHeader,
        })),
      ].sort(
        (a, b) =>
          updatedItemsOrder.indexOf(a.id) - updatedItemsOrder.indexOf(b.id),
      ),
    [mods, sectionHeaders, updatedItemsOrder],
  );

  const reoderItems = useCallback(
    (from: number, to: number): void => {
      if (from === to) {
        return;
      }

      // from/to don't account for hidden items so they need to be fixed
      let isHidden = false;
      let isFromFixed = false;
      let isToFixed = false;
      for (
        let i = 0, hiddenIndex = 0;
        i < orderedItems.length;
        i++, hiddenIndex++
      ) {
        const item = orderedItems[i];
        if (isOrderedSectionHeader(item)) {
          isHidden = !item.sectionHeader.isExpanded;
        } else if (isHidden) {
          hiddenIndex--;
        }

        if (hiddenIndex === from && !isFromFixed) {
          isFromFixed = true;
          from = i;
        }

        if (hiddenIndex === to && !isToFixed) {
          isToFixed = true;
          to = i;
        }
      }

      // figure out how many items to move in case we're moving a collapsed section
      let count = 1;
      const fromItem = orderedItems[from];
      if (
        isOrderedSectionHeader(fromItem) &&
        !fromItem.sectionHeader.isExpanded
      ) {
        const followingItems = orderedItems.slice(from + 1);
        count = followingItems.findIndex(isOrderedSectionHeader) + 1;
        if (count === 0) {
          count = followingItems.length + 1;
        }
      }

      // figure out exactly where to move them in case we're moving right after a collapsed section
      const toItem = orderedItems[to];
      if (isOrderedSectionHeader(toItem) && !toItem.sectionHeader.isExpanded) {
        for (let i = to + 1; i < orderedItems.length; i++) {
          if (isOrderedSectionHeader(orderedItems[i])) {
            break;
          }
          to++;
        }
      }

      const newOrder = updatedItemsOrder.slice();
      const removed = newOrder.splice(from, count);
      // if moving down, adjust to account for removed items
      if (to > from) {
        to -= count - 1;
      }
      newOrder.splice(to, 0, ...removed);
      setItemsOrder(newOrder);
    },
    [orderedItems, updatedItemsOrder, setItemsOrder],
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
    () =>
      orderedItems
        .filter<IOrderedMod>(isOrderedMod)
        .filter(({ mod }) => enabledMods[mod.id] ?? false)
        .map(({ mod }) => mod),
    [orderedItems, enabledMods],
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
      orderedItems,
      refreshMods,
      reoderItems,
      sectionHeaders,
      selectedMod,
      setEnabledMods,
      setInstalledMods,
      setModConfig,
      setSectionHeaders,
      setSelectedMod,
    }),
    [
      enabledMods,
      installedMods,
      isInstallConfigChanged,
      mods,
      modsToInstall,
      orderedItems,
      refreshMods,
      reoderItems,
      sectionHeaders,
      selectedMod,
      setEnabledMods,
      setInstalledMods,
      setModConfig,
      setSectionHeaders,
      setSelectedMod,
    ],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function isOrderedMod(item: IOrderedItem): item is IOrderedMod {
  return item.type === 'mod';
}

export function isOrderedSectionHeader(
  item: IOrderedItem,
): item is IOrderedSectionHeader {
  return item.type === 'sectionHeader';
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

export function useSectionHeaders(): [ISectionHeaders, ISectionHeadersMutator] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.sectionHeaders, context.setSectionHeaders];
}

export function useAddSectionHeader(): () => void {
  const [, setSectionHeaders] = useSectionHeaders();
  return useCallback(() => {
    setSectionHeaders((oldSectionHeaders) => ({
      nextIndex: oldSectionHeaders.nextIndex + 1,
      headers: [
        ...oldSectionHeaders.headers,
        {
          id: `sectionHeader:${oldSectionHeaders.nextIndex}`,
          label: 'New Section Header',
          isExpanded: true,
        },
      ],
    }));
  }, [setSectionHeaders]);
}

export function useRemoveSectionHeader(id: string): () => void {
  const [, setSectionHeaders] = useSectionHeaders();
  return useCallback(() => {
    setSectionHeaders((oldSectionHeaders) => ({
      ...oldSectionHeaders,
      headers: oldSectionHeaders.headers.filter((header) => header.id !== id),
    }));
  }, [id, setSectionHeaders]);
}

export function useRenameSectionHeader(id: string): (newName: string) => void {
  const [, setSectionHeaders] = useSectionHeaders();
  return useCallback(
    (newName: string) => {
      setSectionHeaders((oldSectionHeaders) => ({
        ...oldSectionHeaders,
        headers: oldSectionHeaders.headers.map((header) => {
          if (header.id === id) {
            return { ...header, label: newName };
          }
          return header;
        }),
      }));
    },
    [id, setSectionHeaders],
  );
}

export function useToggleSectionHeader(id: string): () => void {
  const [, setSectionHeaders] = useSectionHeaders();
  return useCallback(() => {
    setSectionHeaders((oldSectionHeaders) => ({
      ...oldSectionHeaders,
      headers: oldSectionHeaders.headers.map((header) => {
        if (header.id === id) {
          return { ...header, isExpanded: !header.isExpanded };
        }
        return header;
      }),
    }));
  }, [id, setSectionHeaders]);
}

export function useOrdereredItems(): [IOrderedItems, IItemsOrderMutator] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.orderedItems, context.reoderItems];
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