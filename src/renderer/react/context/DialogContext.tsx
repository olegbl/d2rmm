import { v4 as uuidv4 } from 'uuid';
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export type IDialogContext = {
  addDialog: (dialog: React.ReactNode) => string;
  removeDialog: (id: string) => void;
};

const DialogContext = React.createContext<IDialogContext | null>(null);

export default DialogContext;

type IPersistentDialogContext = {
  id: string;
  close: () => void;
};

const PersistentDialogContext =
  React.createContext<IPersistentDialogContext | null>(null);

type Props = {
  children: React.ReactNode;
};

export function DialogContextProvider({ children }: Props): JSX.Element {
  const [dialogs, setDialogs] = useState<Map<string, React.ReactNode>>(
    new Map(),
  );

  const addDialog = useCallback((dialog: React.ReactNode): string => {
    const id = uuidv4();
    setDialogs((oldDialogs) => new Map(oldDialogs.set(id, dialog)));
    return id;
  }, []);

  const removeDialog = useCallback((id: string): void => {
    setDialogs((oldDialogs) => {
      const newDialogs = new Map(oldDialogs);
      newDialogs.delete(id);
      return newDialogs;
    });
  }, []);

  const context = useMemo(
    () => ({
      addDialog,
      removeDialog,
    }),
    [addDialog, removeDialog],
  );

  return (
    <DialogContext.Provider value={context}>
      {children}
      {Array.from(dialogs.entries()).map(([id, dialog]) => (
        <PersistentDialogContextProvider
          key={id}
          id={id}
          removeDialog={removeDialog}
        >
          {dialog}
        </PersistentDialogContextProvider>
      ))}
    </DialogContext.Provider>
  );
}

function PersistentDialogContextProvider({
  children,
  id,
  removeDialog,
}: {
  children: React.ReactNode;
  id: string;
  removeDialog: (id: string) => void;
}): JSX.Element {
  const close = useCallback(() => {
    removeDialog(id);
  }, [id, removeDialog]);

  const context = useMemo(() => ({ id, close }), [id, close]);

  return (
    <PersistentDialogContext.Provider value={context}>
      {children}
    </PersistentDialogContext.Provider>
  );
}

export function usePersistentDialog(
  dialog: React.ReactNode,
): [open: () => void, close: () => void] {
  const context = useContext(DialogContext);
  if (context == null) {
    throw new Error(
      'usePersistentDialog must be used within a DialogContextProvider',
    );
  }
  const { addDialog, removeDialog } = context;

  const idRef = useRef<string | null>(null);

  const close = useCallback(() => {
    if (idRef.current != null) {
      removeDialog(idRef.current);
    }
  }, [removeDialog]);

  const open = useCallback(() => {
    close();
    idRef.current = addDialog(dialog);
  }, [addDialog, close, dialog]);

  return [open, close];
}

export function usePersistentDialogContext(): IPersistentDialogContext {
  const context = useContext(PersistentDialogContext);
  if (context == null) {
    throw new Error(
      'usePersistentDialogContext must be used within a dialog mounted using usePersistentDialog',
    );
  }
  return context;
}
