---
title: 'React Hooks Demystified: useState, useEffect, useRef, useMemo, useCallback, lazy and Suspense'
description: 'A practical mental model for React hooks — from the most basic to the ones that will impress your interviewer. With coffee.'
pubDate: 'Jun 27 2026'
tags: ['react', 'hooks', 'javascript']
---

> You don't need to fear React hooks. You just need the right mental model — and a good cup of coffee. ☕

## Overview

More and more I've been using AI as a tool to generate code — orchestrating it to write whole features, preparing MCP servers, writing long todo lists, letting it help with research and architecture. It's not "vibe coding" — it's more like being a technical director.

But here's the thing: the more AI writes for me, the less I touch the raw fundamentals. And at some point I realized — I know _how_ to use React hooks, but I'd struggle to _explain_ them. So I wrote this article. Same coffee shop analogy I used in my [async/await article](/blog/event-loop-promises-async-await), same goal: build a mental model that actually sticks.

Let's go.

---

## The Rules of Hooks: Why the Order Matters

Before looking at individual hooks, we must understand the fundamental rules. React hooks are not magic, but they are highly disciplined.

1. **Only call Hooks at the top level:** Do not call Hooks inside loops, conditions, or nested functions.
2. **Only call Hooks from React functions:** Call them from React function components or custom Hooks.

### The Under-the-Hood Secret

Why do these rules exist? React does not use any internal naming to track hooks. Instead, it relies entirely on the **order in which they are called**.

React keeps an array of state cells for each component. On every render, React starts at index `0` and steps through the hook calls. If you place a hook inside an `if` statement, and that condition changes on the next render, the order of hook calls shifts:

```jsx
// ❌ Bug: Hook order shifts if status changes
if (status === 'VIP') {
  const [discount, setDiscount] = useState(0.1); // Don't do this!
}
const [sugar, setSugar] = useState(0); // Index shifts!
```

If the condition changes, React associates the `sugar` state with the `discount` cell, causing data corruption. Keep hook calls unconditional to ensure the call sequence is deterministic.

---

## useState — the state of your cup

`useState` is the foundation of React state management. It provides a **persistent memory slot** that survives between renders. When state updates, React schedules a re-render and executes the component function again with the new value.

### The coffee shop analogy

You walk in, you order a coffee. Your cup starts **empty** — that's your default state. When the barista finishes, the cup becomes **full of delicious coffee**.

```jsx
const [cup, setCup] = useState('empty');

const coffeeHandler = () => setCup('full of delicious coffee');
```

### The subtle trap — stale state and batching

React batches state updates to prevent unnecessary re-renders. If you trigger multiple updates in a single event handler, they all reference the same state snapshot.

Consider this example where we try to add two spoons of sugar at once:

```jsx
const [sugarSpoons, setSugarSpoons] = useState(0);

const addSugar = () => {
  // ❌ Potentially dangerous (stale state trap)
  setSugarSpoons(sugarSpoons + 1);
  setSugarSpoons(sugarSpoons + 1); // Both see sugarSpoons as 0. Result is 1, not 2.
};
```

Since both calls use the `sugarSpoons` value from the current render context (which is `0`), React receives `setSugarSpoons(0 + 1)` twice.

To fix this, pass an **updater callback function**:

```jsx
const addSugar = () => {
  // ✅ Correct
  setSugarSpoons((prev) => prev + 1);
  setSugarSpoons((prev) => prev + 1); // Reads the pending queue state. Result is 2.
};
```

| Syntax                | When to use                                      |
| --------------------- | ------------------------------------------------ |
| `setCup(newValue)`    | When the new value is independent of the old one |
| `setCup(prev => ...)` | When the new value depends on the previous one   |

---

## useEffect — reacting to changes

`useEffect` allows you to sync your component with external systems (APIs, timers, event listeners). It usually runs **after** React updates the DOM and the browser has painted the screen, though it may run before paint for layout or user-interaction-driven updates in specific circumstances.

### The coffee shop analogy

**Scenario 1 — The welcome greeting `[]`**  
The moment you walk in, the staff greets you. It happens exactly once per visit. This is `useEffect` with an empty dependency array.

**Scenario 2 — Coffee status updates `[coffeeState]`**  
Every time your order status changes (from _"brewing"_ to _"ready"_), the order board updates. This is `useEffect` with a dependency.

**Scenario 3 — Background music _(no array)_**  
The music plays constantly, executing its logic on every render. This is almost never what you want and should be avoided.

```jsx
// Runs once on mount only
useEffect(() => {
  console.log('Welcome to the React Café!');
}, []);

// Runs on mount and whenever coffeeState updates
useEffect(() => {
  console.log('Coffee status updated:', coffeeState);
}, [coffeeState]);

// Runs on every render (use with extreme caution)
useEffect(() => {
  console.log('Something re-rendered...');
});
```

### Cleanups — wiping the table

When a customer leaves, the staff wipes the table. If your effect sets up a subscription, interval, or event listener, you must return a **cleanup function** to prevent memory leaks.

```jsx
useEffect(() => {
  const interval = setInterval(() => {
    console.log('Brewing...');
  }, 1000);

  // 🧹 Clean the table when the customer leaves (unmount or dependency change)
  return () => clearInterval(interval);
}, []);
```

### The React 18+ Development Gotcha

In React 18+ development mode (under `StrictMode`), React intentionally mounts, unmounts, and remounts your components immediately on startup. Your effects will run twice.

This is not a bug; it is React stress-testing your cleanups. If running your effect twice breaks your application (e.g. creating duplicate connections), it means your cleanup function is missing or incomplete.

