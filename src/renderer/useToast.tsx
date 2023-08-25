import { useContext } from 'react';
import ToastContext, { Toast } from './ToastContext';

const emptyFunction = () => {};

export type ShowToast = (toast: Toast) => void;

export default function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (context == null) {
    return emptyFunction;
  }
  return context.showToast;
}
