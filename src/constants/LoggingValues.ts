export const ErrorValues = {};
export const DebugValues = {
  MinimumPriceReached: "Unable to decrease price any further.",
  SaveInProgress: "Saving State...",
  DeleteInProgress: "Deleting State...",
  SellingCups: (amount: number) => `Selling ${amount} cups of tea`,
  CannotSellNegativeTea: "Cannot sell negative amounts of tea.",
  EventFired: (eventName: string) => `Event fired: ${eventName}`,
  TimeSinceLastNotableTick: (milliseconds: number) =>
    `${milliseconds}ms since last notable tick.`,
  Inventory: (cupsOfTea: number) => `${cupsOfTea} cups of tea`,
};
