import clsx from "clsx";

import { getStatDescription } from "@/lib/statGlossary";

interface StatTooltipProps {
  label: string;
  description?: string | null;
  className?: string;
  triggerClassName?: string;
  tooltipClassName?: string;
}

export default function StatTooltip({
  label,
  description,
  className,
  triggerClassName,
  tooltipClassName,
}: StatTooltipProps) {
  const resolvedDescription = description ?? getStatDescription(label);

  if (!resolvedDescription) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span
      className={clsx(
        "group/stat relative inline-flex items-center",
        className,
      )}
    >
      <span
        aria-label={`${label}: ${resolvedDescription}`}
        className={clsx(
          "cursor-default transition-colors group-hover/stat:text-text",
          triggerClassName,
        )}
      >
        {label}
      </span>
      <span
        role="tooltip"
        className={clsx(
          "pointer-events-none font-sans absolute left-1/2 top-full z-40 mt-2 w-max max-w-[11rem] -translate-x-1/2 translate-y-1 whitespace-normal break-words rounded-md border border-white/10 bg-background px-2.5 py-1.5 text-center normal-case opacity-0 transition-all duration-150 group-hover/stat:translate-y-0 group-hover/stat:opacity-100",
          tooltipClassName,
        )}
      >
        <span className="block text-xs leading-5 text-text/90">
          {resolvedDescription}
        </span>
      </span>
    </span>
  );
}
