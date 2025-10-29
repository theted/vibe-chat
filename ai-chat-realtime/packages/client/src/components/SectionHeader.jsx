import React from 'react';
import Icon from './Icon.jsx';

const SectionHeader = ({ icon, title, count }) => (
  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 bg-slate-50/70 backdrop-blur-sm flex items-center gap-2 dark:text-slate-300 dark:bg-slate-900/60">
    <Icon name={icon} className="w-4 h-4" />
    {title} ({count})
  </h4>
);

export default SectionHeader;
