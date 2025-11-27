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
- Separate: components, hooks, utils, types, **config/constants**
- One component per file (unless tightly coupled)
- Group related features in folders
- Extract sub-components when component has multiple internal components
- Move large config objects/arrays to separate files in `config/` or `constants/`

### Comments

- Explain WHY not WHAT
- Complex logic needs brief context
- Document non-obvious decisions
- Skip obvious stuff like `// set state`
- Top-level comment for file purpose if unclear

### Constants & Configuration

- Extract magic numbers to named constants
- Use UPPER_SNAKE_CASE for constants
- Group related constants in config files
- Keep config separate from logic
- Examples: timeouts, limits, defaults, thresholds

## React Patterns

- Functional components only
- Custom hooks for shared logic
- Keep components focused, single responsibility
- Destructure props in function signature
- Extract sub-components when >3 internal components

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

## Styling (Tailwind CSS)

- Avoid dynamic class generation: `` `text-${color}-500` `` won't work with purging
- Use conditional logic with full class names: `color === 'blue' ? 'text-blue-500' : 'text-red-500'`
- Extract repeated class strings to constants
- Use `clsx` or `classnames` for complex conditional classes

## Imports

- Group imports: external libs → internal modules → components → utils → types
- Use named imports over default when possible
- Keep imports alphabetized within groups
- Remove unused imports

## Logging

- Remove debug console.log before committing
- Use proper logging library for production
- Log errors with context (not just error.message)
- Avoid logging sensitive data (tokens, passwords, PII)

## Examples

### File Organization

**Bad:**
```javascript
// ParticipantsList.jsx (305 lines)
const DEFAULT_AI_PARTICIPANTS = [ /* 80+ lines of config */ ];
const ParticipantsList = () => { /* component logic */ };
```

**Good:**
```javascript
// config/aiParticipants.js
export const DEFAULT_AI_PARTICIPANTS = [ /* config */ ];

// components/ParticipantsList.jsx
import { DEFAULT_AI_PARTICIPANTS } from '../config/aiParticipants';
const ParticipantsList = () => { /* component logic */ };
```

### Tailwind Dynamic Classes

**Bad:**
```jsx
<div className={`text-${color}-500 bg-${color}-100`}>
```

**Good:**
```jsx
const colorClasses = {
  blue: 'text-blue-500 bg-blue-100',
  red: 'text-red-500 bg-red-100'
};
<div className={colorClasses[color]}>
```

### Component Extraction

**Bad:**
```javascript
const Dashboard = () => {
  const MetricCard = ({title}) => <div>...</div>;
  const ProgressBar = ({value}) => <div>...</div>;
  return <div>...</div>;
};
```

**Good:**
```javascript
// components/MetricCard.jsx
const MetricCard = ({title}) => <div>...</div>;

// components/Dashboard.jsx
import MetricCard from './MetricCard';
const Dashboard = () => <div>...</div>;
```

### Constants

**Bad:**
```javascript
setTimeout(() => emit('get-metrics'), 30000);
if (messages.length > 100) { /* ... */ }
```

**Good:**
```javascript
const METRICS_REFRESH_INTERVAL_MS = 30_000;
const MAX_CACHED_MESSAGES = 100;

setTimeout(() => emit('get-metrics'), METRICS_REFRESH_INTERVAL_MS);
if (messages.length > MAX_CACHED_MESSAGES) { /* ... */ }
```

### Hooks

**Good:**
```javascript
// handles pagination + filters state
const useTableControls = () => {
  const [page, setPage] = useState(0);
  return { page, setPage };
};
```
