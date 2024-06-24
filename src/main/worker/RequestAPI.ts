import type { IRequestAPI } from 'bridge/RequestAPI';
import { consumeAPI } from './IPC';

export const RequestAPI = consumeAPI<IRequestAPI>('RequestAPI');
