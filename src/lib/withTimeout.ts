/** A promise that rejects with `message` after `ms`. Race it against a network call so a stalled request fails fast instead of hanging the UI forever. */
export function timeoutAfter(ms: number, message: string): Promise<never> {
  return new Promise((_resolve, reject) => setTimeout(() => reject(new Error(message)), ms));
}
