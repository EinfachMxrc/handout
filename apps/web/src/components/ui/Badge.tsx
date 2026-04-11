interface BadgeProps {
  variant: "green" | "yellow" | "red" | "blue" | "gray";
  children: React.ReactNode;
}

const variantClasses = {
  green: "border-emerald-500/20 bg-emerald-50/90 text-emerald-800",
  yellow: "border-amber-500/20 bg-amber-50/90 text-amber-800",
  red: "border-rose-500/20 bg-rose-50/90 text-rose-800",
  blue: "border-sky-500/20 bg-sky-50/90 text-sky-800",
  gray: "border-stone-500/15 bg-stone-100/80 text-stone-700",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
