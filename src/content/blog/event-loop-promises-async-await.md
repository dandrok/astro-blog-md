---
title: 'JavaScript Async Demystified: Event Loop, Promises, and async/await'
description: 'A practical mental model for async JavaScript, covering the event loop, Promises, Promise utilities, async/await, and error handling.'
pubDate: 'Apr 27 2026'
tags: ['javascript', 'async', 'promises']
---

> You don't need to fear async JavaScript. You just need the right mental model - and a good cup of coffee. ☕

## Overview

Before we talk about Promises or async/await, we need to answer one fundamental question:

**How does JavaScript handle multiple things if it can only do one thing at a time?**

Every time you call an API, read a file, or query a database — that's async work. Promises are how JavaScript handles all of it.

JavaScript is **single-threaded** - it has one call stack and executes one piece of code at a time. Yet somehow it handles timers, API calls, and user interactions without freezing. The answer is the **Event Loop**.

## The Event Loop

### Three Layers of Execution

The Event Loop coordinates three types of work, always in this order:

| Order | Layer            | When it runs           | Common examples                             |
| ----- | ---------------- | ---------------------- | ------------------------------------------- |
| 1     | Synchronous code | First, always          | `console.log()`, math, variable assignments |
| 2     | Microtask queue  | After synchronous code | `Promise.then()`, `Promise.catch()`         |
| 3     | Macrotask queue  | After microtasks       | `setTimeout`, `setInterval`                 |

**Why this order?**

- **Synchronous code** runs directly on the call stack - no queue needed.
- **Microtasks** (Promises) are handled internally by the JS engine, so they're prioritized immediately after the stack clears.
- **Macrotasks** (setTimeout, setInterval) go through the **browser's timer API** - an external system - so they arrive into the queue later, after the delay has passed.

### Seeing It in Action

Can you figure out the correct output?

```js
console.log('start');
setTimeout(() => console.log('macrotask (200ms)'), 200);
new Promise((resolve) => resolve('microtask')).then((value) => console.log(value));
setTimeout(() => console.log('macrotask (300ms)'), 300);
new Promise((resolve) => resolve('also microtask')).then((value) => console.log(value));
console.log('still synchronous');
```

<details style="cursor: pointer;">
<summary>👀 <u>Click to reveal solution</u></summary>

```
start
still synchronous
microtask
also microtask
macrotask (200ms)
macrotask (300ms)
```

</details>

Notice that `200ms` setTimeout prints before `300ms` — because the millisecond delay determines when each macrotask **enters the queue**. This makes setTimeout useful for orchestrating sequences: animations, retries, debouncing, and more.

### The Event Loop Rule - Memorize This

```
Synchronous → Microtasks (Promises) → Macrotasks (setTimeout / setInterval)
```

That's it. Everything else follows from this.

## Promises

Now that you understand _when_ async code runs, let's talk about _how_ to write it.

### The Coffee Shop Analogy

Imagine you walk into a coffee shop and order a flat white. The barista doesn't hand you coffee immediately - but they hand you a **receipt**. That receipt is a **promise** that your coffee is coming.

While you wait, you can sit down, check your phone, chat with a friend. You don't stand frozen at the counter. JavaScript works the same way - it moves on to other code while the async work happens in the background.

Your receipt (the Promise) can end up in one of **three states**:

| State       | What it means                      | Coffee shop version      |
| ----------- | ---------------------------------- | ------------------------ |
| `PENDING`   | The async work is still running    | Coffee is being made     |
| `FULFILLED` | The Promise completed successfully | Coffee is ready          |
| `REJECTED`  | The Promise failed                 | The coffee machine broke |

Once a Promise leaves `PENDING`, it **never changes state again**. Fulfilled stays fulfilled. Rejected stays rejected.

### Creating a Promise

```js
const getCoffee = new Promise((resolve, reject) => {
  const isCoffeeMachineWorking = true;

  if (isCoffeeMachineWorking) {
    resolve('☕ Here is your flat white!'); // → FULFILLED
  } else {
    reject('💥 Machine broke - want tea instead?'); // → REJECTED
  }
});
```

