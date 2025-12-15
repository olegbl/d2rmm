import React, { useMemo } from 'react';

export type IStashTabContext = {
  index: number;
};

const StashTabContext = React.createContext<IStashTabContext | null>(null);

export function StashTabContextProvider({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}): JSX.Element {
  const context = useMemo(
    () => ({
      index,
    }),
    [index],
  );

  return (
    <StashTabContext.Provider value={context}>
      {children}
    </StashTabContext.Provider>
  );
}

export function useStashTabIndex(): number {
  const context = React.useContext(StashTabContext);
  if (context == null) {
    return -1;
  }
  return context.index;
}
