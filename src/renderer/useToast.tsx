import { useContext } from 'react';
import ToastContext, { Toast } from './ToastContext';

const emptyFunction = () => {};

export default function useToast(): (toast: Toast) => void {
  const context = useContext(ToastContext);
  if (context == null) {
    return emptyFunction;
  }
  return context.showToast;
}