- `resolve(value)` - fulfills the Promise, passes `value` to `.then()`
- `reject(error)` - rejects the Promise, passes `error` to `.catch()`
- You **don't use `return`** - calling `resolve()` or `reject()` is the signal, not a return value

### Consuming a Promise

```js
getCoffee
  .then((coffee) => console.log(coffee)) // ✅ "Here is your flat white!"
  .catch((error) => console.error(error)) // ❌ handles rejection
  .finally(() => console.log('Order closed - thank you!')); // always runs
```

- `.then(value => ...)` — runs when the Promise is fulfilled
- `.catch(err => ...)` — runs when the Promise is rejected
- `.finally(() => ...)` — always runs, no matter what

## Promise Chaining

Here's where Promises get really powerful. Each `.then()` returns a **new Promise**, which means you can chain them - passing values from one step to the next.

### The Problem It Solves

Before Promises, async code was written with **nested callbacks**:

```js
// ❌ Callback hell - hard to read, hard to debug
getUser(id, function (user) {
  getPosts(user, function (posts) {
    getComments(posts[0], function (comments) {
      // we're 4 levels deep and counting...
    });
  });
});
```

Promise chaining flattens this into clean, readable steps:

```js
// ✅ Promise chain - flat, readable, one error handler
getUser(id)
  .then((user) => getPosts(user))
  .then((posts) => getComments(posts[0]))
  .then((comments) => console.log(comments))
  .catch((error) => console.error(error));
```

Each `.then()` receives the return value of the previous step. If any step throws or rejects, the chain **short-circuits** straight to `.catch()` - skipping all remaining `.then()` calls.

### Chaining in Practice

```js
Promise.resolve(5)
  .then((value) => value * 2) // 10
  .then((value) => value + 10) // 20
  .then((value) => console.log(value)) // logs 20
  .catch((err) => console.error(err));
```

### What Happens When a Step Fails?

```js
Promise.resolve(5)
  .then((value) => value * 2) // ✅ runs → 10
  .then((value) => {
    throw new Error('Oops!');
  }) // ❌ throws
  .then((value) => value + 10) // ⏭ SKIPPED
  .catch((err) => console.error(err)); // ✅ catches the error
```

The `.catch()` at the end acts like a **safety net** 🥅 - no matter where in the chain something goes wrong, the error falls down to it. The rest of your app keeps running normally.

## Promise.all() and Promise.race()

Sometimes you need to coordinate multiple Promises at once. JavaScript gives you two tools for this.

### Promise.all() - Everyone Must Finish

Back to the coffee shop: you ordered three coffees for you and two friends. You don't want to collect them one by one - you want to pick them all up at the same time, at the same temperature.

```js
const firstCoffee = Promise.resolve('☕ Flat white');
const secondCoffee = Promise.resolve('☕ Cappuccino');
const thirdCoffee = Promise.resolve('☕ Espresso');

Promise.all([firstCoffee, secondCoffee, thirdCoffee])
  .then((coffees) => console.log(coffees))
  // ["☕ Flat white", "☕ Cappuccino", "☕ Espresso"]
  .catch((error) => console.error(error));
```

**Important rule:** if **any one** Promise rejects, the whole `Promise.all()` immediately rejects - just like if one coffee was spilled, you'd want to know right away rather than waiting for the others.

### Promise.race() - First One Wins (for better or worse)

Imagine you only have 5 minutes to wait for your coffee. If it's not ready in time, you leave. You set a timer - and now it's a race between your coffee being made and your patience running out.

```js
const coffeeOrder = new Promise((resolve) => {
  setTimeout(() => resolve('☕ Coffee is ready!'), 6000); // takes 6 seconds
});

const ourTimeLimit = new Promise((_, reject) => {
  setTimeout(() => reject("⏰ Took too long - I'm leaving!"), 5000); // we wait 5 seconds
});

Promise.race([coffeeOrder, ourTimeLimit])
  .then((result) => console.log(result))
  .catch((err) => console.error(err)); // logs "⏰ Took too long - I'm leaving!"
```

The `ourTimeLimit` Promise rejects at 5 seconds - the race is over. The coffee Promise at 6 seconds is completely ignored.

## async/await

