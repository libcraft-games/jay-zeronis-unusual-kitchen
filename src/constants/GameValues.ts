export const BASE_VALUES = {
  purchases: {
    autobrewer: {
      price: 10,
      increaseRate: 1.01,
    },
  },
  upgrades: {
    autobrewer: {
      outputMultiplier: 2.0,
      costMultiplier: 5,
      nextUpgradeCost: 100,
    },
  },
  demand: 100,
};
export const TICK_RATE = 200;
export const TICKS_PER_SECOND = 1000 / TICK_RATE;
export const SAVE_STATE_KEY = "teaShopSaveState";
export const AUTOBREWER_KEY = "autobrewer";
export const SAVE_FREQUENCY_IN_SECONDS = 30;
export const GAME_STORE_KEY = "gameStore";
export const MINIMUM_UNIT = 1;
export const MINIMUM_PRICE_CHANGE = 0.01;
export const MINIMUM_SELLING_UNIT = 0;
export const DECIMAL_PLACES = 2;
