import { useGameStateStore } from "./store";

// Based partially off this blog post: https://logaretm.com/blog/vuex-off-main-thread
self.onmessage = (e) => {
  let store = useGameStateStore();
  if (e.data.name === "tick") {
    const state = store.$state;
    console.debug(state);
    const isNotableTick = state.tick % e.data.ticks_per_second === 0;

    if (isNotableTick) {
      let now = Date.now();
      if (state.debugMode && state.lastNotableTickAt !== null) {
        console.log(
          `${now - state.lastNotableTickAt}ms since last notable tick.`
        );
        console.log(`${state.cupsOfTea} cups of tea`);
      }
      state.setLastNotableTickAt(now);
    }

    state.tick();
    state.autobrew();

    if (isNotableTick) {
      let teaSoldThisTick =
        (state.rawDemand / 100) * Math.pow(0.8 / state.teaPrice, 1.15);
      // Cap the amount sold to the amount of tea we have right now, to prevent selling more than we have.
      if (teaSoldThisTick > state.cupsOfTea) {
        if (state.debugMode) {
          console.log(`${teaSoldThisTick} demanded, more than available`);
        }
        teaSoldThisTick = state.cupsOfTea;
      }
      // Calculate tea sold this tick and then sell it
      state.sellTea(teaSoldThisTick);
    }

    // Autosave every 30 seconds.
    if (e.data.state.tick % (e.data.ticks_per_second * 30) === 0) {
      state.triggerSave();
    }
  } else if (e.data.name === "startup") {
    const postTickMessage = () => {
      state.tick();
    };
    setInterval(postTickMessage, e.data.tick_rate);
  }
};
