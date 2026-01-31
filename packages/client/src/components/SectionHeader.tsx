import type { SectionHeaderProps, IconName } from "@/types";
import Icon from "./Icon";

const SectionHeader = ({ icon, title, count }: SectionHeaderProps) => (
  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 bg-slate-50/70 backdrop-blur-sm flex items-center gap-2 dark:text-slate-300 dark:bg-slate-900/60">
    <Icon name={icon as IconName} className="w-4 h-4" />
    {title} ({count})
  </h4>
);

export default SectionHeader;