---

## useLayoutEffect — measuring the cup

`useLayoutEffect` is identical to `useEffect` in syntax, but it executes **synchronously** after DOM mutations, **before** the browser paints the screen.

### The coffee shop analogy

Imagine the barista placing a label on your cup. If they put it on after handing it to you, you might see them reposition it (a visual flash). If they position it perfectly _before_ handing it over, it's seamless.

Use `useLayoutEffect` only when you need to measure DOM elements (e.g., getting the height/width of a tooltip) and modify the DOM before the user sees the paint.

> [!WARNING]
> Because it runs synchronously, `useLayoutEffect` blocks browser painting. Keep logic inside it minimal to avoid performance bottlenecks.

---

## useRef — the persistent, quiet storage

`useRef` has two distinct use cases.

**Job 1 — Hold a reference to a DOM element**  
Like reaching directly to the espresso machine behind the counter.

```jsx
const machineRef = useRef(null)

// Later in JSX:
<div ref={machineRef}>Espresso Machine</div>
```

**Job 2 — Store a mutable value that persists between renders without causing a re-render**  
Unlike `useState`, updating a ref's `.current` property does **not** trigger a re-render.

### The Ref Golden Rule

> [!IMPORTANT]
> **Do not read or write to `ref.current` during rendering.**  
> React assumes rendering is a pure function. Modifying a ref during render introduces side effects directly into the render loop.

#### ❌ Incorrect Usage (Side effects in render)

```jsx
const timerRef = useRef(null);

// Bug: Spawns a new interval on EVERY render, leading to memory leaks and multiple timers.
timerRef.current = setInterval(() => {
  console.log('Brewing...');
}, 1000);
```

#### ✅ Correct Usage (Writing refs in effects or handlers)

```jsx
const timerRef = useRef(null);

const startBrewing = () => {
  if (timerRef.current !== null) return; // Already running

  timerRef.current = setInterval(() => {
    console.log('Brewing...');
  }, 1000);
};

const stopBrewing = () => {
  if (timerRef.current !== null) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};
```

---

## useMemo — the cashier who remembers your order

If you order an "oat milk flat white with one sugar" every day, the cashier eventually just hits the button for "the usual". They skip the processing step because they **cached** the calculation.

`useMemo` caches the **result of an expensive calculation** between renders. It only recalculates when the dependencies change.

```jsx
const totalPrice = useMemo(() => {
  return cartItems.reduce((sum, item) => sum + item.price, 0);
}, [cartItems]);
```

If `cartItems` hasn't changed, React bypasses the reduce logic entirely and returns the cached number.

### 💡 Modern Note: React Compiler (React 19)

With the introduction of the React Compiler (formerly React Forget) in React 19, React automatically applies memo-like optimizations to components and render-time values/functions under the hood when safe to do so. While manual `useMemo` is still common in older codebases and specialized optimization scenarios, you will write it less frequently as the compiler matures.

---

## useCallback — caching the receipt template

`useCallback` caches the **function definition itself**, not its return value.

Every time a parent component re-renders, it recreates all functions defined within it. If you pass one of these functions to a child component, the child sees a new reference and re-renders, even if nothing changed.

```jsx
const handleOrder = useCallback(() => {
  placeOrder(coffeeType);
}, [coffeeType]);
```

### The Critical Catch

`useCallback` is useless unless the child component receiving the prop is wrapped in `React.memo` (or uses `PureComponent`). If the child component is not memoized, it will re-render anyway when the parent does, regardless of whether the function reference is stable.

```jsx
// Without React.memo here, useCallback in the parent is wasted overhead
const OrderButton = React.memo(({ onOrder }) => {
  console.log('Button rendered');
  return <button onClick={onOrder}>Place Order</button>;
});
```

---

## lazy + Suspense — ordering ahead

You don't need to load the entire menu at the front door. You download components only when they are needed.

`React.lazy` splits a component into a separate bundle file that is downloaded on-demand. `Suspense` wraps the component and displays a fallback UI (like a loading spinner) while that file downloads.

```jsx
const SeasonalMenu = React.lazy(() => import('./SeasonalMenu'));

function App() {
  return (
    <Suspense fallback={<div>Loading menu...</div>}>
      <SeasonalMenu />
    </Suspense>
  );
}
```

---

## The Full Hook Menu

| Hook / API          | Primary Role                       | Re-renders on Change? | Coffee Shop Analogy                               |
| ------------------- | ---------------------------------- | --------------------- | ------------------------------------------------- |
| `useState`          | Local reactive state               | Yes                   | The liquid level of your cup                      |
| `useEffect`         | Non-blocking side effects          | No                    | Greeting on arrival, updating status board        |
| `useLayoutEffect`   | Blocking DOM measurements          | No                    | Barista aligning the cup precisely before pouring |
| `useRef`            | Mutable container / DOM reference  | No                    | The physical espresso machine                     |
| `useMemo`           | Caches computed values             | No                    | Cashier remembering "the usual" price             |
| `useCallback`       | Caches function references         | No                    | The pre-printed standing order receipt            |
| `lazy` + `Suspense` | Code-splitting and fallback states | No                    | Preparing the seasonal special only when ordered  |

☕ Understanding React hooks comes down to identifying:

1. What state needs to trigger UI updates (`useState`).
2. What logic needs to coordinate with the outside world (`useEffect` / `useLayoutEffect`).
3. What values can be stored silently (`useRef`).
4. What calculations are too heavy to repeat (`useMemo` / `useCallback`).

Have a nice day, keep coding, and never stop learning! 🚀
