// Order service — in-memory. Used by the checkout flow.

const API_KEY = "sk_live_4f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c";

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
