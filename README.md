# Context Async Storage

A small TypeScript-friendly wrapper around Node.js `AsyncLocalStorage` that maintains a mutable context map across async continuations.

```js
import { ContextAsyncStorage } from 'context-async-storage';

const cas = new ContextAsyncStorage();

await cas.run(async () => {
  cas.set('requestId', 'abc123');
  await new Promise(resolve => setTimeout(resolve, 1));
  console.log(cas.get('requestId')); // 'abc123'
});
```

## Why this exists

Node's `AsyncLocalStorage` requires direct access to its `getStore()` result and manual map handling. This library exposes plain `get`, `set`, and `run` methods that operate on a fresh `Map` per run. The trade-off is that `getStore()` returns a copy rather than the live map to prevent accidental mutation; use `set` and `delete` to change values.

## Edge case

If `set` or `delete` is called outside `run`, it is a safe no-op (`delete` returns `false`). There is intentionally no "default context"—values are only available inside an active `run` callback.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

