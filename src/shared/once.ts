export function once<T extends (...args: any[]) => any>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> {
  let done = false;
  let result: ReturnType<T>;

  return (...args: Parameters<T>): ReturnType<T> => {
    if (!done) {
      done = true;
      result = fn(...args);
    }

    return result;
  };
}
