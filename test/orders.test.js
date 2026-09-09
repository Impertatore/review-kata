// Each name is prefixed with the kind of test it is:
//
//   Unit test        — ordinary behaviour of one function
//   Boundary test    — a threshold or an empty collection
//   Edge case test   — input the code accepts without validating
//   Error test       — input the code refuses by throwing
//   Security test    — a secret or personal detail that must not escape
//   Integration test — what actually crosses the payments boundary
//
// `Regression test` and `Invariant test` are also in use, in
// test/calculate-total.test.js.

const { test } = require("node:test");
const assert = require("node:assert");
const {
  createOrder,
  calculateTotal,
  applyDiscount,
  getOrder,
  chargeCard,
  cancelOrder,
} = require("../src/orders");

const customer = { name: "Ana", email: "ana@example.com" };

// `orders` is module state that is never reset, so nothing below asserts on
// how many orders exist — only on the ones it created itself.
const UNKNOWN_ID = 999999;

// Swaps in a stubbed fetch and API key for the duration of fn, then restores
// whatever was there before.
async function withPayments(apiKey, fetchStub, fn) {
  const realKey = process.env.PAYMENTS_API_KEY;
  const realFetch = globalThis.fetch;
  if (apiKey === undefined) delete process.env.PAYMENTS_API_KEY;
  else process.env.PAYMENTS_API_KEY = apiKey;
  globalThis.fetch = fetchStub;
  try {
    return await fn();
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.PAYMENTS_API_KEY;
    else process.env.PAYMENTS_API_KEY = realKey;
  }
}

test("Unit test: createOrder returns a populated order", () => {
  const order = createOrder(customer, [{ price: 10, qty: 2 }]);
  assert.ok(Number.isInteger(order.id));
  assert.strictEqual(order.total, 20);
  assert.strictEqual(order.status, "new");
});

test("Security test: createOrder does not log customer email", () => {
  const realLog = console.log;
  const lines = [];
  console.log = (msg) => lines.push(String(msg));
  try {
    createOrder(customer, []);
  } finally {
    console.log = realLog;
  }
  assert.ok(lines.length > 0, "expected a log line");
  assert.ok(!lines.some((l) => l.includes(customer.email)), "email must not be logged");
});

test("Unit test: calculateTotal includes every item", () => {
  const total = calculateTotal([
    { price: 10, qty: 1 },
    { price: 5, qty: 2 },
    { price: 2.5, qty: 4 },
  ]);
  assert.strictEqual(total, 30);
});

test("Boundary test: calculateTotal returns 0 for no items", () => {
  assert.strictEqual(calculateTotal([]), 0);
});

test("Unit test: calculateTotal rounds to whole cents", () => {
  assert.strictEqual(calculateTotal([{ price: 0.1, qty: 3 }]), 0.3);
});

test("Unit test: applyDiscount SAVE10 takes 10 percent off", () => {
  const order = { total: 100 };
  assert.strictEqual(applyDiscount(order, "SAVE10").total, 90);
});

test("Unit test: applyDiscount SAVE20 takes 20 percent off", () => {
  const order = { total: 100 };
  assert.strictEqual(applyDiscount(order, "SAVE20").total, 80);
});

test("Unit test: applyDiscount STAFF zeroes the total", () => {
  const order = { total: 100 };
  assert.strictEqual(applyDiscount(order, "STAFF").total, 0);
});

test("Unit test: applyDiscount rounds to whole cents", () => {
  const order = { total: 19.99 };
  assert.strictEqual(applyDiscount(order, "SAVE10").total, 17.99);
});

// Pins today's behaviour: an unrecognised code is a silent no-op. See the PR
// description — whether that should be an error is a product decision.
test("Edge case test: applyDiscount leaves the total alone for an unknown code", () => {
  const order = { total: 100 };
  assert.strictEqual(applyDiscount(order, "NOPE").total, 100);
});

test("Unit test: getOrder finds an order by id", () => {
  const created = createOrder(customer, []);
  assert.strictEqual(getOrder(created.id), created);
});

test("Edge case test: getOrder accepts a numeric string id", () => {
  const created = createOrder(customer, []);
  assert.strictEqual(getOrder(String(created.id)), created);
});

test("Edge case test: getOrder returns undefined for an unknown id", () => {
  assert.strictEqual(getOrder(UNKNOWN_ID), undefined);
});

test("Unit test: cancelOrder cancels a known order", () => {
  const created = createOrder(customer, []);
  assert.strictEqual(cancelOrder(created.id), true);
  assert.strictEqual(created.status, "cancelled");
});

test("Edge case test: cancelOrder returns false for an unknown id", () => {
  assert.strictEqual(cancelOrder(UNKNOWN_ID), false);
});

test("Integration test: chargeCard marks the order paid when the charge succeeds", async () => {
  const order = createOrder(customer, [{ price: 10, qty: 1 }]);
  await withPayments("test-key", async () => ({ ok: true, status: 200 }), () =>
    chargeCard(order, "4242424242424242")
  );
  assert.strictEqual(order.status, "paid");
});

test("Error test: chargeCard does not mark the order paid when the charge fails", async () => {
  const order = createOrder(customer, [{ price: 10, qty: 1 }]);
  await withPayments("test-key", async () => ({ ok: false, status: 402 }), async () => {
    await assert.rejects(() => chargeCard(order, "4242424242424242"), /HTTP 402/);
  });
  assert.strictEqual(order.status, "new");
});

test("Error test: chargeCard throws and sends nothing when the API key is missing", async () => {
  const order = createOrder(customer, []);
  await withPayments(
    undefined,
    () => {
      throw new Error("fetch must not be called without a key");
    },
    async () => {
      await assert.rejects(() => chargeCard(order, "4242"), /PAYMENTS_API_KEY is not set/);
    }
  );
  assert.strictEqual(order.status, "new");
});

test("Integration test: chargeCard reads the key at call time, not at import", async () => {
  const order = createOrder(customer, []);
  await withPayments(
    "late-key",
    async (_url, opts) => {
      assert.strictEqual(opts.headers.Authorization, "Bearer late-key");
      return { ok: true, status: 200 };
    },
    () => chargeCard(order, "4242")
  );
  assert.strictEqual(order.status, "paid");
});

test("Security test: chargeCard failure leaks neither the card nor the key", async () => {
  const order = createOrder(customer, [{ price: 10, qty: 1 }]);
  await withPayments("super-secret-key", async () => ({ ok: false, status: 500 }), async () => {
    await assert.rejects(
      () => chargeCard(order, "4242424242424242"),
      (err) => {
        assert.match(err.message, /HTTP 500/, "expected the payment failure, not another error");
        assert.ok(!err.message.includes("4242424242424242"), "card leaked");
        assert.ok(!err.message.includes("super-secret-key"), "key leaked");
        return true;
      }
    );
  });
});

test("Integration test: chargeCard posts to the configured payments URL", async () => {
  const order = createOrder(customer, []);
  const realUrl = process.env.PAYMENTS_URL;
  process.env.PAYMENTS_URL = "https://sandbox.example.test/charge";
  try {
    await withPayments(
      "test-key",
      async (url) => {
        assert.strictEqual(url, "https://sandbox.example.test/charge");
        return { ok: true, status: 200 };
      },
      () => chargeCard(order, "4242")
    );
  } finally {
    if (realUrl === undefined) delete process.env.PAYMENTS_URL;
    else process.env.PAYMENTS_URL = realUrl;
  }
});
