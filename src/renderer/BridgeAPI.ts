import type { IBridgeAPI } from 'bridge/BridgeAPI';
import { consumeAPI } from './IPC';

const BridgeAPI = consumeAPI<IBridgeAPI>('BridgeAPI');

export default BridgeAPI;
