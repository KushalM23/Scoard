import React from "react";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = ["animate-pulse rounded-md bg-primary/10", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      {...props}
    />
  )
}

export { Skeleton }
