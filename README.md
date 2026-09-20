# Delivery Route Planner

Small Node.js program that reads delivery requests from a CSV file and groups them into vehicle trips. Each trip has a **10 kg** capacity limit, urgent deliveries (lower priority number) are handled first, and same-area stops are grouped when capacity allows.

## Requirements

- Node.js 18 or newer
- npm

## Setup

```bash
npm install
```

## How to run

Primary interface (reads deliveries from a file):

```bash
npm run plan -- sample_deliveries.csv
```

Optional flags:

```bash
npm run plan -- sample_deliveries.csv --summary
npm run plan -- sample_deliveries.csv --json
```

Run tests:

```bash
npm test
```

Optional HTTP API (same planning logic):

```bash
npm start
```

- `GET /health` — liveness check
- `POST /plan` — JSON body `{ "deliveries": [{ "id", "area", "priority", "weight_kg" }] }`

## Input format

CSV with header (sample file included: `sample_deliveries.csv`):

```csv
id,area,priority,weight_kg
1,Nasr City,2,4.5
2,Maadi,1,2.0
```

| Column | Meaning |
|--------|---------|
| `id` | Unique delivery identifier |
| `area` | Destination area |
| `priority` | Urgency — **lower number = more urgent** |
| `weight_kg` | Package weight in kilograms |

## Sample output

```
Trip 1 - Maadi - 5.5 kg - deliveries [2, 5]
Trip 2 - Zamalek - 7.0 kg - deliveries [4]
Trip 3 - Nasr City - 5.7 kg - deliveries [1, 3]
```

## Edge case behavior

| Case | Behavior |
|------|----------|
| No deliveries | Prints `No deliveries to plan.` |
| Package heavier than 10 kg | Rejected and listed under `Rejected deliveries:` with a reason |
| Same priority | Tie-break: area name (alphabetically), then delivery id |
| Next package would exceed capacity | Starts a new trip (same area when that delivery opens the trip) |

---

## Reasoning

### 1. Explain your solution approach in your own words.

The program reads deliveries from a CSV file and checks each row. It sorts them by priority (lower first), then area, then id. It goes through the list one by one. If a package fits on an existing trip to the same area, it adds it there. If not, it starts a new trip. Anything over 10 kg goes on a reject list instead of a trip. Every normal package ends up on exactly one trip.

### 2. What was the most difficult part of the assignment?

Getting urgent deliveries first while still grouping the same area when you can. You always handle lower priority numbers first, but you can only group with a trip that already goes to that area. Sometimes an urgent package to a new area starts a new trip even though another trip still has empty space in a different area. That is on purpose so urgency wins.

### 3. Are there situations where your algorithm may not produce the best possible grouping?

Yes. It picks the next step locally and does not try every possible trip plan. If priorities mix areas in a tricky order, you might use more trips than a smarter planner would. For example, two later packages in the same area might sit on two trips because an earlier urgent one elsewhere was placed first. The output is steady and makes sense, but it is not always the smallest number of trips.

### 4. If the input contained 1,000,000 delivery requests, what might become slow or memory-intensive?

Loading everything into memory would use a lot of RAM. Sorting a million rows takes noticeable time. For each delivery the code may scan all existing trips to find a same-area match, which gets slow when there are many trips. I would read the file in chunks, keep a map of open trips by area, and avoid holding the whole file in memory at once.

### 5. What would you improve if you had another day to work on the solution?

Keep a lookup of trips by area so you do not scan the full trip list every time. Add more tests that check rules like capacity and priority order. Maybe add a second pass to merge same-area trips when it still respects priority. Read big CSV files as a stream instead of one big read.

---

## Extension feature

Optional `--summary` and `--json` flags on the CLI.

`--summary` prints how many trips you got and average load on the 10 kg limit. `--json` prints the full plan as JSON for other programs.

I added these because the normal text output is fine for reading, but JSON is easier to plug into tools without parsing lines by hand.
