import React from 'react';
import { AlertColor } from '@mui/material';

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
