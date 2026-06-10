/**
 * Spinner Component - Small inline loading indicator
 */

const Spinner = () => (
  <svg
    className="animate-spin w-3.5 h-3.5 text-primary-400"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      cx="12" cy="12" r="9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeDasharray="28 56"
      strokeLinecap="round"
    />
  </svg>
);

export default Spinner;
