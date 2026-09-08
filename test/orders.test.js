const { test } = require("node:test");
const assert = require("node:assert");
const { createOrder, applyDiscount, getOrder, cancelOrder } = require("../src/orders");

const customer = { name: "Ana", email: "ana@example.com" };

test("createOrder returns an order", () => {
  const order = createOrder(customer, []);
  assert.ok(order);
});

test("applyDiscount applies SAVE10", () => {
  const order = { total: 100 };
  const result = applyDiscount(order, "SAVE10");
  assert.strictEqual(result.total, order.total);
});

test("getOrder finds an order by id", () => {
  const created = createOrder(customer, []);
  const found = getOrder(created.id);
  assert.strictEqual(found, created);
});

test("cancelOrder returns true", () => {
  const created = createOrder(customer, []);
  assert.strictEqual(cancelOrder(created.id), true);
});
