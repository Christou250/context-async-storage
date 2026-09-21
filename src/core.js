import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * A thin wrapper around Node's AsyncLocalStorage that maintains a mutable
 * context map across async continuations.
 *
 * WHY A CLASS: Node's AsyncLocalStorage instance methods are already class-like,
 * but the raw API forces every read/write to go through `als.getStore()`.
 * Wrapping it gives us get/set/run methods that behave like a typical key-value
 * context object and keeps the AsyncLocalStorage instance private.
 */
export class ContextAsyncStorage {
  /**
   * @param {object} [options]
   * @param {AsyncLocalStorage} [options.storage] Injection point for tests or
   *   advanced use. Defaults to a fresh AsyncLocalStorage instance. Making it
   *   injectable allows deterministic testing of propagation without relying
   *   on global async state.
   */
  constructor(options = {}) {
    this._storage = options.storage ?? new AsyncLocalStorage();
  }

  /**
   * Runs `callback` with a fresh context map. The context is automatically
   * propagated through any async operations started inside the callback.
   *
   * @template T
   * @param {() => T} callback
   * @returns {T}
   */
  run(callback) {
    return this._storage.run(new Map(), callback);
  }

  /**
   * Returns a copy of the current context map, or an empty map if there is no
   * active context. Returning a copy prevents callers from mutating the
   * underlying map without going through `set`.
   *
   * @returns {Map<string, unknown>}
   */
  getStore() {
    const store = this._storage.getStore();
    return store ? new Map(store) : new Map();
  }

  /**
   * Gets a single value from the current context.
   *
   * @param {string} key
   * @returns {unknown} The stored value, or `undefined` if the key is absent
   *   or there is no active context.
   */
  get(key) {
    const store = this._storage.getStore();
    return store?.get(key);
  }

  /**
   * Sets a value in the current context. If no context is active this is a
   * no-op. Mutating the active store in place is safe because AsyncLocalStorage
   * gives each run its own store; there is no risk of leaking between parallel
   * async executions.
   *
   * @param {string} key
   * @param {unknown} value
   * @returns {void}
   */
  set(key, value) {
    const store = this._storage.getStore();
    if (store) {
      store.set(key, value);
    }
  }

  /**
   * Deletes a key from the current context. No-op if there is no active context
   * or the key is absent.
   *
   * @param {string} key
   * @returns {boolean} `true` if the key was present and removed, otherwise `false`.
   */
  delete(key) {
    const store = this._storage.getStore();
    return store ? store.delete(key) : false;
  }
}