Promises are powerful - but chaining many `.then()` calls can still feel verbose. ES2017 introduced `async/await`: **syntactic sugar built on top of Promises** that makes async code read like synchronous code.

These two examples do **exactly the same thing**:

```js
// Promise style
getCoffee.then((coffee) => console.log(coffee)).catch((err) => console.error(err));

// async/await style - same thing, cleaner look
async function order() {
  const coffee = await getCoffee();
  console.log(coffee);
}
```

### The Rules of async/await

**Rule 1:** Any function marked `async` **always returns a Promise** - even if you just return a plain value.

```js
async function sayHello() {
  return 'hello'; // JS wraps this in Promise.resolve('hello') automatically
}

sayHello(); // → returns a Promise, not "hello" directly
```

**Rule 2:** `await` can only be used **inside** an `async` function. Using it outside is a syntax error.

```js
// ❌ syntax error
const coffee = await getCoffee();

// ✅ correct
async function order() {
  const coffee = await getCoffee(); // pauses here until Promise resolves
  console.log(coffee);
}
```

**Rule 3:** `await` pauses execution of the `async` function - but **not** the rest of your app. The event loop keeps running other code while it waits.

## Error Handling - try/catch

With `.then()` chains you use `.catch()` for errors. With `async/await` you use **try/catch** - which is the standard JavaScript error handling pattern.

```js
async function order() {
  try {
    const coffee = await getCoffee(); // if this rejects...
    console.log(coffee); // ...this line is skipped
  } catch (err) {
    console.error(err); // ...and we land here instead
  } finally {
    console.log('Order closed'); // always runs
  }
}
```

The full comparison:

| Promise chains        | async/await         |
| --------------------- | ------------------- |
| `.then(value => ...)` | `await`             |
| `.catch(err => ...)`  | `try/catch`         |
| `.finally(() => ...)` | `finally {}`        |
| `resolve()`           | `return`            |
| `reject()`            | `throw new Error()` |

### The Safety Net Rule

`throw new Error()` inside a `try/catch` or `.catch()` will **not crash your app** - the catch block is the safety net that handles it gracefully. It only crashes your app if there is **no catch anywhere** to handle it.

```js
// 🥅 safety net catches the throw - app survives
try {
  throw new Error('something broke');
} catch (err) {
  console.error(err); // handled, app keeps running
}

// 💥 no net - app crashes
throw new Error('something broke'); // unhandled, everything stops
```

## Putting It All Together

Here's a real-world example combining everything - fetching a user from an API with a timeout:

```js
async function fetchUserWithTimeout(userId) {
  const fetchUser = fetch(`https://api.example.com/users/${userId}`).then((res) => res.json());

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out ⏰')), 5000),
  );

  try {
    const user = await Promise.race([fetchUser, timeout]);
    console.log('Got user:', user.name);
    return user;
  } catch (err) {
    console.error('Failed:', err.message);
  }
}

fetchUserWithTimeout(1);
```

This uses:

- `fetch()` returning a Promise
- `Promise.race()` to enforce a timeout
- `async/await` for clean syntax
- `try/catch` for error handling

## Conclusion

Async JavaScript isn't complicated - it just requires the right mental model. Here's everything in one place:

| Topic              | Main rule                                                                      |
| ------------------ | ------------------------------------------------------------------------------ |
| Event loop order   | Synchronous code -> microtasks (`Promise`) -> macrotasks (`setTimeout`)        |
| Promise states     | Pending -> fulfilled with `resolve()` or rejected with `reject()`              |
| Consuming Promises | `.then()` handles success, `.catch()` handles errors, `.finally()` always runs |
| Chaining           | Each `.then()` passes its value to the next step                               |
| Chain errors       | Any error short-circuits straight to `.catch()`                                |
| `Promise.all()`    | Waits for all Promises to resolve                                              |
| `Promise.race()`   | Uses the first Promise to settle, resolved or rejected                         |
| `async` functions  | Always return a Promise                                                        |
| `await`            | Pauses the async function until the Promise resolves                           |
| `try/catch`        | Handles async errors cleanly                                                   |

It really is as simple as buying a cup of coffee. ☕

You just need to know who's making it, when it'll be ready, and what to do if the machine breaks.
