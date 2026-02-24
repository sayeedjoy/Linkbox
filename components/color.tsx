'use client';

import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { cn } from '@/lib/utils';
import { useForwardedRef } from '@/lib/use-forwarded-ref';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

const PRESET_COLORS = [
  '#ff6b4a',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#5ac8fa',
  '#007aff',
  '#af52de',
  '#ff2d55',
];

function normalizeHex(raw: string): string {
  const s = raw.replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '');
  if (s.length >= 6) return '#' + s.slice(0, 6).toLowerCase();
  if (s.length > 0) return '#' + s.padEnd(6, '0').toLowerCase();
  return '#000000';
}

function BrushIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4', className)}
    >
      <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
    </svg>
  );
}

function EyedropperIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4', className)}
    >
      <path d="m2 22 1-1h3l9-9" />
      <path d="M3 21v-3l9-9" />
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4" />
    </svg>
  );
}

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

const ColorPicker = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Button>, 'value' | 'onChange' | 'onBlur'> & ColorPickerProps
>(
  (
    { disabled, value, onChange, onBlur, name, className, size, ...props },
    forwardedRef
  ) => {
    const ref = useForwardedRef(forwardedRef);
    const [open, setOpen] = useState(false);
    const [hasEyedropper, setHasEyedropper] = useState(false);
    useEffect(() => setHasEyedropper(typeof window !== 'undefined' && 'EyeDropper' in window), []);

    const parsedValue = useMemo(() => {
      const v = value || '#FFFFFF';
      return v.startsWith('#') ? v : '#' + v;
    }, [value]);

    const handleHexChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e?.currentTarget?.value ?? '';
        onChange(raw.startsWith('#') ? raw : '#' + raw);
      },
      [onChange]
    );

    const handleHexBlur = useCallback(() => {
      onChange(normalizeHex(parsedValue));
      onBlur?.();
    }, [parsedValue, onChange, onBlur]);

    const handleEyedropper = useCallback(() => {
      if (typeof window === 'undefined' || !('EyeDropper' in window)) return;
      const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
      eyeDropper.open().then((result) => onChange(result.sRGBHex)).catch(() => {});
    }, [onChange]);

    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild disabled={disabled} onBlur={onBlur}>
          <Button
            {...props}
            className={cn('shrink-0 border-0 rounded-none shadow-none', className)}
            name={name}
            onClick={() => setOpen(true)}
            size={size}
            variant="ghost"
            aria-label="Open color picker"
          >
            <BrushIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-lg" style={{ width: 220 }}>
              <HexColorPicker color={parsedValue} onChange={onChange} style={{ width: '100%', height: 160 }} />
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1 rounded-lg font-mono text-sm"
                maxLength={7}
                onBlur={handleHexBlur}
                onChange={handleHexChange}
                ref={ref}
                value={parsedValue}
                aria-label="Hex color"
              />
              {hasEyedropper ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg"
                  onClick={handleEyedropper}
                  aria-label="Pick color from screen"
                >
                  <EyedropperIcon />
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className="size-6 shrink-0 rounded-full border border-border shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  style={{ backgroundColor: hex }}
                  onClick={() => {
                    onChange(hex);
                    setOpen(false);
                  }}
                  aria-label={`Choose color ${hex}`}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);
ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
