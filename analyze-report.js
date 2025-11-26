/**
 * Simple learner for CC Lemon reports.
 * Usage: node analyze-report.js cc-lemon-report.json [moreReports...]
 * Outputs aggregated stats and a suggested CPU weight tuning object.
 */
const fs = require("fs");
const path = require("path");

function loadReport(file) {
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw);
}

function aggregate(reports) {
  const agg = {
    totalRounds: 0,
    wins: { left: 0, right: 0 },
    actions: { left: { charge: 0, gun: 0, guard: 0 }, right: { charge: 0, gun: 0, guard: 0 } },
  };
  for (const rep of reports) {
    if (rep.winner === "左") agg.wins.left += 1;
    else if (rep.winner === "右") agg.wins.right += 1;
    for (const h of rep.history || []) {
      agg.totalRounds += 1;
      if (h.leftChoice && agg.actions.left[h.leftChoice]) agg.actions.left[h.leftChoice] += 1;
      if (h.rightChoice && agg.actions.right[h.rightChoice]) agg.actions.right[h.rightChoice] += 1;
    }
  }
  return agg;
}

function suggestWeights(agg) {
  const sum = Object.values(agg.actions.left).reduce((a, b) => a + b, 0) || 1;
  const usage = {
    charge: agg.actions.left.charge / sum,
    gun: agg.actions.left.gun / sum,
    guard: agg.actions.left.guard / sum,
  };
  // Simple heuristic: mirror player tendency but keep guard from going too low
  const weights = {
    charge: Math.max(0.2, usage.charge),
    gun: Math.max(0.2, usage.gun),
    guard: Math.max(0.15, usage.guard),
  };
  const total = weights.charge + weights.gun + weights.guard;
  return {
    charge: Number((weights.charge / total).toFixed(2)),
    gun: Number((weights.gun / total).toFixed(2)),
    guard: Number((weights.guard / total).toFixed(2)),
  };
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: node analyze-report.js report1.json [report2.json ...]");
    process.exit(1);
  }
  const reports = files.map((f) => loadReport(path.resolve(f)));
  const agg = aggregate(reports);
  const suggestion = suggestWeights(agg);
  console.log("Aggregated stats:");
  console.log(JSON.stringify(agg, null, 2));
  console.log("\nSuggested CPU weights (charge/gun/guard):");
  console.log(suggestion);
}

main();
