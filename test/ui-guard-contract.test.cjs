const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const indexSource = readFileSync(join(__dirname, "../.pi/extensions/pi-goal/index.ts"), "utf8");

test("goal replacement requires UI confirmation and does not auto-replace headlessly", () => {
	assert.match(indexSource, /if \(!ctx\.hasUI\) \{/);
	assert.match(indexSource, /Cannot replace an existing goal without UI confirmation/);
	assert.match(indexSource, /const ok = await ctx\.ui\.confirm\("Replace goal\?"/);
});

test("UI notifications and status updates are guarded by hasUI", () => {
	assert.match(indexSource, /if \(ctx\.hasUI\) ctx\.ui\.notify/);
	assert.match(indexSource, /if \(ctx\.hasUI\) ctx\.ui\.setStatus/);
});
