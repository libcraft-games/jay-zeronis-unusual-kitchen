self.onmessage = (e) => {
  if (e.data.name === "startup") {
    const TICKS_PER_SECOND = e.data.TICKS_PER_SECOND;
    const TICK_RATE = e.data.TICK_RATE;

    // The heartbeat of the game baybee
    setInterval(() => {
      self.postMessage({
        name: "tick",
        ticks_per_second: TICKS_PER_SECOND,
      });
    }, TICK_RATE);
  }
};
