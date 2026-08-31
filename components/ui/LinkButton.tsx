import Link, { LinkProps } from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  ButtonSize,
  ButtonVariant,
  buttonBase,
  buttonSizes,
  buttonVariants,
  plateType,
} from "./button-styles";

export function LinkButton({
  className,
  variant = "secondary",
  size = "md",
  block,
  plate,
  children,
  ...props
}: LinkProps & {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  plate?: boolean;
  children: ReactNode;
  "aria-label"?: string;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      className={cn(
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        plate ? plateType : "font-medium",
        block && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
