const MAX_TRIP_CAPACITY_KG = 10;

/**
 * @typedef {{ deliveryId: number, area: string, priority: number, weightKg: number }} Delivery
 * @typedef {{ tripNumber: number, area: string, deliveries: Delivery[] }} Trip
 * @typedef {{ trips: Trip[], rejected: Array<{ delivery: Delivery, reason: string }> }} PlanResult
 */

/**
 * @param {Delivery[]} deliveries
 * @returns {PlanResult}
 */
function planRoutes(deliveries) {
  const ordered = [...deliveries].sort(
    (a, b) =>
      a.priority - b.priority ||
      a.area.localeCompare(b.area, undefined, { sensitivity: 'accent' }) ||
      a.deliveryId - b.deliveryId,
  );

  /** @type {Trip[]} */
  const trips = [];
  /** @type {PlanResult['rejected']} */
  const rejected = [];

  for (const delivery of ordered) {
    if (delivery.weightKg > MAX_TRIP_CAPACITY_KG) {
      rejected.push({
        delivery,
        reason: `weight ${delivery.weightKg} kg exceeds vehicle capacity (${MAX_TRIP_CAPACITY_KG} kg)`,
      });
      continue;
    }

    let placed = false;
    for (const trip of trips) {
      if (trip.area !== delivery.area) {
        continue;
      }
      const total = tripTotalWeight(trip);
      if (total + delivery.weightKg <= MAX_TRIP_CAPACITY_KG) {
        trip.deliveries.push(delivery);
        placed = true;
        break;
      }
    }

    if (!placed) {
      trips.push({
        tripNumber: trips.length + 1,
        area: delivery.area,
        deliveries: [delivery],
      });
    }
  }

  return { trips, rejected };
}

/** @param {Trip} trip */
function tripTotalWeight(trip) {
  return trip.deliveries.reduce((sum, d) => sum + d.weightKg, 0);
}

/** @param {PlanResult} result */
function utilizationPercent(result) {
  if (result.trips.length === 0) {
    return 0;
  }
  const used = result.trips.reduce((sum, t) => sum + tripTotalWeight(t), 0);
  const capacity = result.trips.length * MAX_TRIP_CAPACITY_KG;
  return (used / capacity) * 100;
}

module.exports = {
  MAX_TRIP_CAPACITY_KG,
  planRoutes,
  tripTotalWeight,
  utilizationPercent,
};
