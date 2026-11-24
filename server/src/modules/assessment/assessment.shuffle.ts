import { randomInt } from "node:crypto";

export function shuffle<T>(
  values: readonly T[],
  chooseIndex: (maxExclusive: number) => number = (maxExclusive) =>
    randomInt(maxExclusive),
): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = chooseIndex(index + 1);
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new RangeError("The shuffle index must be within the current range.");
    }
    [shuffled[index], shuffled[swapIndex]!] = [
      shuffled[swapIndex]!,
      shuffled[index]!,
    ];
  }
  return shuffled;
}
