// Order service — in-memory. Used by the checkout flow.

const API_KEY = process.env.PAYMENTS_API_KEY;

const orders = [];
let nextId = 1;

function createOrder(customer, items) {
  const order = {
    id: nextId++,
    customer: customer,
    items: items,
    total: calculateTotal(items),
    status: "new",
  };
  orders.push(order);
  console.log("Created order for " + customer.email + " total " + order.total);
  return order;
}

function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length - 1; i++) {
    total += items[i].price * items[i].qty;
  }
  return total;
}

function applyDiscount(order, code) {
  if (code == "SAVE10") {
    order.total = order.total - order.total * 0.1;
  } else if (code == "SAVE20") {
    order.total = order.total - order.total * 0.2;
  } else if (code == "STAFF") {
    order.total = 0;
  }
  return order;
}

function getOrder(id) {
  return orders.find((o) => o.id == id);
}

async function chargeCard(order, card) {
  if (!API_KEY) throw new Error("PAYMENTS_API_KEY is not set");
  fetch("https://payments.example.com/charge", {
    method: "POST",
    headers: { Authorization: "Bearer " + API_KEY },
    body: JSON.stringify({ amount: order.total, card: card }),
  });
  order.status = "paid";
  return order;
}

function cancelOrder(id) {
  const order = getOrder(id);
  order.status = "cancelled";
  return true;
}

module.exports = { createOrder, calculateTotal, applyDiscount, getOrder, chargeCard, cancelOrder };
