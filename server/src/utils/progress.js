const DELAY_THRESHOLD = 10; // percentage points behind schedule before flagging "delayed"

/**
 * Planned progress is modeled as linear completion between plannedStart and
 * plannedEnd. This is the "schedule-linking" bridge: it turns a static WBS
 * date range into a moving target we can diff actual field progress against.
 */
export function plannedProgressAt(plannedStart, plannedEnd, at = new Date()) {
  const start = new Date(plannedStart).getTime();
  const end = new Date(plannedEnd).getTime();
  const now = new Date(at).getTime();

  if (now <= start) return 0;
  if (now >= end) return 100;
  if (end === start) return 100;

  return Math.round(((now - start) / (end - start)) * 100);
}

export function deriveTaskStatus({ plannedStart, plannedEnd, actualProgress, at = new Date() }) {
  if (actualProgress >= 100) return "completed";

  const planned = plannedProgressAt(plannedStart, plannedEnd, at);
  const now = new Date(at).getTime();
  const end = new Date(plannedEnd).getTime();

  const isBehind = planned - actualProgress >= DELAY_THRESHOLD || (now > end && actualProgress < 100);
  if (isBehind) return "delayed";

  if (actualProgress > 0 || now > new Date(plannedStart).getTime()) return "in_progress";
  return "not_started";
}

export function taskProgressSummary(task, at = new Date()) {
  const planned = plannedProgressAt(task.plannedStart, task.plannedEnd, at);
  const actual = task.actualProgress;
  return {
    plannedProgress: planned,
    actualProgress: actual,
    variance: Number((actual - planned).toFixed(2)),
    status: deriveTaskStatus({
      plannedStart: task.plannedStart,
      plannedEnd: task.plannedEnd,
      actualProgress: actual,
      at,
    }),
  };
}

/**
 * Weighted roll-up of a project's tasks into a single planned % and actual %,
 * so a project's overall health is driven by its schedule, not a manual guess.
 */
export function projectProgressSummary(tasks, at = new Date()) {
  if (!tasks.length) {
    return { plannedProgress: 0, actualProgress: 0, variance: 0, delayedTaskCount: 0 };
  }

  const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 1), 0) || 1;

  let plannedAcc = 0;
  let actualAcc = 0;
  let delayedTaskCount = 0;

  for (const task of tasks) {
    const weight = (task.weight || 1) / totalWeight;
    const summary = taskProgressSummary(task, at);
    plannedAcc += summary.plannedProgress * weight;
    actualAcc += summary.actualProgress * weight;
    if (summary.status === "delayed") delayedTaskCount += 1;
  }

  const plannedProgress = Math.round(plannedAcc);
  const actualProgress = Math.round(actualAcc);

  return {
    plannedProgress,
    actualProgress,
    variance: Number((actualProgress - plannedProgress).toFixed(2)),
    delayedTaskCount,
  };
}

export { DELAY_THRESHOLD };
