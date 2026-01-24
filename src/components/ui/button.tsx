import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-xl text-xl font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-6 [&_svg]:shrink-0 active:scale-[0.97] haptic-tap",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-elder",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-elder",
        outline: "border-3 border-primary bg-background hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-elder",
        ghost: "hover:bg-accent/20 hover:text-accent",
        link: "text-primary underline-offset-4 hover:underline",
        // Elder-friendly action buttons - Extra visible
        take: "bg-success text-success-foreground hover:bg-success/90 shadow-success text-2xl font-extrabold min-h-[72px]",
        skip: "bg-muted text-foreground hover:bg-muted/80 border-3 border-border text-2xl font-bold min-h-[72px]",
        snooze: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-elder text-2xl font-bold min-h-[72px]",
        // Accent button for important actions
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-accent",
        // Pill-shaped for navigation
        pill: "rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground",
        // PIN pad buttons
        pin: "rounded-2xl bg-card text-foreground text-pin font-bold hover:bg-secondary border-2 border-border shadow-elder min-h-[80px] min-w-[80px]",
        "pin-action": "rounded-2xl bg-primary text-primary-foreground text-2xl font-bold hover:bg-primary/90 shadow-elder min-h-[80px]",
      },
      size: {
        default: "h-14 px-6 py-3",
        sm: "h-12 rounded-lg px-4 text-lg",
        lg: "h-16 rounded-xl px-8 text-2xl",
        xl: "h-20 rounded-2xl px-10 text-2xl",
        "2xl": "h-24 rounded-3xl px-12 text-3xl",
        icon: "h-14 w-14",
        "icon-lg": "h-18 w-18",
        "icon-xl": "h-20 w-20",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
