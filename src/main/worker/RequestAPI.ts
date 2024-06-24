import type { IRequestAPI } from 'bridge/RequestAPI';
import { consumeAPI } from './worker-ipc';

export const RequestAPI = consumeAPI<IRequestAPI>('RequestAPI');
