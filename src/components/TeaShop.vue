<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useGameStateStore } from '../store';
import Options from './Options.vue';
import { DECIMAL_PLACES, TICKS_PER_SECOND } from '../constants';

export default defineComponent({
  name: 'TeaShop',
  components: {
    Options
  },
  setup(_props, _context) {
    const store = useGameStateStore();
    const cupsOfTea = computed(() => store.cupsOfTea);
    const teaPerSecond = computed(() => Math.round(store.teaPerTick * TICKS_PER_SECOND));
    const roundedCupsOfTea = computed(() => Math.round(store.cupsOfTea));
    const autobrewerCount = computed(() => store.purchases.autobrewer.count);
    const money = computed(() => store.money);
    const teaPrice = computed(() => store.teaPrice);
    const roundedTeaPrice = computed(() => store.teaPrice.toFixed(DECIMAL_PLACES));
    const demand = computed(() => store.teaSoldThisTick.toFixed(DECIMAL_PLACES));

    const brewTea = () => store.brewTea();
    const increaseTeaPrice = (amount: number) => store.increaseTeaPrice(amount);
    const decreaseTeaPrice = (amount: number) => store.decreaseTeaPrice(amount)

    const autobrewerCost = computed(() => store.purchases.autobrewer.price);
    const multipleAutobrewerCost = computed(() => {
      return (amount: number) => Math.round(autobrewerCost.value * ((1 - Math.pow(store.purchases.autobrewer.increaseRate, amount)) / (1 - store.purchases.autobrewer.increaseRate)));
    });
    const autobrewerUpgradeCost = computed(() => store.upgrades.autobrewer.nextUpgradeCost);

    const buyAutobrewer = (amount: number) => store.buyAutobrewer(amount);
    const upgradeAutobrewer = () => store.upgradeUpgradable({ upgradable: 'autobrewer' });

    // Trigger startup so the ticking happens in the background worker process.
    store.startup();

    return {
      cupsOfTea,
      teaPerSecond,
      roundedCupsOfTea,
      money,
      teaPrice,
      roundedTeaPrice,
      demand,
      autobrewerCount,
      autobrewerCost,
      multipleAutobrewerCost,
      autobrewerUpgradeCost,
      brewTea,
      increaseTeaPrice,
      decreaseTeaPrice,
      buyAutobrewer,
      upgradeAutobrewer
    };
  },
});
</script>

<template>
  <h1>Tea Shop</h1>

  <p>${{ $filters.humanize(money, { short: true, money: true }) }}</p>
  <p>Price for a Cup of Tea: ${{ roundedTeaPrice }}</p>
  <p>Demand: {{ demand }}%</p>
  <p>{{ $filters.humanize(roundedCupsOfTea, { short: true }) }} {{ $filters.pluralize(roundedCupsOfTea, 'Cup') }} of Tea</p>
  <p>({{ $filters.humanize(teaPerSecond, { short: true }) }} {{ $filters.pluralize(teaPerSecond, 'cup') }}/sec)</p>
  <p v-if="autobrewerCount > 0">{{ autobrewerCount }} {{ $filters.pluralize(autobrewerCount, 'Autobrewer') }}</p>

  <div class="buttons">
    <button type="button" @click="brewTea">
      Brew a cup of tea
    </button>
    <button type="button" @click="increaseTeaPrice(0.10)">
      Increase Price of Tea
    </button>
    <button type="button" :disabled="teaPrice - 0.01 < 0.01" @click="decreaseTeaPrice(0.10)">
      Decrease Price of Tea
    </button>
    <button type="button" :disabled="cupsOfTea < Math.ceil(autobrewerCost)" @click="buyAutobrewer(1)">
      Buy an autobrewer ({{ $filters.humanize(Math.round(autobrewerCost), { short: true }) }} {{ $filters.pluralize(autobrewerCost, 'cup') }})
    </button>
    <button type="button" :disabled="cupsOfTea < Math.ceil(multipleAutobrewerCost(10))" @click="buyAutobrewer(10)">
      Buy 10 autobrewers ({{ $filters.humanize(multipleAutobrewerCost(10), { short: true }) }} {{ $filters.pluralize(multipleAutobrewerCost(10), 'cup') }})
    </button>
  </div>

  <br/>
  <div>
    <h4>Upgrades</h4>
    <div class="buttons">
      <button type="button" :disabled="cupsOfTea < Math.ceil(autobrewerUpgradeCost)" @click="upgradeAutobrewer">
        Upgrade autobrewers ({{ $filters.humanize(autobrewerUpgradeCost, { short: true }) }} {{ $filters.pluralize(autobrewerUpgradeCost, 'cup') }})
      </button>
    </div>
  </div>

  <br/>
  <br/>
  <Options />
</template>

<style scoped lang="scss">
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}

.buttons {
  display: flex;
  flex-flow: row wrap;
  margin: auto;
  width: 250px;

  button {
    margin: auto;
    margin-top: 5px;
    display: block;
    width: 250px;
  }
}
</style>
