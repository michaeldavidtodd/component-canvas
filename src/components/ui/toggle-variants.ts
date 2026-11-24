import { cva } from "class-variance-authority"

export const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:text-foreground hover:data-[state=on]:bg-primary/80 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
        outline:
          "border borer-input-border bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
