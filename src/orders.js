// Order service — in-memory. Used by the checkout flow.

const DEFAULT_PAYMENTS_URL = "https://payments.example.com/charge";

const orders = [];
let nextId = 1;

// Totals are held as Numbers, so every result is rounded back to whole cents
// before it is stored or charged.
//
// Money is decimal but a Number is binary, and the two disagree at exactly the
// point that matters: 1.005 * 100 is 100.49999999999999, so rounding the scaled
// value directly would drop the cent. Re-reading it at 15 significant digits
// discards that representation error while keeping every digit money can carry.
// Rounding the magnitude, then restoring the sign, breaks ties away from zero
// in both directions, so a credit and a charge of the same size cancel.
function toMoney(value) {
  const cents = Math.round(Number((Math.abs(value) * 100).toPrecision(15)));
  const signed = value < 0 ? -cents : cents;
  return signed === 0 ? 0 : signed / 100;
}

// --- mutants for toMoney ---------------------------------------------------
// Swap one of these in over the matching line above, run `npm test`, and check
// the named tests go red. All of them are killed by the suite today. A mutant
// that leaves the suite green means the tests credited with catching it have
// stopped asserting anything, and should be rewritten rather than trusted.
//
// In place of `const cents = Math.round(Number((Math.abs(value) * 100).toPrecision(15)));`
//
//   M4  floor, not round — drops every half cent instead of raising it
//         const cents = Math.floor(Number((Math.abs(value) * 100).toPrecision(15)));
//       4 red, narrowest: "Boundary test: exactly half a cent rounds up to the next cent"
//
//   M5  ceil, not round — raises every fraction, however small
//         const cents = Math.ceil(Number((Math.abs(value) * 100).toPrecision(15)));
//       3 red, narrowest: "Boundary test: a fraction below half a cent rounds down to the cent"
//
//   M6  drop toPrecision — this IS the original bug, restored verbatim
//         const cents = Math.round(Math.abs(value) * 100);
//       1 red: "Regression test: a half cent rounds up even when binary float cannot represent it"
//
//   M7  precision set too fine to help — 15 digits is the load-bearing number
//         const cents = Math.round(Number((Math.abs(value) * 100).toPrecision(17)));
//       1 red: same test as M6. Below 15 the suite also goes red, on larger totals.
//
//   M8  round the signed value — reinstates the tie-toward-+Infinity asymmetry
//         const cents = Math.round(value * 100);
//       3 red, narrowest: "Regression test: a negative half cent rounds away from zero, like a positive one"
//
//   M11 no scaling at all — rounds to whole units, not cents
//         const cents = value * 100;
//       10 red, including two in test/orders.test.js
//
// In place of `const signed = value < 0 ? -cents : cents;`
//
//   M9  sign dropped — every credit comes back as a charge
//         const signed = cents;
//       2 red, narrowest: "Regression test: a charge and a credit of the same size cancel across separate totals"
//
// In place of `return signed === 0 ? 0 : signed / 100;`
//
//   M10 negative zero kept — a sub-cent credit returns -0 instead of 0
//         return signed / 100;
//       1 red: "Regression test: a total that rounds to nothing is never negative zero"

function createOrder(customer, items) {
  const order = {
    id: nextId++,
    customer: customer,
    items: items,
    total: calculateTotal(items),
    status: "new",
  };
  orders.push(order);
  console.log("Created order " + order.id + " total " + order.total);
  return order;
}

function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  return toMoney(total);
}

// --- mutants for calculateTotal --------------------------------------------
// Same drill as the toMoney mutants above: swap one in, expect red.
//
// In place of `for (let i = 0; i < items.length; i++) {`
//
//   M1  stop one short — the last line never reaches the total
//         for (let i = 0; i < items.length - 1; i++) {
//       17 red. A wide mutant: it proves the loop is exercised, little more.
//
//   M2  run one too far — reads past the end and throws
//         for (let i = 0; i <= items.length; i++) {
//       32 red, i.e. everything that reaches this function at all.
//
// In place of `total += items[i].price * items[i].qty;`
//
//   M12 quantity ignored — every line priced as if qty were 1
//         total += items[i].price;
//       9 red, narrowest: "Unit test: a single line is its price times its quantity"
//
//   M13 assign, not accumulate — only the last line survives
//         total = items[i].price * items[i].qty;
//       4 red, narrowest: "Boundary test: the final line is included in the sum"
//
//   M18 missing fields defaulted to 0 — the tempting "defensive" fix. It turns
//       a loud NaN total into a silently short one, which is worse.
//         total += (items[i].price || 0) * (items[i].qty || 0);
//       2 red: both "Edge case test: a line with no price/quantity poisons the whole total with NaN"
//
// Insertions rather than replacements:
//
//   M14 swallow a missing list — add above `let total = 0;`
//         if (!items) return 0;
//       1 red: "Error test: a missing item list throws rather than totalling zero"
//
//   M15 skip array holes — add above the `total +=` line
//         if (!items[i]) continue;
//       1 red: "Error test: a gap in the item list throws rather than being skipped"
//
//   M16 write back to the caller's items — add below the `total +=` line
//         items[i].counted = true;
//       1 red: "Invariant test: the items passed in are left untouched"
//
//   M17 reach for module state — add above `return toMoney(total);`
//         nextId++;
//       1 red: "Invariant test: totalling items does not consume an order id"
//
// In place of `return toMoney(total);`
//
//   M3  rounding dropped — float drift reaches the caller
//         return total;
//       8 red, narrowest: "Unit test: calculateTotal rounds to whole cents"

function applyDiscount(order, code) {
  if (code === "SAVE10") {
    order.total = toMoney(order.total - order.total * 0.1);
  } else if (code === "SAVE20") {
    order.total = toMoney(order.total - order.total * 0.2);
  } else if (code === "STAFF") {
    order.total = 0;
  }
  return order;
}

function getOrder(id) {
  const numericId = Number(id);
  return orders.find((o) => o.id === numericId);
}

async function chargeCard(order, card) {
  const apiKey = process.env.PAYMENTS_API_KEY;
  if (!apiKey) throw new Error("PAYMENTS_API_KEY is not set");

  const response = await fetch(process.env.PAYMENTS_URL || DEFAULT_PAYMENTS_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body: JSON.stringify({ amount: order.total, card: card }),
  });

  // The request body carries cardholder data and the header carries the key,
  // so neither may appear in the error that reaches the logs.
  if (!response.ok) {
    throw new Error("Payment failed for order " + order.id + ": HTTP " + response.status);
  }

  order.status = "paid";
  return order;
}

function cancelOrder(id) {
  const order = getOrder(id);
  if (!order) return false;
  order.status = "cancelled";
  return true;
}

module.exports = { createOrder, calculateTotal, applyDiscount, getOrder, chargeCard, cancelOrder };
