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

function fromHex(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

async function roundTrip(hex: string) {
  const item = await readItem(
    new BitReader(fromHex(hex)),
    VERSION_ROTW,
    0,
    constants,
    config,
  );
  const written = await writeItem(item, VERSION_ROTW, 0, constants, config);
  return { item, hex: toHex(written) };
}

describe('d2s items (RotW)', () => {
  // El rune (r01) in the inventory; only the advanced stash quantity differs
  it('round-trips an item with advanced stash quantity 0', async () => {
    const hex = '1000a0000548e47c7f1200';
    const result = await roundTrip(hex);
    expect(result.item.has_advanced_stash_quantity).toBe(true);
    expect(result.item.advanced_stash_quantity).toBe(0);
    expect(result.hex).toBe(hex);
  });

  it('round-trips an item with a non-zero advanced stash quantity', async () => {
    const hex = '1000a0000548e47c7fb200';
    const result = await roundTrip(hex);
    expect(result.item.has_advanced_stash_quantity).toBe(true);
    expect(result.item.advanced_stash_quantity).toBe(5);
    expect(result.hex).toBe(hex);
  });

  it('round-trips an item without an advanced stash quantity', async () => {
    const hex = '1000a0000548e47c7f02';
    const result = await roundTrip(hex);
    expect(result.item.has_advanced_stash_quantity).toBe(false);
    expect(result.hex).toBe(hex);
  });
});
