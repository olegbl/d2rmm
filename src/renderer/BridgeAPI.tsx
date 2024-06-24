import type { IBridgeAPI } from 'bridge/BridgeAPI';
import { consumeAPI } from './renderer-ipc';

const BridgeAPI = consumeAPI<IBridgeAPI>('BridgeAPI');

export default BridgeAPI;
