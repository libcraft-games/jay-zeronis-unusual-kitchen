import { BASE_VALUES } from "../constants/GameValues";

export type Purchasable = "autobrewer";
export type Upgradable = "autobrewer";

export type GameState = {
  lastSaveAt: number | null;
  lastNotableTickAt: number | null;
  tick: number;
  ticksPerSecond: number;
  money: number;
  cupsOfTea: number;
  teaPrice: number;
  demandBonuses: {
    level: number;
    tastiness: number;
  };
  purchases: {
    [key in Purchasable]: {
      count: number;
      price: number;
      increaseRate: number;
    };
  };
  upgrades: {
    [key in Upgradable]: {
      level: number;
      currentOutputMultiplier: number;
      outputMultiplier: number;
      costMultiplier: number;
      nextUpgradeCost: number;
    };
  };
  debugMode: boolean;
};

// The state of the game when the game starts or is manually reset.
export const getDefaultGameState = (): GameState => {
  return {
    lastSaveAt: null,
    lastNotableTickAt: null,
    tick: 0,
    money: 0,
    cupsOfTea: 0,
    teaPrice: 2.0,
    ticksPerSecond: 5,
    demandBonuses: {
      level: 1,
      tastiness: 1,
    },
    purchases: {
      autobrewer: {
        count: 0,
        price: BASE_VALUES.purchases.autobrewer.price,
        increaseRate: BASE_VALUES.purchases.autobrewer.increaseRate,
      },
    },
    upgrades: {
      autobrewer: {
        level: 0,
        currentOutputMultiplier: 1.0,
        outputMultiplier: BASE_VALUES.upgrades.autobrewer.outputMultiplier,
        costMultiplier: BASE_VALUES.upgrades.autobrewer.costMultiplier,
        nextUpgradeCost: BASE_VALUES.upgrades.autobrewer.nextUpgradeCost,
      },
    },
    debugMode: false,
  };
};
