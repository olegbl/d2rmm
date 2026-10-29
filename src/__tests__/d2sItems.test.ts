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

// El rune (r01) in the inventory
function makeRune(overrides: Partial<types.IItem>): types.IItem {
  return {
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
    ...overrides,
  } as types.IItem;
}

async function writeThenRead(item: types.IItem) {
  const written = await writeItem(item, VERSION_ROTW, 0, constants, config);
  const read = await readItem(
    new BitReader(written),
    VERSION_ROTW,
    0,
    constants,
    config,
  );
  const rewritten = await writeItem(read, VERSION_ROTW, 0, constants, config);
  return { read, written, rewritten };
}

describe('d2s items (RotW)', () => {
  it('round-trips an item with advanced stash quantity 0', async () => {
    const result = await writeThenRead(
      makeRune({
        has_advanced_stash_quantity: true,
        advanced_stash_quantity: 0,
      }),
    );
    expect(result.read.has_advanced_stash_quantity).toBe(true);
    expect(result.read.advanced_stash_quantity).toBe(0);
    expect(result.rewritten).toEqual(result.written);
  });

  it('round-trips an item with a non-zero advanced stash quantity', async () => {
    const result = await writeThenRead(
      makeRune({
        has_advanced_stash_quantity: true,
        advanced_stash_quantity: 5,
      }),
    );
    expect(result.read.has_advanced_stash_quantity).toBe(true);
    expect(result.read.advanced_stash_quantity).toBe(5);
    expect(result.rewritten).toEqual(result.written);
  });

  it('round-trips an item without an advanced stash quantity', async () => {
    const result = await writeThenRead(
      makeRune({ has_advanced_stash_quantity: false }),
    );
    expect(result.read.has_advanced_stash_quantity).toBe(false);
    expect(result.read.advanced_stash_quantity).toBeUndefined();
    expect(result.rewritten).toEqual(result.written);
  });
});
