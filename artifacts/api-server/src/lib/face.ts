/**
 * Compute the squared Euclidean distance between two equal-length vectors.
 * face-api.js uses Euclidean distance with a typical match threshold around 0.6.
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Descriptor length mismatch");
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export const FACE_MATCH_THRESHOLD = 0.55;
