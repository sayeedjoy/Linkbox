'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { useForwardedRef } from '@/lib/use-forwarded-ref';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pipette } from 'lucide-react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import {
  hexToHsv,
  hsvToHex,
  normalizeHex,
} from '@/lib/color-utils';
import type { HSV } from '@/lib/color-utils';

export const COLOR_PRESETS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onCloseWithValue?: (hex: string) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
  size?: React.ComponentProps<typeof Button>['size'];
}

const ColorPicker = forwardRef<
  HTMLInputElement,
  ColorPickerProps & Omit<React.ComponentProps<'button'>, 'value' | 'onChange' | 'onBlur'>
>(
  (
    {
      disabled,
      value,
      onChange,
      onBlur,
      onCloseWithValue,
      name,
      className,
      ...props
    },
    forwardedRef
  ) => {
  const ref = useForwardedRef<HTMLInputElement>(forwardedRef);
  const [open, setOpen] = useState(false);
  const [hasEyedropper, setHasEyedropper] = useState(false);
  const satRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => setHasEyedropper(typeof window !== 'undefined' && 'EyeDropper' in window), []);

  const parsedValue = useMemo(() => {
    const v = value || '#ffffff';
    return v.startsWith('#') ? v : '#' + v;
  }, [value]);

  const hsv = useMemo(() => hexToHsv(parsedValue), [parsedValue]);

  const [internalHex, setInternalHex] = useState(parsedValue);
  useEffect(() => setInternalHex(parsedValue), [parsedValue]);

  const updateFromHsv = useCallback(
    (next: HSV) => {
      const hex = hsvToHex(next.h, next.s, next.v);
      setInternalHex(hex);
      onChange(hex);
    },
    [onChange]
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        onBlur?.();
        onCloseWithValue?.(internalHex);
      }
      setOpen(next);
    },
    [internalHex, onBlur, onCloseWithValue]
  );

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e?.currentTarget?.value ?? '';
      const withHash = raw.startsWith('#') ? raw : '#' + raw;
      setInternalHex(withHash);
      onChange(withHash);
    },
    [onChange]
  );

  const handleHexBlur = useCallback(() => {
    const norm = normalizeHex(internalHex);
    setInternalHex(norm);
    onChange(norm);
    onBlur?.();
  }, [internalHex, onChange, onBlur]);

  const handleEyedropper = useCallback(() => {
    if (typeof window === 'undefined' || !('EyeDropper' in window)) return;
    const EyeDropperCtor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    new EyeDropperCtor().open().then((result) => {
      const hex = result.sRGBHex;
      setInternalHex(hex);
      onChange(hex);
    }).catch(() => {});
  }, [onChange]);

  const hueBg =
    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';

  const getSatRect = useCallback(() => satRef.current?.getBoundingClientRect() ?? null, []);

  const pointToSv = useCallback(
    (clientX: number, clientY: number): { s: number; v: number } => {
      const rect = getSatRect();
      if (!rect) return { s: hsv.s, v: hsv.v };
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      const s = Math.max(0, Math.min(1, x));
      const v = Math.max(0, Math.min(1, 1 - y));
      return { s, v };
    },
    [getSatRect, hsv.s, hsv.v]
  );

  const handleSatPointer = useCallback(
    (clientX: number, clientY: number) => {
      const { s, v } = pointToSv(clientX, clientY);
      updateFromHsv({ ...hsv, s, v });
    },
    [hsv, pointToSv, updateFromHsv]
  );

  const onSatPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDragging.current = true;
      handleSatPointer(e.clientX, e.clientY);
    },
    [handleSatPointer]
  );

  useEffect(() => {
    if (!isDragging.current) return;
    const move = (e: PointerEvent) => handleSatPointer(e.clientX, e.clientY);
    const up = () => { isDragging.current = false; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [handleSatPointer]);

  const satPercent = hsv.s * 100;
  const valPercent = (1 - hsv.v) * 100;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          name={name}
          aria-label="Open color picker"
          className={cn(
            'h-2.5 w-2.5 shrink-0 rounded-full border border-border shadow-sm transition-transform hover:scale-125',
            className
          )}
          style={{ backgroundColor: parsedValue }}
          {...props}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[280px] p-4 flex flex-col gap-4"
      >
        <div
          ref={satRef}
          className="h-40 w-full cursor-crosshair rounded-sm border border-border relative select-none"
          onPointerDown={onSatPointerDown}
          style={{
            backgroundColor: hsvToHex(hsv.h, 1, 1),
          }}
        >
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              background: 'linear-gradient(to right, white, transparent)',
            }}
          />
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              background: 'linear-gradient(to bottom, transparent, black)',
            }}
          />
          <div
            className="absolute size-3 rounded-full border-2 border-white shadow-sm pointer-events-none"
            style={{
              left: `${satPercent}%`,
              top: `${valPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <SliderPrimitive.Root
            max={360}
            step={1}
            value={[Math.round(hsv.h)]}
            onValueChange={([v]) => updateFromHsv({ ...hsv, h: v ?? 0 })}
            className="relative flex w-full touch-none select-none items-center"
          >
            <SliderPrimitive.Track
              className="relative h-3 w-full grow overflow-hidden rounded-full"
              style={{ background: hueBg }}
            >
              <SliderPrimitive.Range className="absolute h-full" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block size-4 rounded-full border border-primary/50 bg-background shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
          </SliderPrimitive.Root>
        </div>
        <div className="flex items-center gap-2">
          <Input
            ref={ref}
            className="flex-1 font-mono text-sm"
            maxLength={7}
            value={internalHex}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            aria-label="Hex color"
          />
          {hasEyedropper ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg border border-border"
              onClick={handleEyedropper}
              aria-label="Pick color from screen"
            >
              <Pipette className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              className="h-6 w-6 rounded-full border border-border/50 hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: hex }}
              onClick={() => updateFromHsv(hexToHsv(hex))}
              aria-label={`Color ${hex}`}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});
ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
