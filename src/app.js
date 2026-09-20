const express = require('express');
const { planRoutes } = require('./planner');
const { planToJson } = require('./deliveryIo');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/plan', (req, res) => {
  const { deliveries } = req.body ?? {};
  if (!Array.isArray(deliveries)) {
    return res.status(400).json({ error: 'Request body must include a deliveries array' });
  }

  try {
    const normalized = deliveries.map((row, index) => {
      const deliveryId = Number(row.deliveryId ?? row.id);
      const area = String(row.area ?? '').trim();
      const priority = Number(row.priority);
      const weightKg = Number(row.weightKg ?? row.weight_kg);

      if (!area) {
        throw new Error(`deliveries[${index}]: area is required`);
      }
      if (
        Number.isNaN(deliveryId) ||
        Number.isNaN(priority) ||
        Number.isNaN(weightKg)
      ) {
        throw new Error(`deliveries[${index}]: id, priority, and weight must be numeric`);
      }
      if (weightKg <= 0) {
        throw new Error(`deliveries[${index}]: weight must be positive`);
      }

      return { deliveryId, area, priority, weightKg };
    });

    const result = planRoutes(normalized);
    return res.json(planToJson(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Delivery route planner API listening on http://localhost:${port}`);
  });
}

module.exports = app;
