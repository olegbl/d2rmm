import type { INxmProtocolAPI } from 'bridge/NxmProtocolAPI';
import { consumeAPI } from 'renderer/IPC';

const NxmProtocolAPI = consumeAPI<INxmProtocolAPI>('NxmProtocolAPI');

export default NxmProtocolAPI;
