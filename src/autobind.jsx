
// https://github.com/andreypopp/autobind-decorator/blob/master/src/index.js#L56-L80

/**
 * Return a descriptor removing the value and returning a getter
 * The getter will return a .bind version of the function
 * and memoize the result against a symbol on the instance
 */
export default function boundMethod(target, key, descriptor) {
  let fn = descriptor.value;

  if (typeof fn !== 'function') {
    throw new Error(`@autobind decorator can only be applied to methods not: ${typeof fn}`);
  }

  return {
    configurable: true,
    get() {
      let boundFn = fn.bind(this);
      Object.defineProperty(this, key, {
        value: boundFn,
        configurable: true,
        writable: true
      });
      return boundFn;
    }
  };
}
