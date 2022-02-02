// https://blog.risingstack.com/writing-a-javascript-framework-sandboxed-code-evaluation/

// we're using 'unsafe-eval' policy in order to evaluate the JavaScript
// loaded from the mods - this has obvious security implications which
// this file does it's best to address
// at the end of the day, there will always be a risk of a mod doing something
// malicious - but that's pretty standard for mods in general, so this seems
// like an acceptable level of risk

const contextProxies = new WeakMap();

function has(_target: object, _key: string | symbol): boolean {
  return true;
}

function get(target: object, key: string | symbol): unknown {
  if (key === Symbol.unscopables) {
    return undefined;
  }
  return (target as { [key: string | symbol]: unknown })[key];
}

export default function sandbox(source: string): (context: object) => void {
  const asyncSource = `
    (async function sandbox() {
      try {
        ${source}
      } catch(e) {
        D2RMM.log('Error: ' + e.toString());
      }
    })()`;

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const code = new Function('context', `with (context) {${asyncSource}}`);

  return function execute(context: object): void {
    if (!contextProxies.has(context)) {
      const contextProxy = new Proxy(context, { has, get });
      contextProxies.set(context, contextProxy);
    }
    try {
      code(contextProxies.get(context));
    } catch (e) {
      console.error(e);
    }
  };
}
