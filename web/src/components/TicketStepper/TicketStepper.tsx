export type TicketStepperProps = {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function TicketStepper({
  value,
  min = 0,
  max,
  disabled,
  onChange,
}: TicketStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-full border border-ink/15 text-lg leading-none disabled:opacity-30"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        aria-label="Quitar"
      >
        −
      </button>
      <span className="w-6 text-center tabular-nums">{value}</span>
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-full border border-ink/15 text-lg leading-none disabled:opacity-30"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="Agregar"
      >
        +
      </button>
    </div>
  );
}
