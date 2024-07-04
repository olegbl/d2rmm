import ToastContext, { Toast } from 'renderer/react/context/ToastContext';
import { useContext } from 'react';

export type ShowToast = (toast: Toast) => void;

export default function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (context == null) {
    throw new Error('useToast must be used within a ToastContextProvider');
  }
  return context.showToast;
}
