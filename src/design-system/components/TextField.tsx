import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  suffix?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, suffix, className, ...rest }, ref) {
  return (
    <div>
      {label ? <label className="block text-ink-dim text-sm font-medium mb-2">{label}</label> : null}
      <div className="flex items-center bg-surface border border-line-subtle rounded-2xl px-4 focus-within:border-line">
        <input
          ref={ref}
          className={cn("flex-1 bg-transparent text-ink text-base font-medium py-3.5 outline-none placeholder:text-ink-faint", className)}
          {...rest}
        />
        {suffix ? <span className="text-ink-faint text-sm font-medium ml-2">{suffix}</span> : null}
      </div>
    </div>
  );
});

export function TextAreaField({ label, className, ...rest }: TextAreaFieldProps) {
  return (
    <div>
      {label ? <label className="block text-ink-dim text-sm font-medium mb-2">{label}</label> : null}
      <div className="flex bg-surface border border-line-subtle rounded-2xl px-4 focus-within:border-line">
        <textarea
          className={cn("flex-1 bg-transparent text-ink text-base font-medium py-3.5 outline-none placeholder:text-ink-faint resize-none", className)}
          {...rest}
        />
      </div>
    </div>
  );
}
