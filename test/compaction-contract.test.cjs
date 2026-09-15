const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const indexSource = readFileSync(join(__dirname, "../.pi/extensions/pi-goal/index.ts"), "utf8");

test("goal state is reconstructed before compaction and inactive goals are ignored", () => {
	assert.match(indexSource, /pi\.on\("session_before_compact"/);
	assert.match(indexSource, /event\.branchEntries/);
	assert.match(indexSource, /goalCompactInstructions/);
	assert.match(indexSource, /if \(!goal \|\| goal\.status !== "active"\) return;/);
});

test("an active goal is re-injected after successful compaction", () => {
	assert.match(indexSource, /pi\.on\("session_compact"/);
	assert.match(indexSource, /emitGoalEvent\(pi, "continuation", goal/);
	assert.match(indexSource, /ctx\.hasPendingMessages\(\)/);
});

test("re-inject is skipped when kept context already carries the goal prompt", () => {
	assert.match(indexSource, /keptGoalPromptExists\(branch, event\.compactionEntry\.firstKeptEntryId, goal\.id\)/);
	assert.match(indexSource, /custom_message/);
});
