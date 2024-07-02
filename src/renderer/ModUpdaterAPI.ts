import type { IModUpdaterAPI } from 'bridge/ModUpdaterAPI';
import { consumeAPI } from './IPC';

const ModUpdaterAPI = consumeAPI<IModUpdaterAPI>('ModUpdaterAPI');

export default ModUpdaterAPI;
