import { cloneDeep } from "lodash";
import { defineStore } from "pinia";
import {
  GameState,
  Upgradable,
  Purchasable,
  getDefaultGameState,
} from "./models/GameState";
import {
  DebugValues,
  AUTOBREWER_KEY,
  BASE_VALUES,
  SAVE_STATE_KEY,
  TICKS_PER_SECOND,
  TICK_RATE,
  SAVE_FREQUENCY_IN_SECONDS,
  GAME_STORE_KEY,
} from "./constants";
import { WorkerEvents } from "./constants/WorkerEventNames";
import {
  MINIMUM_PRICE_CHANGE,
  MINIMUM_SELLING_UNIT,
  MINIMUM_UNIT,
} from "./constants/GameValues";

// TODO: Figure out how to import this from a TypeScript file not in the
//       public directory.
const worker = new Worker("./worker.js");

worker.onmessage = (event) => {
  const store = useGameStateStore();
  if (store.debugMode) console.log(DebugValues.EventFired(event.data.name));
  switch (event.data.name) {
    case WorkerEvents.TICK:
      store.ticksPerSecond = event.data.ticks_per_second;
      const isNotableTick = store.tick % store.ticksPerSecond === 0;
      if (isNotableTick) {
        // store current datetime as lastNotableTickAt
        let now = Date.now();
        // TODO: logged here is ruining my perfect switch. FIX IT 😭
        if (store.debugMode && store.lastNotableTickAt !== null) {
          console.log(
            DebugValues.TimeSinceLastNotableTick(now - store.lastNotableTickAt)
          );
          console.log(DebugValues.Inventory(store.cupsOfTea));
        }
        store.setLastNotableTickAt(now);

        // sell tea. If the demand exceeds the supply sell our whole inventory.
        store.demandExceedsSupply
          ? store.sellTea(store.cupsOfTea)
          : store.sellTea(store.teaSoldThisTick);
      }

      store.tick++;
      store.autobrew();

      // Autosave every X seconds
      const saveFrequencyInTicks =
        store.ticksPerSecond * SAVE_FREQUENCY_IN_SECONDS;
      if (store.tick % saveFrequencyInTicks === 0) {
        store.save();
      }

      break;
    case WorkerEvents.LOAD_STATE:
      const loadedString = localStorage.getItem(SAVE_STATE_KEY);
      if (loadedString !== null) {
        store.replaceState(JSON.parse(loadedString));
      }
      break;
  }
};

export const useGameStateStore = defineStore(GAME_STORE_KEY, {
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
      // TODO: Should 0.8 and 1.15 be constants?
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
        name: WorkerEvents.STARTUP,
        TICKS_PER_SECOND: TICKS_PER_SECOND,
        TICK_RATE: TICK_RATE,
      });
    },
    async save() {
      if (this.debugMode) console.log(DebugValues.SaveInProgress);
      localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(this.$state));
    },
    async hardReset() {
      if (localStorage.getItem(SAVE_STATE_KEY) !== null) {
        if (this.debugMode) console.log(DebugValues.DeleteInProgress);
        localStorage.removeItem(SAVE_STATE_KEY);
      }
      this.$reset();
    },
    sellTea(amount: number) {
      if (this.debugMode) {
        console.log(DebugValues.SellingCups(amount));
      }
      if (amount < MINIMUM_SELLING_UNIT) {
        if (this.debugMode) {
          console.log(DebugValues.CannotSellNegativeTea);
        }
        amount = MINIMUM_SELLING_UNIT;
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
        purchasable: AUTOBREWER_KEY,
        amount: amount,
      });
      this.increaseAutobrewerCount(amount);
    },
    // Brew based on the number of autobrewers we have, divided by the number of ticks that occur per second.
    autobrew() {
      this.brewTea(this.teaPerTick);
    },
    // Previously Mutations. They're the good children this migration.
    brewTea(amount = MINIMUM_UNIT) {
      this.cupsOfTea += amount;
    },
    consumeTea(amount = MINIMUM_UNIT) {
      this.cupsOfTea -= amount;
    },
    earnMoney(amount = MINIMUM_UNIT) {
      this.money += amount;
    },
    spendMoney(amount = MINIMUM_UNIT) {
      this.money -= amount;
    },
    increaseTeaPrice(amount = MINIMUM_PRICE_CHANGE) {
      this.teaPrice += amount;
    },
    decreaseTeaPrice(amount = MINIMUM_PRICE_CHANGE) {
      if (this.teaPrice - amount >= MINIMUM_PRICE_CHANGE) {
        this.teaPrice -= amount;
      } else {
        this.teaPrice = MINIMUM_PRICE_CHANGE;
        if (this.debugMode) {
          console.log(DebugValues.MinimumPriceReached);
        }
      }
    },
    increaseAutobrewerCount(amount = MINIMUM_UNIT) {
      this.purchases.autobrewer.count += amount;
    },
    increasePurchasablePrice(payload: {
      purchasable: Purchasable;
      amount: number | null;
    }) {
      if (payload.amount === null) {
        payload.amount = MINIMUM_UNIT;
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
