import ToastContext, { Toast } from 'renderer/react/context/ToastContext';
import { useContext } from 'react';

const emptyFunction = () => {};

export type ShowToast = (toast: Toast) => void;

export default function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (context == null) {
    return emptyFunction;
  }
  return context.showToast;
}
