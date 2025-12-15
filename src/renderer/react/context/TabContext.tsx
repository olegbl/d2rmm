import React, { useMemo } from 'react';

export type Tab = 'mods' | 'settings' | 'ed2r' | 'logs';
type SetTab = React.Dispatch<React.SetStateAction<Tab>>;

export type ITabContext = {
  currentTab: Tab;
  setTab: SetTab;
};

const TabContext = React.createContext<ITabContext | null>(null);

export function TabContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [currentTab, setTab] = React.useState<Tab>('mods');

  const context = useMemo(() => ({ currentTab, setTab }), [currentTab, setTab]);

  return <TabContext.Provider value={context}>{children}</TabContext.Provider>;
}

export function useTabState(): [Tab, SetTab] {
  const context = React.useContext(TabContext);
  if (context == null) {
    throw new Error('useTabState used outside of a TabContextProvider');
  }
  return [context.currentTab, context.setTab];
}
