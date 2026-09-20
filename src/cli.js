const fs = require('fs');
const { planRoutes } = require('./planner');
const { loadDeliveriesCsv, formatPlanText, planToJson } = require('./deliveryIo');
const { utilizationPercent } = require('./planner');

function printUsage() {
  console.log(`Usage: npm run plan -- <input.csv> [--summary] [--json]

Organize delivery requests into vehicle trips (max 10 kg each).

Options:
  --summary   Append trip count and average vehicle utilization
  --json      Print the plan as JSON
  --help      Show this help message`);
}

function parseArgs(argv) {
  /** @type {{ inputFile?: string, summary: boolean, json: boolean }} */
  const options = { summary: false, json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--summary') {
      options.summary = true;
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (!arg.startsWith('-') && !options.inputFile) {
      options.inputFile = arg;
    }
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.inputFile) {
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(options.inputFile)) {
    console.error(`Input file not found: ${options.inputFile}`);
    process.exit(1);
  }

  let deliveries;
  try {
    deliveries = loadDeliveriesCsv(options.inputFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Invalid input: ${message}`);
    process.exit(1);
  }

  const result = planRoutes(deliveries);

  if (options.json) {
    console.log(JSON.stringify(planToJson(result), null, 2));
    process.exit(0);
  }

  console.log(formatPlanText(result));
  if (options.summary && result.trips.length > 0) {
    console.log('');
    console.log(
      `Summary: ${result.trips.length} trip(s), average utilization ${utilizationPercent(result).toFixed(1)}%`,
    );
  }
}

main();
