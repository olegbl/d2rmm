import { AlertColor } from '@mui/material';
import React from 'react';

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
