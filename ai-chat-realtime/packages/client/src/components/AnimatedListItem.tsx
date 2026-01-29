import { motion } from 'framer-motion';
import type { AnimatedListItemProps } from '../types';

const AnimatedListItem = ({ children, index = 0, className = '' }: AnimatedListItemProps) => (
  <motion.div
    className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-b-0 dark:border-slate-900/40 transition-colors ${className}`.trim()}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      delay: index * 0.05,
      duration: 0.3,
      ease: 'easeOut'
    }}
    whileHover={{
      scale: 1.02,
      transition: { duration: 0.2 }
    }}
  >
    {children}
  </motion.div>
);

export default AnimatedListItem;
