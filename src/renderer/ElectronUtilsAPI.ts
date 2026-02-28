import type { IElectronUtilsAPI } from 'bridge/ElectronUtilsAPI';

declare global {
  interface Window {
    ElectronUtils: IElectronUtilsAPI;
  }
}

const ElectronUtilsAPI: IElectronUtilsAPI = window.ElectronUtils;

export default ElectronUtilsAPI;
