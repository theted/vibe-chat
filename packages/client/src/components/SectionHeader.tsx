import type { SectionHeaderProps } from "@/types";

const SectionHeader = ({ title, count }: SectionHeaderProps) => (
  <h3 className="flex items-baseline justify-between px-5 pb-1.5 pt-4 font-display text-sm font-semibold text-fg">
    {title}
    <span className="font-sans text-xs font-normal tabular-nums text-faint">
      {count}
    </span>
  </h3>
);

export default SectionHeader;
