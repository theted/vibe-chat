# Project Guidelines

## Communication Style

- Write concisely, omit articles (a/the) when clear
- Prioritize clarity over grammar perfection
- Get to point fast

## Code Standards

### Modern JavaScript

- Use ES7+ features (async/await, optional chaining, nullish coalescing)
- Prefer `const` over `let`, avoid `var`
- Use destructuring for props/objects
- Template literals over string concatenation

### Functions

- Arrow functions everywhere unless need `this` binding
- Implicit returns for simple components: `const Button = () => <button />`

### File Organization

- Split files when >250 lines or multiple concerns
- Separate: components, hooks, utils, types
- One component per file (unless tightly coupled)
- Group related features in folders

### Comments

- Explain WHY not WHAT
- Complex logic needs brief context
- Document non-obvious decisions
- Skip obvious stuff like `// set state`
- Top-level comment for file purpose if unclear

## React Patterns

- Functional components only
- Custom hooks for shared logic
- Keep components focused, single responsibility

## Error Handling

- Use try/catch for async operations
- Provide user-friendly error messages
- Avoid silent failures - at minimum log errors

## Performance

- Memoize expensive computations: `useMemo`, `useCallback`
- Lazy load routes/heavy components
- Avoid inline object/array creation in render
- Debounce/throttle frequent operations

## Data Handling

- Prefer immutable updates (spread operator)
- Use optional chaining: `user?.profile?.name`
- Nullish coalescing for defaults: `value ?? 'default'`
- Array methods over loops: `map`, `filter`, `reduce`

## Naming

- Boolean variables: `isLoading`, `hasError`, `canSubmit`
- Handlers: `handleClick`, `onSubmit`
- Avoid abbreviations unless standard (`idx` ❌, `id` ✅)

## Dependencies

- Keep minimal - evaluate before adding
- Prefer native solutions when simple
- Document why unusual dependencies needed

## State Management

- Local state first, lift when needed
- Context for theme/auth, not everything
- Derive don't duplicate state

## Testing Considerations

- Write testable code: pure functions, isolated logic
- Avoid complex component logic - extract to hooks/utils

## Examples

**Good:**

```javascript
// handles pagination + filters state
const useTableControls = () => {
  const [page, setPage] = useState(0);
  return { page, setPage };
};
```
