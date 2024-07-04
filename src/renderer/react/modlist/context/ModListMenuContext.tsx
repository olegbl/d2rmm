import React, { useCallback, useContext, useMemo, useState } from 'react';

type ContextMenuAnchor = { left: number; top: number };

export type IMenuListMenuContext = {
  contextMenuAnchor: ContextMenuAnchor | null;
  isContextMenuOpen: boolean;
  onOpenContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCloseContextMenu: () => void;
};

const MenuListMenuContext = React.createContext<IMenuListMenuContext | null>(
  null,
);

export default MenuListMenuContext;

type Props = {
  children: React.ReactNode;
};

export function MenuListMenuContextProvider({ children }: Props): JSX.Element {
  const [contextMenuAnchor, setContextMenuAnchor] =
    useState<ContextMenuAnchor | null>(null);

  const isContextMenuOpen = contextMenuAnchor != null;

  const onOpenContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setContextMenuAnchor((oldValue) =>
        oldValue == null
          ? {
              left: event.clientX + 2,
              top: event.clientY - 6,
            }
          : null,
      );
    },
    [],
  );

  const onCloseContextMenu = useCallback(() => {
    setContextMenuAnchor(null);
  }, []);

  const context = useMemo(
    () => ({
      contextMenuAnchor,
      isContextMenuOpen,
      onOpenContextMenu,
      onCloseContextMenu,
    }),
    [
      contextMenuAnchor,
      isContextMenuOpen,
      onOpenContextMenu,
      onCloseContextMenu,
    ],
  );

  return (
    <MenuListMenuContext.Provider value={context}>
      {children}
    </MenuListMenuContext.Provider>
  );
}

export function useModListMenuContext(): IMenuListMenuContext {
  const context = useContext(MenuListMenuContext);
  if (context == null) {
    throw new Error(
      'useModListMenuContext must be used within a ModListMenuContextProvider',
    );
  }
  return context;
}
