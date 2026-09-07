interface WaveDividerProps {
  /** Tailwind color class for the wave fill, e.g. 'fill-tertiary' or '#F9E4D4' */
  fill?: string;
  /** Render the wave flipped vertically (wave on top instead of bottom) */
  flip?: boolean;
  className?: string;
}

/**
 * Curved "curl" SVG section divider. Place it at the edge of a section to
 * transition into the next background color without a straight line.
 */
export function WaveDivider({ fill = '#F9E4D4', flip = false, className = '' }: WaveDividerProps) {
  return (
    <div
      className={`w-full overflow-hidden leading-none ${flip ? 'rotate-180' : ''} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="block w-full h-[60px] sm:h-[90px] lg:h-[120px]"
      >
        <path
          d="M0,64 C240,112 480,16 720,48 C960,80 1200,112 1440,64 L1440,120 L0,120 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
