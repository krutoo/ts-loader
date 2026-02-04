export function lazyInit<T extends (...args: any[]) => any>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> {
  let value: ReturnType<T>;

  let resolver = (...args: Parameters<T>): ReturnType<T> => {
    if (!value) {
      value = fn(...args);
    }

    resolver = () => value;

    return value;
  };

  return (...args: Parameters<T>): ReturnType<T> => {
    return resolver(...args);
  };
}
