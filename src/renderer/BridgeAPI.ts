import type { IBridgeAPI } from 'bridge/BridgeAPI';
import { consumeAPI } from 'renderer/IPC';

const BridgeAPI = consumeAPI<IBridgeAPI>('BridgeAPI');

export default BridgeAPI;
