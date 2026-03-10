export const CELL_SIZE = 48;

export enum LocationID {
  NONE = 0,
  EQUIPPED = 1,
  BELT = 2,
  CURSOR = 4,
  ITEM = 6, // socketed?
}

export enum AltPositionID {
  NONE = 0,
  INVENTORY = 1,
  CUBE = 4,
  STASH = 5,
}

export enum EquippedID {
  NONE = 0,
  HEAD = 1,
  NECK = 2,
  TORSO = 3,
  RIGHT_HAND = 4,
  LEFT_HAND = 5,
  RIGHT_FINGER = 6,
  LEFT_FINGER = 7,
  WAIST = 8,
  FEET = 9,
  HANDS = 10,
  ALT_RIGHT_HAND = 11,
  ALT_LEFT_HAND = 12,
}

export enum Quality {
  LOW = 1,
  NORMAL = 2,
  SUPERIOR = 3,
  MAGIC = 4,
  SET = 5,
  RARE = 6,
  UNIQUE = 7,
  CRAFTED = 8,
}
