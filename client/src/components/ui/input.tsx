import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        {...props}
        className={cn(
          // ---- LAGAÐUR STYLLING ----
          // Hvítur bakgrunnur, svartur texti, svartur rammi
          "flex h-9 w-full rounded-md border border-black bg-white px-3 py-2",
          "text-base text-black placeholder:text-gray-500",
          "shadow-sm",

          // Focus áhrif – skýrt og hreinlegt
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1",

          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",

          // File input stillingar
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",

          // Mobile scaling
          "md:text-sm",
          className,
        )}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
