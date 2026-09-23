/**
 * Lane assignment for overlapping tasks on a single day column: a greedy
 * left-edge sweep, equivalent to optimal interval-graph coloring, so
 * `laneCount` always equals the peak concurrency within that cluster of
 * transitively-overlapping intervals. Touching (`a.end === b.start`) does
 * NOT count as overlap.
 */

export interface LaneInput {
  id: number
  start: number
  end: number
}

export interface LaneSlot {
  lane: number
  laneCount: number
}

export function packLanes(intervals: LaneInput[]): Map<number, LaneSlot> {
  const result = new Map<number, LaneSlot>()
  if (intervals.length === 0) return result

  const sorted = [...intervals].sort((a, b) => a.start - b.start || b.end - a.end || a.id - b.id)

  let laneEnds: number[] = []
  let cluster: { id: number; lane: number }[] = []
  let clusterMaxEnd = -Infinity

  const flush = () => {
    const laneCount = laneEnds.length
    for (const item of cluster) result.set(item.id, { lane: item.lane, laneCount })
    laneEnds = []
    cluster = []
    clusterMaxEnd = -Infinity
  }

  for (const iv of sorted) {
    if (cluster.length > 0 && iv.start >= clusterMaxEnd) flush()

    let lane = laneEnds.findIndex((end) => end <= iv.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = iv.end
    cluster.push({ id: iv.id, lane })
    clusterMaxEnd = Math.max(clusterMaxEnd, iv.end)
  }
  flush()

  return result
}
