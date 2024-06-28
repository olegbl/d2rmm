import React, { useCallback, useMemo, useState } from 'react';
import { Alert, AlertColor, AlertTitle, Button, Snackbar } from '@mui/material';

export type Toast = {
  severity: AlertColor;
  title: string;
  description?: string;
};

export type IToastContext = {
  showToast: (toast: Toast) => void;
  clearToasts: () => void;
};

const ToastContext = React.createContext<IToastContext | null>(null);

export default ToastContext;

type Props = {
  children: React.ReactNode;
};

export function ToastContextProvider({ children }: Props): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Toast): void => {
    setToasts((oldToasts) => [...oldToasts, toast]);
  }, []);

  const popToast = useCallback((): void => {
    setToasts((oldToasts) => oldToasts.slice(1));
  }, []);

  const clearToasts = useCallback((): void => {
    setToasts([]);
  }, []);

  const currentToast = toasts[0];

  const context = useMemo(
    () => ({ showToast, clearToasts }),
    [showToast, clearToasts],
  );

  return (
    <ToastContext.Provider value={context}>
      {children}
      <Snackbar
        onClose={popToast}
        open={toasts.length > 0}
        transitionDuration={0}
      >
        <Alert
          onClose={popToast}
          severity={currentToast?.severity}
          variant="filled"
        >
          <AlertTitle>{currentToast?.title}</AlertTitle>
          {currentToast?.description}
          {toasts.length > 1 ? (
            <>
              <br />
              <br />
              <Button color="inherit" onClick={clearToasts} variant="outlined">
                Clear All ({toasts.length})
              </Button>
            </>
          ) : null}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
