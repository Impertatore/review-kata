# review-kata

A deliberately small order service for practising AI-assisted code review.
Four files, no dependencies (Node 20+ built-in test runner).

```
npm test
```

## Set it up as a real PR

```
git init
git add README.md package.json
git commit -m "Initial scaffold"
git checkout -b feature/order-service
git add src test
git commit -m "Add order service with discounts, payment and cancellation"
```

Push to a personal GitHub repo and open `feature/order-service` as a PR
against `main`. That PR is what you review at each rung.

## Rules

- Do not fix anything while reviewing at rungs 1 and 2 — comment only.
- Keep an `answer-key.md` locally (not committed) listing what you found
  and at which rung the AI found it, missed it, or invented it.
