import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from 'main/worker/third-party/d2s/binary/bitreader';
import { readItem, writeItem } from 'main/worker/third-party/d2s/d2/items';

const VERSION_ROTW = 0x69;

const constants = {
  armor_items: {},
  weapon_items: {},
  other_items: {
    r01: { c: ['Rune', 'Socket Filler', 'Misc'] },
    r11: { c: ['Rune', 'Socket Filler', 'Misc'] },
  },
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
  // Items taken from a RotW save written by the game. Runes are written with
  // the advanced stash quantity present but set to 0.
  it('round-trips an inventory rune with advanced stash quantity 0', async () => {
    // El rune (r01) in the inventory
    const hex = '1000a0000524e47c7f1200';
    const result = await roundTrip(hex);
    expect(result.item.type).toBe('r01');
    expect(result.item.has_advanced_stash_quantity).toBe(true);
    expect(result.item.advanced_stash_quantity).toBe(0);
    expect(result.hex).toBe(hex);
  });

  it('round-trips a socketed rune with advanced stash quantity 0', async () => {
    // Amn rune (r11) socketed in a runeword
    const hex = '1000a000350ce07c3e0900';
    const result = await roundTrip(hex);
    expect(result.item.type).toBe('r11');
    expect(result.item.has_advanced_stash_quantity).toBe(true);
    expect(result.item.advanced_stash_quantity).toBe(0);
    expect(result.hex).toBe(hex);
  });

  // Variants of the El rune above with the advanced stash quantity edited
  it('round-trips an item with a non-zero advanced stash quantity', async () => {
    const hex = '1000a0000524e47c7fb200';
    const result = await roundTrip(hex);
    expect(result.item.has_advanced_stash_quantity).toBe(true);
    expect(result.item.advanced_stash_quantity).toBe(5);
    expect(result.hex).toBe(hex);
  });

  it('round-trips an item without an advanced stash quantity', async () => {
    const hex = '1000a0000524e47c7f02';
    const result = await roundTrip(hex);
    expect(result.item.has_advanced_stash_quantity).toBe(false);
    expect(result.hex).toBe(hex);
  });
});
