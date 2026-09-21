import test from 'node:test';
import assert from 'node:assert/strict';

import { ContextAsyncStorage } from '../src/core.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('run provides a fresh context map', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    assert.deepEqual([...cas.getStore().entries()], []);
  });
});

test('set and get within run', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    cas.set('user', 'alice');
    assert.equal(cas.get('user'), 'alice');
  });
});

test('context is isolated between separate run calls', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    cas.set('x', 1);
    assert.equal(cas.get('x'), 1);
  });
  cas.run(() => {
    assert.equal(cas.get('x'), undefined);
  });
});

test('nested runs create independent contexts', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    cas.set('outer', true);
    cas.run(() => {
      assert.equal(cas.get('outer'), undefined);
      cas.set('inner', 42);
      assert.equal(cas.get('inner'), 42);
    });
    assert.equal(cas.get('inner'), undefined);
    assert.equal(cas.get('outer'), true);
  });
});

test('context propagates through async continuations', async () => {
  const cas = new ContextAsyncStorage();
  await cas.run(async () => {
    cas.set('requestId', 'abc123');
    await delay(1);
    assert.equal(cas.get('requestId'), 'abc123');
  });
});

test('context is lost after run returns', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    cas.set('temp', 'gone');
  });
  assert.equal(cas.get('temp'), undefined);
});

test('set outside run is a safe no-op', () => {
  const cas = new ContextAsyncStorage();
  assert.doesNotThrow(() => cas.set('key', 'value'));
  assert.equal(cas.get('key'), undefined);
});

test('get outside run returns undefined', () => {
  const cas = new ContextAsyncStorage();
  assert.equal(cas.get('anything'), undefined);
});

test('getStore returns a copy, not the live map', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    cas.set('original', 1);
    const snapshot = cas.getStore();
    snapshot.set('mutated', 2);
    assert.equal(cas.get('mutated'), undefined);
    assert.equal(cas.get('original'), 1);
  });
});

test('delete removes a key and returns true when present', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    cas.set('a', 1);
    assert.equal(cas.delete('a'), true);
    assert.equal(cas.get('a'), undefined);
  });
});

test('delete returns false when key is absent', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    assert.equal(cas.delete('missing'), false);
  });
});

test('delete outside run returns false and does not throw', () => {
  const cas = new ContextAsyncStorage();
  assert.equal(cas.delete('key'), false);
});

test('values are mutable by reference', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    const obj = { count: 0 };
    cas.set('obj', obj);
    obj.count += 1;
    assert.equal(cas.get('obj').count, 1);
  });
});

test('parallel async continuations keep independent contexts', async () => {
  const cas = new ContextAsyncStorage();

  const task = (name) =>
    cas.run(async () => {
      cas.set('task', name);
      await delay(1);
      return cas.get('task');
    });

  const [a, b] = await Promise.all([task('A'), task('B')]);
  assert.equal(a, 'A');
  assert.equal(b, 'B');
});

test('overwriting a key in the same run is allowed', () => {
  const cas = new ContextAsyncStorage();
  cas.run(() => {
    cas.set('key', 'first');
    cas.set('key', 'second');
    assert.equal(cas.get('key'), 'second');
  });
});
