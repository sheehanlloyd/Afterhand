"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import {
  ButtonSize,
  ButtonVariant,
  buttonBase,
  buttonSizes,
  buttonVariants,
  plateType,
} from "./button-styles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Uppercase mono lettering, used for table controls and eyebrow actions. */
  plate?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", block, plate, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        plate ? plateType : "font-medium",
        block && "w-full",
        className,
      )}
      {...props}
    />
  );
});
