const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const root = join(__dirname, "..");
const indexSource = readFileSync(join(root, ".pi/extensions/pi-goal/index.ts"), "utf8");
const skillSource = readFileSync(join(root, "skills/pi-goal-writer/SKILL.md"), "utf8");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

for (const part of ["Outcome", "Verification surface", "Constraints", "Boundaries", "Iteration policy", "Blocked stop condition"]) {
	test(`skill documents ${part.toLowerCase()}`, () => {
		assert.match(skillSource, new RegExp(`\\*\\*${part}\\*\\*`));
	});
}

test("skill metadata and package discovery remain valid", () => {
	assert.match(skillSource, /^name: pi-goal-writer$/m);
	assert.match(skillSource, /^description: .+$/m);
	assert.deepEqual(manifest.pi.skills, ["skills"]);
});

test("skill and create_goal share clarification, grounding, and blocked-stop guidance", () => {
	for (const phrase of [
		"Ground the verification surface in repo reality; never invent command, file, or test names.",
		"ask up to three clarifying questions",
		"otherwise make safe assumptions explicit",
		"Re-check Constraints and Boundaries",
		"evidence gathered, attempted paths, the exact blocker, and the next needed input",
	]) {
		const pattern = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
		assert.match(indexSource, pattern);
		assert.match(skillSource, pattern);
	}
});
