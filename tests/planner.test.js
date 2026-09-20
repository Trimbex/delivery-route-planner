const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { planRoutes, MAX_TRIP_CAPACITY_KG, tripTotalWeight } = require('../src/planner');

function idsInTrips(result) {
  return new Set(
    result.trips.flatMap((trip) => trip.deliveries.map((d) => d.deliveryId)),
  );
}

describe('planRoutes', () => {
  it('plans sample data with one area per trip and no rejections', () => {
    const deliveries = [
      { deliveryId: 1, area: 'Nasr City', priority: 2, weightKg: 4.5 },
      { deliveryId: 2, area: 'Maadi', priority: 1, weightKg: 2.0 },
      { deliveryId: 3, area: 'Nasr City', priority: 3, weightKg: 1.2 },
      { deliveryId: 4, area: 'Zamalek', priority: 1, weightKg: 7.0 },
      { deliveryId: 5, area: 'Maadi', priority: 2, weightKg: 3.5 },
    ];
    const result = planRoutes(deliveries);

    assert.deepEqual(idsInTrips(result), new Set([1, 2, 3, 4, 5]));
    assert.equal(result.rejected.length, 0);
    for (const trip of result.trips) {
      assert.ok(tripTotalWeight(trip) <= MAX_TRIP_CAPACITY_KG);
      const areas = new Set(trip.deliveries.map((d) => d.area));
      assert.equal(areas.size, 1);
    }
  });

  it('returns empty result for empty input', () => {
    const result = planRoutes([]);
    assert.deepEqual(result.trips, []);
    assert.deepEqual(result.rejected, []);
  });

  it('rejects overweight packages', () => {
    const result = planRoutes([
      { deliveryId: 99, area: 'Maadi', priority: 1, weightKg: 10.1 },
    ]);
    assert.deepEqual(result.trips, []);
    assert.equal(result.rejected.length, 1);
  });

  it('groups same-priority deliveries by area and id order', () => {
    const deliveries = [
      { deliveryId: 10, area: 'B', priority: 1, weightKg: 2.0 },
      { deliveryId: 11, area: 'A', priority: 1, weightKg: 2.0 },
      { deliveryId: 12, area: 'A', priority: 1, weightKg: 2.0 },
    ];
    const result = planRoutes(deliveries);
    assert.deepEqual(idsInTrips(result), new Set([10, 11, 12]));
    const tripA = result.trips.find((t) => t.area === 'A');
    assert.ok(tripA);
    assert.deepEqual(
      new Set(tripA.deliveries.map((d) => d.deliveryId)),
      new Set([11, 12]),
    );
  });

  it('splits same-area deliveries when capacity is exceeded', () => {
    const result = planRoutes([
      { deliveryId: 1, area: 'Nasr City', priority: 1, weightKg: 6.0 },
      { deliveryId: 2, area: 'Nasr City', priority: 1, weightKg: 5.0 },
    ]);
    assert.equal(result.trips.length, 2);
    assert.deepEqual(idsInTrips(result), new Set([1, 2]));
  });

  it('combines same-area deliveries when priority allows', () => {
    const result = planRoutes([
      { deliveryId: 1, area: 'Maadi', priority: 1, weightKg: 4.0 },
      { deliveryId: 2, area: 'Maadi', priority: 2, weightKg: 4.0 },
    ]);
    assert.equal(result.trips.length, 1);
    assert.equal(tripTotalWeight(result.trips[0]), 8.0);
  });
});
