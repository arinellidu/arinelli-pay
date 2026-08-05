import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge readout inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-[4px] border border-transparent px-2 text-[10px] font-medium tracking-[0.12em] whitespace-nowrap uppercase transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_0_12px_-4px_rgb(229_184_46/50%)] [a]:hover:bg-signal-bright",
        signal: "border-signal/55 bg-signal/18 text-signal-bright shadow-[inset_0_1px_0_rgb(255_217_102/12%),0_0_16px_-6px_rgb(229_184_46/35%)]",
        alert: "border-alert/35 bg-alert/10 text-alert",
        neutral: "border-white/10 bg-white/5 text-read-soft",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border-border text-foreground [a]:hover:border-signal/30",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant = "default", render, ...props }: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: "badge", variant },
  });
}

export { Badge, badgeVariants };
