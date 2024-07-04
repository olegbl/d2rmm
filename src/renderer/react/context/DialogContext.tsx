import { v4 as uuidv4 } from 'uuid';
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export type Dialog = React.ReactNode;

export type IDialogManagerContext = {
  hideDialog: (id: string) => void;
  showDialog: (dialog: Dialog) => string;
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

  const showDialog = useCallback((dialog: Dialog): string => {
    const id = uuidv4();
    setDialogs((oldDialogs) => [...oldDialogs, [id, dialog]]);
    return id;
  }, []);

  const hideDialog = useCallback((id: string): void => {
    setDialogs((oldDialogs) =>
      oldDialogs.filter(([oldDialogID]) => oldDialogID !== id),
    );
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
): [open: () => void, close: () => void] {
  const context = useContext(DialogManagerContext);
  if (context == null) {
    throw new Error(
      'useDialog must be used within a DialogManagerContextProvider',
    );
  }
  const { showDialog, hideDialog } = context;

  const idRef = useRef<string | null>(null);

  const close = useCallback(() => {
    if (idRef.current != null) {
      hideDialog(idRef.current);
    }
  }, [hideDialog]);

  const open = useCallback(() => {
    close();
    idRef.current = showDialog(dialog);
  }, [showDialog, close, dialog]);

  return [open, close];
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
