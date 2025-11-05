import type { IShellAPI } from 'bridge/ShellAPI';
import { consumeAPI } from 'renderer/IPC';

const ShellAPI = consumeAPI<IShellAPI>('ShellAPI');

export default ShellAPI;
