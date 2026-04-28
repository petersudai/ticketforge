"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// ── Button ──────────────────────────────────────────────────────────
const buttonVariants = cva(
  "inline-flex items-center justify-content gap-2 whitespace-nowrap rounded-[10px] text-[12px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: "bg-brand-500 text-white hover:bg-brand-600",
        secondary: "bg-white/[0.05] text-[#f0f0f8] border border-white/[0.12] hover:border-white/[0.22] hover:bg-white/[0.08]",
        ghost: "text-[#9898b0] hover:text-[#f0f0f8] hover:bg-white/[0.05]",
        destructive: "bg-red-500/[0.12] text-red-400 border border-red-500/[0.25] hover:bg-red-500/[0.2]",
        success: "bg-emerald-500 text-white hover:bg-emerald-600",
        mpesa: "bg-[#00A550] text-white hover:bg-[#007a3d]",
        outline: "border border-white/[0.15] text-[#f0f0f8] hover:bg-white/[0.05]",
      },
      size: {
        sm: "px-3 py-1.5 text-[11px] rounded-[8px]",
        default: "px-4 py-2",
        lg: "px-5 py-2.5 text-[13px]",
        icon: "h-8 w-8 rounded-[8px]",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";

// ── Card ─────────────────────────────────────────────────────────────
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-[#111118] border border-white/[0.07] rounded-2xl p-5", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 pb-3 border-b border-white/[0.07]", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("font-heading text-[10px] font-semibold text-[#5a5a72] tracking-[0.07em] uppercase", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

// ── Badge ─────────────────────────────────────────────────────────────
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-2 py-0.5",
  {
    variants: {
      variant: {
        purple: "bg-brand-500/[0.18] text-brand-300",
        green: "bg-emerald-500/[0.15] text-emerald-400",
        amber: "bg-amber-500/[0.15] text-amber-400",
        blue: "bg-blue-500/[0.15] text-blue-400",
        gray: "bg-white/[0.07] text-[#9898b0]",
        red: "bg-red-500/[0.15] text-red-400",
        mpesa: "bg-[#00A550]/[0.18] text-emerald-300",
      },
    },
    defaultVariants: { variant: "gray" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

// ── Input ─────────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-3 py-2 bg-[#18181f] border border-white/[0.1] rounded-[10px] text-[12px] text-[#f0f0f8] placeholder:text-[#5a5a72] outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ── Select ────────────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full px-3 py-2 bg-[#18181f] border border-white/[0.1] rounded-[10px] text-[12px] text-[#f0f0f8] outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 appearance-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

// ── Textarea ──────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3 py-2 bg-[#18181f] border border-white/[0.1] rounded-[10px] text-[12px] text-[#f0f0f8] placeholder:text-[#5a5a72] outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-y min-h-[72px]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

// ── Label ─────────────────────────────────────────────────────────────
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-[11px] text-[#9898b0] mb-1.5", className)} {...props} />
  );
}

// ── Field ─────────────────────────────────────────────────────────────
export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, valueClass }: { label: string; value: string | number; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-[#18181f] rounded-xl p-4 border border-white/[0.06]">
      <div className="font-heading text-[10px] text-[#5a5a72] uppercase tracking-[0.06em] mb-1.5">{label}</div>
      <div className={cn("font-heading text-[22px] font-bold", valueClass || "text-[#f0f0f8]")}>{value}</div>
      {sub && <div className="text-[10px] text-[#5a5a72] mt-1">{sub}</div>}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────
export function ProgressBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn("h-1 bg-white/[0.06] rounded-full overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, background: color || "#6C5CE7" }}
      />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────
export function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" | "info" }) {
  const colors = { success: "border-emerald-500/30", error: "border-red-500/30", info: "border-brand-500/30" };
  return (
    <div className={cn("fixed bottom-5 right-5 bg-[#111118] border rounded-xl px-4 py-3 text-[12px] text-[#f0f0f8] z-[9999] shadow-xl", colors[type])}>
      {message}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-white/[0.07] my-4", className)} />;
}

// ── Empty State ───────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description }: { icon?: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-[#5a5a72]" />
        </div>
      )}
      <div className="text-[13px] font-medium text-[#9898b0]">{title}</div>
      {description && <div className="text-[11px] text-[#5a5a72] mt-1">{description}</div>}
    </div>
  );
}
