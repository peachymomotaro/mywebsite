/** Index of the first unmarked question at or after `from`, wrapping; -1 when all are marked. */
export function nextUnmarked(questions: { mark: string | null }[], from: number) {
  for (let step = 0; step < questions.length; step += 1) {
    const i = (from + step) % questions.length;
    if (!questions[i].mark) return i;
  }
  return -1;
}
