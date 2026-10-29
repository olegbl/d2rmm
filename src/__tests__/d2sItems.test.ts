import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from 'main/worker/third-party/d2s/binary/bitreader';
import { readItem, writeItem } from 'main/worker/third-party/d2s/d2/items';

const VERSION_ROTW = 0x69;

const constants = {
  armor_items: {},
  weapon_items: {},
  other_items: { r01: { c: ['Rune', 'Socket Filler', 'Misc'] } },
  magical_properties: [],
} as unknown as types.IConstantData;
const config = {} as types.IConfig;

describe('d2s items (RotW)', () => {
  it.each([
    { has_advanced_stash_quantity: true, advanced_stash_quantity: 0 },
    { has_advanced_stash_quantity: true, advanced_stash_quantity: 5 },
    { has_advanced_stash_quantity: false, advanced_stash_quantity: undefined },
  ])(
    'writes and reads back flag=$has_advanced_stash_quantity quantity=$advanced_stash_quantity',
    async (stash) => {
      // El rune (r01) in the inventory
      const item = {
        _unknown_data: {},
        identified: 1,
        simple_item: 1,
        version: '101',
        location_id: 0,
        equipped_id: 0,
        position_x: 9,
        position_y: 0,
        alt_position_id: 1,
        type: 'r01',
        nr_of_items_in_sockets: 0,
        ...stash,
      } as types.IItem;

      const bytes = await writeItem(item, VERSION_ROTW, 0, constants, config);
      const read = await readItem(
        new BitReader(bytes),
        VERSION_ROTW,
        0,
        constants,
        config,
      );

      expect(read.has_advanced_stash_quantity).toBe(
        stash.has_advanced_stash_quantity,
      );
      expect(read.advanced_stash_quantity).toBe(stash.advanced_stash_quantity);
    },
  );
});
