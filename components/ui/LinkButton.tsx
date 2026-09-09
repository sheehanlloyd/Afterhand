import Link, { LinkProps } from "next/link";
import { ReactNode, type MouseEventHandler } from "react";
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
  onClick,
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
  onClick?: MouseEventHandler<HTMLAnchorElement>;
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
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}
