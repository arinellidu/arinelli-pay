import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_8px_24px_-12px_rgb(229_184_46/55%)] hover:bg-signal-bright hover:text-primary-foreground",
        signal: "border-signal-bright/50 bg-gradient-to-b from-signal-bright via-signal to-signal-deep font-semibold tracking-[0.08em] text-primary-foreground uppercase shadow-[inset_0_1px_0_rgb(255_255_255/42%),0_14px_32px_-14px_rgb(229_184_46/85%)] hover:from-[#ffe07a] hover:via-signal-bright hover:to-signal hover:shadow-[inset_0_1px_0_rgb(255_255_255/48%),0_18px_40px_-12px_rgb(255_217_102/55%)]",
        glass: "glass font-medium tracking-[0.08em] text-read uppercase hover:border-signal/45 hover:bg-white/10 hover:text-signal-bright hover:shadow-[0_0_24px_-8px_rgb(229_184_46/25%)]",
        outline: "border-border bg-transparent text-foreground hover:border-signal/30 hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-white/12",
        ghost: "text-read-soft hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
