import { cloneDeep } from "lodash";
import { defineStore } from "pinia";

// TODO: Figure out how to import this from a TypeScript file not in the
//       public directory.
const worker = new Worker("./worker.js");

type Purchasable = "autobrewer";
type Upgradable = "autobrewer";

// How often ticks happen, in milliseconds.
export const TICK_RATE = 200;
export const TICKS_PER_SECOND = 1000 / TICK_RATE;

export type GameState = {
  lastSaveAt: number | null;
  lastNotableTickAt: number | null;
  tick: number;
  money: number;
  cupsOfTea: number;
  teaPerTick: number;
  teaPrice: number;
  rawDemand: number;
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

const BASE_VALUES = {
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

// The state of the game when the game starts or is manually reset.
const getDefaultGameState = (): GameState => {
  return {
    lastSaveAt: null,
    lastNotableTickAt: null,
    tick: 0,
    money: 0,
    cupsOfTea: 0,
    teaPrice: 2.0,
    teaPerTick: 0,
    rawDemand: BASE_VALUES.demand,
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

export const useGameStateStore = defineStore("gameState", {
  state: (): GameState => getDefaultGameState(),
  actions: {
    // Have the worker startup in the background and begin ticking.
    // TODO: this uses the old worker.js stuff, is it still needed? should it be moved to the appropriate mutation call? IDK!
    async startup() {
      worker.postMessage({ name: "startup", tick_rate: TICK_RATE });
    },
    // Handle ticking logic asynchronously from the worker.
    // TODO: this uses the old worker.js stuff, is it still needed? should it be moved to the appropriate mutation call? IDK!
    async tick() {
      worker.postMessage({
        name: "tick",
      });
    },
    sellTea(amount: number) {
      if (this.debugMode) {
        console.log(`Selling ${amount} cups of tea`);
      }
      if (amount < 0) {
        if (this.debugMode) {
          console.log("Cannot sell negative amounts of tea.");
        }
        amount = 0;
      }
      this.consumeTea(amount);
      this.earnMoney(amount * this.teaPrice);
    },
    purchaseUpgradable({ upgradable }: { upgradable: Upgradable }) {
      this.consumeTea(this.upgrades[upgradable].nextUpgradeCost);
      this.upgradeUpgradable({ upgradable: upgradable });
      this.recalculateTeaPerTick();
    },
    buyAutobrewer(amount: number) {
      let increaseRate = this.purchases.autobrewer.increaseRate;
      let price =
        (this.purchases.autobrewer.price *
          (1 - Math.pow(increaseRate, amount))) /
        (1 - increaseRate);
      this.consumeTea(price);
      this.increasePurchasablePrice({
        purchasable: "autobrewer",
        amount: amount,
      });
      this.increaseAutobrewerCount(amount);
      this.recalculateTeaPerTick();
    },
    // Brew based on the number of autobrewers we have, divided by the number of ticks that occur per second.
    autobrew() {
      this.brewTea(this.teaPerTick);
    },
    // Previously Mutations. They're the good children this migration.
    incrementTick() {
      this.tick++;
    },
    brewTea(amount = 1) {
      this.cupsOfTea += amount;
    },
    consumeTea(amount = 1) {
      this.cupsOfTea -= amount;
    },
    earnMoney(amount = 1) {
      this.money += amount;
    },
    spendMoney(amount = 1) {
      this.money -= amount;
    },
    increaseTeaPrice(amount = 0.01) {
      this.teaPrice += amount;
    },
    decreaseTeaPrice(amount = 0.01) {
      if (this.teaPrice - amount >= 0.01) {
        this.teaPrice -= amount;
      } else {
        this.teaPrice = 0.01;
        if (this.debugMode) {
          console.log("Unable to decrease price any further.");
        }
      }
    },
    recalculateRawDemand() {
      this.rawDemand =
        BASE_VALUES.demand *
        this.demandBonuses.level *
        this.demandBonuses.tastiness;
    },
    increaseAutobrewerCount(amount = 1) {
      this.purchases.autobrewer.count += amount;
    },
    increasePurchasablePrice(payload: {
      purchasable: Purchasable;
      amount: number | null;
    }) {
      if (payload.amount === null) {
        payload.amount = 1;
      }
      this.purchases[payload.purchasable].price *= Math.pow(
        this.purchases[payload.purchasable].increaseRate,
        payload.amount
      );
    },
    setLastNotableTickAt(payload: { datetime: number }) {
      this.lastNotableTickAt = payload.datetime;
    },
    upgradeUpgradable(payload: { upgradable: Upgradable }) {
      this.upgrades[payload.upgradable].level++;
      this.upgrades[payload.upgradable].currentOutputMultiplier *=
        this.upgrades[payload.upgradable].outputMultiplier;
      this.upgrades[payload.upgradable].nextUpgradeCost *=
        this.upgrades[payload.upgradable].costMultiplier;
    },
    // This mutation automatically triggers the persisted state plugin to activate.
    triggerSave() {
      this.lastSaveAt = Date.now();
    },
    hardReset() {
      if (localStorage.getItem("teaShopSave") !== null) {
        localStorage.removeItem("teaShopSave");
      }
      this.$state = getDefaultGameState();
    },
    toggleDebugMode() {
      this.debugMode = !this.debugMode;
    },
    recalculateTeaPerTick() {
      this.teaPerTick =
        (this.purchases.autobrewer.count *
          this.upgrades.autobrewer.currentOutputMultiplier) /
        TICKS_PER_SECOND;
    },
    replaceState(savedState: GameState) {
      this.$state = savedState;
    },
  },
});
