'use client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

// ============================================================
// BUTTON
// ============================================================
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  const base = 'font-display tracking-widest transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-acid text-black hover:bg-white active:scale-95',
    secondary: 'border border-acid/30 text-acid hover:border-acid hover:bg-acid/5',
    ghost: 'text-muted hover:text-white',
    danger: 'border border-orange/30 text-orange hover:border-orange hover:bg-orange/5',
  };

  const sizes = {
    sm: 'text-sm px-4 py-2',
    md: 'text-base px-6 py-3',
    lg: 'text-lg px-8 py-4',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ============================================================
// INPUT
// ============================================================
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="font-mono text-xs tracking-widest text-muted uppercase">{label}</label>}
      <input
        className={cn(
          'bg-dim border border-acid/20 text-white font-body text-sm px-4 py-3',
          'placeholder:text-muted focus:outline-none focus:border-acid/60',
          'transition-colors',
          error && 'border-orange/50',
          className
        )}
        {...props}
      />
      {error && <span className="font-mono text-xs text-orange">{error}</span>}
    </div>
  );
}

// ============================================================
// TEXTAREA
// ============================================================
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="font-mono text-xs tracking-widest text-muted uppercase">{label}</label>}
      <textarea
        className={cn(
          'bg-dim border border-acid/20 text-white font-body text-sm px-4 py-3',
          'placeholder:text-muted focus:outline-none focus:border-acid/60',
          'transition-colors resize-none',
          error && 'border-orange/50',
          className
        )}
        {...props}
      />
      {error && <span className="font-mono text-xs text-orange">{error}</span>}
    </div>
  );
}

// ============================================================
// SELECT
// ============================================================
interface SelectProps {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function Select({ label, error, options, value, onChange, className }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="font-mono text-xs tracking-widest text-muted uppercase">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'bg-dim border border-acid/20 text-white font-body text-sm px-4 py-3',
          'focus:outline-none focus:border-acid/60 cursor-pointer',
          'transition-colors appearance-none',
          error && 'border-orange/50',
          className
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-dim">{o.label}</option>
        ))}
      </select>
      {error && <span className="font-mono text-xs text-orange">{error}</span>}
    </div>
  );
}

// ============================================================
// BADGE
// ============================================================
interface BadgeProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color = '#5a5a72', className }: BadgeProps) {
  return (
    <span
      className={cn('font-mono text-xs tracking-widest px-2 py-1 border', className)}
      style={{ borderColor: `${color}40`, color }}
    >
      {children}
    </span>
  );
}

// ============================================================
// LIVE BADGE
// ============================================================
export function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-acid border border-acid/30 px-2 py-1">
      <span className="live-dot" />
      LIVE
    </span>
  );
}

// ============================================================
// SECTION LABEL
// ============================================================
export function SectionLabel({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 font-mono text-xs tracking-widest text-acid uppercase mb-8">
      {index && <span className="text-muted">{index}</span>}
      <span className="w-6 h-px bg-acid" />
      {children}
    </div>
  );
}

// ============================================================
// SPINNER
// ============================================================
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-acid" />;
}

// ============================================================
// EMPTY STATE
// ============================================================
export function EmptyState({ icon, title, description }: { icon?: string; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <span className="text-4xl mb-4">{icon}</span>}
      <h3 className="font-display text-2xl text-muted mb-2">{title}</h3>
      {description && <p className="font-mono text-xs text-muted/60 max-w-xs">{description}</p>}
    </div>
  );
}

// ============================================================
// PROGRESS BAR
// ============================================================
export function ProgressBar({ value, max = 100, color = '#c8ff00' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1 bg-dim overflow-hidden">
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
