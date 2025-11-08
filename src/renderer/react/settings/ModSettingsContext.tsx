import React, { useContext, useMemo, useState } from 'react';

export type IModSettingsExpandedSections = { [id: string]: boolean };

export type IModSettingsContext = {
  expandedSections: IModSettingsExpandedSections;
  setExpandedSections: React.Dispatch<
    React.SetStateAction<IModSettingsExpandedSections>
  >;
};

const ModSettingsContext = React.createContext<IModSettingsContext | null>(
  null,
);

export default ModSettingsContext;

type Props = {
  children: React.ReactNode;
};

export function ModSettingsContextProvider({ children }: Props): JSX.Element {
  const [expandedSections, setExpandedSections] =
    useState<IModSettingsExpandedSections>({});

  const context = useMemo(
    () => ({
      expandedSections,
      setExpandedSections,
    }),
    [expandedSections],
  );

  return (
    <ModSettingsContext.Provider value={context}>
      {children}
    </ModSettingsContext.Provider>
  );
}

export function useModSettingsContext(): IModSettingsContext {
  const context = useContext(ModSettingsContext);
  if (context == null) {
    throw new Error(
      'useModSettingsContext must be used within a ModSettingsContextProvider',
    );
  }
  return context;
}
