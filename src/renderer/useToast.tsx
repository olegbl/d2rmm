import { Alert, AlertColor, AlertTitle, Button, Snackbar } from '@mui/material';
import { useCallback, useState } from 'react';

export type Toast = {
  severity: AlertColor;
  title: string;
  description?: string;
};

export default function useToast(): [JSX.Element, (toast: Toast) => unknown] {
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

  const toast = (
    <Snackbar
      open={toasts.length > 0}
      transitionDuration={0}
      onClose={popToast}
    >
      <Alert
        severity={currentToast?.severity}
        variant="filled"
        onClose={popToast}
      >
        <AlertTitle>{currentToast?.title}</AlertTitle>
        {currentToast?.description}
        {toasts.length > 1 ? (
          <>
            <br />
            <br />
            <Button color="inherit" variant="outlined" onClick={clearToasts}>
              Clear All ({toasts.length})
            </Button>
          </>
        ) : null}
      </Alert>
    </Snackbar>
  );

  return [toast, showToast];
}
