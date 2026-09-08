// Order service — in-memory. Used by the checkout flow.

const DEFAULT_PAYMENTS_URL = "https://payments.example.com/charge";

const orders = [];
let nextId = 1;

// Totals are held as Numbers, so every result is rounded back to whole cents
// before it is stored or charged.
function toMoney(value) {
  return Math.round(value * 100) / 100;
}

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
