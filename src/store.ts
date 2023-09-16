import { cloneDeep } from "lodash";
import { defineStore } from "pinia";

// TODO: Figure out how to import this from a TypeScript file not in the
//       public directory.
const worker = new Worker("./worker.js");

// TODO: constants for the constants file, blood for the blood god.
export const TICK_RATE = 200;
export const TICKS_PER_SECOND = 1000 / TICK_RATE;
export const SAVE_STATE_KEY = "teaShopSaveState";

worker.onmessage = (event) => {
  const store = useGameStateStore();
  if (store.debugMode) console.log(`Event: ${event.data.name}`);
  // TODO: all worker event names should be stored in a constants file and we should use this in place of magic strings
  switch (event.data.name) {
    case "tick":
      store.ticksPerSecond = event.data.ticks_per_second;
      const isNotableTick = store.tick % store.ticksPerSecond === 0;
      if (isNotableTick) {
        // store current datetime as lastNotableTickAt
        let now = Date.now();
        // TODO: logged here is ruining my perfect switch. FIX IT 😭
        if (store.debugMode && store.lastNotableTickAt !== null) {
          console.log(
            `${now - store.lastNotableTickAt}ms since last notable tick.`
          );
          console.log(`${store.cupsOfTea} cups of tea`);
        }
        store.setLastNotableTickAt(now);

        // sell tea. If the demand exceeds the supply sell our whole inventory.
        store.demandExceedsSupply
          ? store.sellTea(store.cupsOfTea)
          : store.sellTea(store.teaSoldThisTick);
      }

      store.tick++;
      store.autobrew();

      // Autosave every 30 seconds
      if (store.tick % (store.ticksPerSecond * 30) === 0) {
        store.save();
      }

      break;
    case "loadState":
      const loadedString = localStorage.getItem(SAVE_STATE_KEY);
      if (loadedString !== null) {
        store.replaceState(JSON.parse(loadedString));
      }
      break;
  }
};

type Purchasable = "autobrewer";
type Upgradable = "autobrewer";

// How often ticks happen, in milliseconds.

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

export const useGameStateStore = defineStore("gameStore", {
  state: (): GameState => getDefaultGameState(),
  getters: {
    rawDemand(): number {
      return (
        BASE_VALUES.demand *
        this.demandBonuses.level *
        this.demandBonuses.tastiness
      );
    },
    teaSoldThisTick(): number {
      return (this.rawDemand / 100) * Math.pow(0.8 / this.teaPrice, 1.15);
    },
    demandExceedsSupply(): boolean {
      return this.teaSoldThisTick > this.cupsOfTea;
    },
    teaPerTick(): number {
      return (
        (this.purchases.autobrewer.count *
          this.upgrades.autobrewer.currentOutputMultiplier) /
        this.ticksPerSecond
      );
    },
  },
  actions: {
    async startup() {
      worker.postMessage({
        name: "startup",
        TICKS_PER_SECOND: TICKS_PER_SECOND,
        TICK_RATE: TICK_RATE,
      });
    },
    async save() {
      if (this.debugMode) console.log("Saving State...");
      localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(this.$state));
    },
    async hardReset() {
      if (localStorage.getItem(SAVE_STATE_KEY) !== null) {
        if (this.debugMode) console.log("Deleting State...");
        localStorage.removeItem(SAVE_STATE_KEY);
      }
      this.$reset();
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
    },
    // Brew based on the number of autobrewers we have, divided by the number of ticks that occur per second.
    autobrew() {
      this.brewTea(this.teaPerTick);
    },
    // Previously Mutations. They're the good children this migration.
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
    setLastNotableTickAt(datetime: number) {
      this.lastNotableTickAt = datetime;
    },
    upgradeUpgradable(payload: { upgradable: Upgradable }) {
      this.upgrades[payload.upgradable].level++;
      this.upgrades[payload.upgradable].currentOutputMultiplier *=
        this.upgrades[payload.upgradable].outputMultiplier;
      this.upgrades[payload.upgradable].nextUpgradeCost *=
        this.upgrades[payload.upgradable].costMultiplier;
    },
    toggleDebugMode() {
      this.debugMode = !this.debugMode;
    },
    replaceState(savedState: GameState) {
      this.$patch({
        lastSaveAt: savedState.lastSaveAt,
        lastNotableTickAt: savedState.lastNotableTickAt,
        tick: savedState.tick,
        ticksPerSecond: savedState.ticksPerSecond,
        money: savedState.money,
        cupsOfTea: savedState.cupsOfTea,
        teaPrice: savedState.teaPrice,
        demandBonuses: savedState.demandBonuses,
        purchases: savedState.purchases,
        upgrades: savedState.upgrades,
        debugMode: savedState.debugMode,
      });
    },
  },
});
