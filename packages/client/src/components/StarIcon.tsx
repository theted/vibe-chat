/**
 * StarIcon - filled star for saved snippets. Kept apart from Icon, whose
 * glyphs are all stroked outlines.
 */

const StarIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 3l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78L3.58 9.62l5.82-.85L12 3z" />
  </svg>
);

export default StarIcon;
