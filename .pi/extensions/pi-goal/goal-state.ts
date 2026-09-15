export type GoalStatus = "active" | "paused" | "budget_limited" | "complete";

export type GoalState = {
	version: 1;
	id: string;
	objective: string;
	status: GoalStatus;
	tokenBudget: number | null;
	tokensUsed: number;
	timeUsedSeconds: number;
	createdAt: number;
	updatedAt: number;
};

export type GoalEventKind = "active" | "continuation" | "paused" | "resumed" | "cleared" | "budget_limited" | "complete";

export type GoalStatusDetail = {
	remainingTokens: number | null;
	elapsed: string;
	updatedAt: string;
	id: string;
};

export function parseTokenBudget(input: string): { objective: string; tokenBudget: number | null; error?: string } {
	const match = input.match(/(?:^|\s)--tokens(?:=|\s+)(\S+\s*[kKmM]?)(?:\s|$)/);
	if (!match) return { objective: input.trim(), tokenBudget: null };

	const raw = match[1].replace(/\s+/g, "");
	const suffix = raw.slice(-1).toLowerCase();
	const numeric = suffix === "k" || suffix === "m" ? raw.slice(0, -1) : raw;
	const value = Number(numeric);
	if (!Number.isFinite(value) || value <= 0) {
		return { objective: input.trim(), tokenBudget: null, error: "Token budget must be positive." };
	}
	const multiplier = suffix === "m" ? 1_000_000 : suffix === "k" ? 1_000 : 1;
	const tokenBudget = Math.round(value * multiplier);
	const objective = (input.slice(0, match.index) + " " + input.slice((match.index ?? 0) + match[0].length)).trim();
	return { objective, tokenBudget };
}

export function normalizeTokenBudget(value: unknown): { tokenBudget: number | null; error?: string } {
	if (value == null) return { tokenBudget: null };
	const tokenBudget = Math.round(Number(value));
	if (!Number.isFinite(tokenBudget) || tokenBudget <= 0) {
		return { tokenBudget: null, error: "tokenBudget must be a positive number when provided." };
	}
	return { tokenBudget };
}

export function formatTokens(value: number): string {
	if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
	if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
	return String(value);
}

export function formatElapsed(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remMinutes = minutes % 60;
	return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

export function statusLine(state: GoalState | null): string | undefined {
	if (!state) return undefined;
	const budget = state.tokenBudget ? ` (${formatTokens(state.tokensUsed)} / ${formatTokens(state.tokenBudget)})` : ` (${formatElapsed(state.timeUsedSeconds)})`;
	if (state.status === "active") return `Pursuing goal${budget}`;
	if (state.status === "paused") return "Goal paused (/goal resume)";
	if (state.status === "budget_limited") return state.tokenBudget ? `Goal unmet${budget}` : "Goal unmet";
	return `Goal achieved${budget}`;
}

export function goalUsage(state: GoalState): string {
	if (state.tokenBudget != null) return `${formatTokens(state.tokensUsed)} / ${formatTokens(state.tokenBudget)} tokens`;
	return formatElapsed(state.timeUsedSeconds);
}

export function goalStatusDetail(state: GoalState): GoalStatusDetail {
	return {
		remainingTokens: state.tokenBudget == null ? null : Math.max(0, state.tokenBudget - state.tokensUsed),
		elapsed: formatElapsed(state.timeUsedSeconds),
		updatedAt: new Date(state.updatedAt).toISOString(),
		id: state.id.slice(0, 12),
	};
}

// Keep this compact context available for re-injection after compaction. It is
// deliberately an audit contract, not a dump of the full continuation prompt.
export function goalCompactInstructions(state: GoalState): string {
	const remainingTokens = state.tokenBudget == null ? "unlimited" : formatTokens(Math.max(0, state.tokenBudget - state.tokensUsed));
	return `Active goal context to preserve after compaction.

<untrusted_objective>
${state.objective}
</untrusted_objective>

Usage: ${goalUsage(state)}
Remaining tokens: ${remainingTokens}

Audit rules:
- Re-check the objective against concrete evidence in the current repository or session.
- Re-check Constraints and Boundaries before changing scope or declaring completion.
- If blocked, report evidence gathered, attempted paths, the exact blocker, and the next needed input.`;
}

export function truncateObjective(objective: string, max = 96): string {
	const singleLine = objective.replace(/\s+/g, " ").trim();
	return singleLine.length > max ? `${singleLine.slice(0, max - 1)}…` : singleLine;
}

export function goalEventStatus(kind: GoalEventKind): string {
	const labels: Record<GoalEventKind, string> = {
		active: "active",
		continuation: "continuing",
		paused: "paused",
		resumed: "resumed",
		cleared: "cleared",
		budget_limited: "budget reached",
		complete: "achieved",
	};
	return labels[kind];
}

export function createGoalState(objective: string, tokenBudget: number | null, now = Date.now(), random = Math.random()): GoalState {
	return {
		version: 1,
		id: `${now}-${random.toString(16).slice(2)}`,
		objective,
		status: "active",
		tokenBudget,
		tokensUsed: 0,
		timeUsedSeconds: 0,
		createdAt: now,
		updatedAt: now,
	};
}

export function accountGoalTurn(state: GoalState, tokenDelta: number, elapsedSeconds: number, now = Date.now()): GoalState {
	let next: GoalState = {
		...state,
		tokensUsed: state.tokensUsed + Math.max(0, tokenDelta),
		timeUsedSeconds: state.timeUsedSeconds + Math.max(0, elapsedSeconds),
		updatedAt: now,
	};
	if (next.status === "active" && next.tokenBudget != null && next.tokensUsed >= next.tokenBudget) {
		next = { ...next, status: "budget_limited" };
	}
	return next;
}
