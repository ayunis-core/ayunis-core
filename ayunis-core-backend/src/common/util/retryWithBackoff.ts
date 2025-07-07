export default function retryWithBackoff<T>({
  fn,
  maxRetries = 3,
  delay = 5000,
  retryIfResult,
  retryIfError,
}: {
  fn: () => Promise<T>;
  maxRetries?: number;
  delay?: number;
  retryIfResult?: (result: T) => boolean;
  retryIfError?: (error: Error) => boolean;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    let retries = 0;

    function attempt() {
      fn()
        .then((result) => {
          if (retryIfResult && retryIfResult(result)) {
            if (retries >= maxRetries) {
              reject(
                new Error('Max retries reached with unsatisfactory result'),
              );
              return;
            }
            retries += 1;
            setTimeout(attempt, delay * Math.pow(2, retries - 1));
          } else {
            resolve(result);
          }
        })
        .catch((error) => {
          if (retryIfError && !retryIfError(error as Error)) {
            reject(error as Error);
            return;
          }
          if (retries >= maxRetries) {
            reject(error as Error);
            return;
          }
          retries += 1;
          setTimeout(attempt, delay * Math.pow(2, retries - 1));
        });
    }

    attempt();
  });
}
