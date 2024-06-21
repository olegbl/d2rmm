import { QuickJSContext, QuickJSHandle, Scope } from 'quickjs-emscripten';
import type { ConsoleAPI } from 'bridge/ConsoleAPI';

export function getConsoleAPI(
  vm: QuickJSContext,
  scope: Scope,
  console: ConsoleAPI
): QuickJSHandle {
  const consoleHandle = scope.manage(vm.newObject());
  vm.setProp(
    consoleHandle,
    'debug',
    scope.manage(
      vm.newFunction('debug', (...args) => {
        console.debug(...args.map(vm.dump));
      })
    )
  );
  vm.setProp(
    consoleHandle,
    'log',
    scope.manage(
      vm.newFunction('log', (...args) => {
        console.log(...args.map(vm.dump));
      })
    )
  );
  vm.setProp(
    consoleHandle,
    'warn',
    scope.manage(
      vm.newFunction('warn', (...args) => {
        console.warn(...args.map(vm.dump));
      })
    )
  );
  vm.setProp(
    consoleHandle,
    'error',
    scope.manage(
      vm.newFunction('error', (...args) => {
        console.error(...args.map(vm.dump));
      })
    )
  );
  return consoleHandle;
}
