const fs = require('fs');
const path = require('path');
const { tripTotalWeight, utilizationPercent } = require('./planner');

const REQUIRED_COLUMNS = ['id', 'area', 'priority', 'weight_kg'];

/**
 * @param {string} filePath
 * @returns {import('./planner').Delivery[]}
 */
function loadDeliveriesCsv(filePath) {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty or missing a header row');
  }

  const header = parseCsvLine(lines[0]);
  const missing = REQUIRED_COLUMNS.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    throw new Error(`CSV missing columns: ${missing.sort().join(', ')}`);
  }

  const columnIndex = Object.fromEntries(header.map((name, index) => [name, index]));

  /** @type {import('./planner').Delivery[]} */
  const deliveries = [];

  for (let index = 1; index < lines.length; index += 1) {
    const rowNumber = index + 1;
    const values = parseCsvLine(lines[index]);

    try {
      const area = (values[columnIndex.area] ?? '').trim();
      if (!area) {
        throw new Error('area is required');
      }

      const deliveryId = Number.parseInt(values[columnIndex.id], 10);
      const priority = Number.parseInt(values[columnIndex.priority], 10);
      const weightKg = Number.parseFloat(values[columnIndex.weight_kg]);

      if (
        Number.isNaN(deliveryId) ||
        Number.isNaN(priority) ||
        Number.isNaN(weightKg)
      ) {
        throw new Error('invalid numeric field');
      }

      if (weightKg <= 0) {
        throw new Error('weight_kg must be positive');
      }

      deliveries.push({ deliveryId, area, priority, weightKg });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid row values';
      throw new Error(`Row ${rowNumber}: ${message}`);
    }
  }

  return deliveries;
}

/** @param {import('./planner').PlanResult} result */
function formatPlanText(result) {
  if (result.trips.length === 0 && result.rejected.length === 0) {
    return 'No deliveries to plan.';
  }

  const lines = [];
  for (const trip of result.trips) {
    const ids = trip.deliveries.map((d) => d.deliveryId).join(', ');
    const weight = tripTotalWeight(trip).toFixed(1);
    lines.push(
      `Trip ${trip.tripNumber} - ${trip.area} - ${weight} kg - deliveries [${ids}]`,
    );
  }

  if (result.rejected.length > 0) {
    lines.push('');
    lines.push('Rejected deliveries:');
    for (const { delivery, reason } of result.rejected) {
      lines.push(`  ID ${delivery.deliveryId} (${delivery.area}): ${reason}`);
    }
  }

  return lines.join('\n');
}

/** @param {import('./planner').PlanResult} result */
function planToJson(result) {
  return {
    trips: result.trips.map((trip) => ({
      trip_number: trip.tripNumber,
      area: trip.area,
      total_weight_kg: Number(tripTotalWeight(trip).toFixed(3)),
      delivery_ids: trip.deliveries.map((d) => d.deliveryId),
    })),
    rejected: result.rejected.map(({ delivery, reason }) => ({
      delivery_id: delivery.deliveryId,
      area: delivery.area,
      reason,
    })),
    stats: {
      trip_count: result.trips.length,
      rejected_count: result.rejected.length,
      average_utilization_percent: Number(utilizationPercent(result).toFixed(2)),
    },
  };
}

function parseCsvLine(line) {
  return line.split(',').map((value) => value.trim());
}

module.exports = {
  loadDeliveriesCsv,
  formatPlanText,
  planToJson,
};
