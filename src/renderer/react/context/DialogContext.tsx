import { v4 as uuidv4 } from 'uuid';
import React, { useCallback, useContext, useMemo, useState } from 'react';

export type Dialog = React.ReactNode;

export type IDialogManagerContext = {
  hideDialog: (id: string) => void;
  showDialog: (id: string, dialog: Dialog) => void;
};

const DialogManagerContext = React.createContext<IDialogManagerContext | null>(
  null,
);

export default DialogManagerContext;

type Props = {
  children: React.ReactNode;
};

export function DialogManagerContextProvider({ children }: Props): JSX.Element {
  const [dialogs, setDialogs] = useState<[string, Dialog][]>([]);

  const showDialog = useCallback((id: string, dialog: Dialog): void => {
    setDialogs((oldDialogs) => {
      const newDialogs = [...oldDialogs];
      const index = newDialogs.findIndex(([oldDialogID]) => oldDialogID === id);
      if (index !== -1) {
        // updating
        if (newDialogs[index][1] === dialog) {
          // unchanged
          return oldDialogs;
        }
        newDialogs[index] = [id, dialog];
      } else {
        // adding
        newDialogs.push([id, dialog]);
      }
      return newDialogs;
    });
  }, []);

  const hideDialog = useCallback((id: string): void => {
    setDialogs((oldDialogs) => {
      const newDialogs = oldDialogs.filter(
        ([oldDialogID]) => oldDialogID !== id,
      );
      return newDialogs.length === oldDialogs.length ? oldDialogs : newDialogs;
    });
  }, []);

  const context = useMemo(
    () => ({
      hideDialog,
      showDialog,
    }),
    [hideDialog, showDialog],
  );

  return (
    <DialogManagerContext.Provider value={context}>
      {children}
      {dialogs.map(([id, dialog], index) => (
        <DialogContextProvider
          key={id}
          hideDialog={hideDialog}
          id={id}
          isOpen={index === dialogs.length - 1}
        >
          {dialog}
        </DialogContextProvider>
      ))}
    </DialogManagerContext.Provider>
  );
}

function useDialogManagerContext(): IDialogManagerContext {
  const context = useContext(DialogManagerContext);
  if (context == null) {
    throw new Error(
      'useDialogManagerContext must be used within a DialogManagerContextProvider',
    );
  }
  return context;
}

type IDialogContext = {
  id: string;
  isOpen: boolean;
  close: () => void;
};

const DialogContext = React.createContext<IDialogContext | null>(null);

function DialogContextProvider({
  children,
  hideDialog,
  id,
  isOpen,
}: {
  children: React.ReactNode;
  hideDialog: (id: string) => void;
  id: string;
  isOpen: boolean;
}): JSX.Element {
  const close = useCallback(() => {
    hideDialog(id);
  }, [id, hideDialog]);

  const context = useMemo(() => ({ id, isOpen, close }), [id, isOpen, close]);

  return (
    <DialogContext.Provider value={context}>{children}</DialogContext.Provider>
  );
}

export function useDialog(
  dialog: React.ReactNode,
): [show: () => void, hide: () => void] {
  const id = useMemo(() => uuidv4(), []);
  const { showDialog, hideDialog } = useDialogManagerContext();

  const hide = useCallback(() => {
    hideDialog(id);
  }, [hideDialog, id]);

  const show = useCallback(() => {
    showDialog(id, dialog);
  }, [id, showDialog, dialog]);

  return [show, hide];
}

export function useDialogContext(): IDialogContext {
  const context = useContext(DialogContext);
  if (context == null) {
    throw new Error(
      'useDialogContext must be used within a DialogContextProvider',
    );
  }
  return context;
}
