/** Merge a singleton tail with the preceding batch; no samples are omitted. */
export function batchCount(total: number, size: number, normalized = false) {
  return Math.ceil(total / size) - Number(normalized && total > size && total % size === 1);
}
export function batchEnd(cursor: number, total: number, size: number, normalized = false) {
  return Math.min(total, cursor + size + Number(normalized && total - cursor - size === 1));
}
