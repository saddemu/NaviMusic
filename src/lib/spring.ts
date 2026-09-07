/**
 * A small spring animator, plus the two bits of gesture physics that go with
 * it (momentum projection and rubber-banding).
 *
 * Everything the user can grab — the drawers, the fullscreen player, the
 * momentum glide on the horizontal rows — animates through this instead of a
 * CSS transition. A transition cannot be interrupted cleanly: it interpolates
 * from a fixed start to a fixed end over a fixed duration, so grabbing it
 * mid-flight means restarting from the *logical* value and the element visibly
 * jumps. A spring integrates from wherever it currently is at whatever
 * velocity it currently has, so re-targeting mid-motion is continuous by
 * construction and a reversal never hits a velocity "brick wall".
 *
 * Parameters follow Apple's `UISpringTimingParameters` rather than the physics
 * triplet: `damping` is the damping ratio (1 = critically damped, no
 * overshoot; below 1 bounces) and `response` is roughly the time in seconds
 * the value takes to reach the target. Neither is a duration — a spring
 * doesn't have one; its settle time emerges from the parameters.
 */

export interface SpringConfig {
  damping: number;
  response: number;
}

/**
 * House styles. Overshoot is reserved for motion the user's own gesture put
 * momentum into — a menu that merely appeared should not bounce.
 */
export const SPRING = {
  /** Default for anything the user did not throw. */
  smooth: { damping: 1, response: 0.35 },
  /** Drawers and sheets. Apple ships 0.8 / 0.3 for exactly this. */
  sheet: { damping: 0.8, response: 0.3 },
  /** Landing after a flick — a little bounce, because a flick preceded it. */
  flick: { damping: 0.82, response: 0.4 },
} as const satisfies Record<string, SpringConfig>;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface ToOptions {
  /** Initial velocity in units/second — hand the gesture's release velocity here. */
  velocity?: number;
  config?: SpringConfig;
  onRest?: () => void;
}

const MAX_FRAME = 1 / 15; // s — clamp so a backgrounded tab doesn't explode
const SUB_STEP = 1 / 240; // s — fixed integration step keeps stiff springs stable

export class Spring {
  value: number;
  velocity = 0;

  private target: number;
  private config: SpringConfig;
  private raf = 0;
  private last = 0;
  private onRest?: () => void;
  private readonly onFrame: (value: number) => void;
  private readonly restDelta: number;
  private readonly restSpeed: number;

  constructor(
    initial: number,
    onFrame: (value: number) => void,
    config: SpringConfig = SPRING.smooth,
    rest: { delta?: number; speed?: number } = {},
  ) {
    this.value = initial;
    this.target = initial;
    this.onFrame = onFrame;
    this.config = config;
    this.restDelta = rest.delta ?? 0.01;
    this.restSpeed = rest.speed ?? 0.05;
  }

  get isAnimating(): boolean {
    return this.raf !== 0;
  }

  /** Jump to a value with no motion — used for first paint and for resets. */
  set(value: number): void {
    this.stop();
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.onFrame(value);
  }

  /**
   * Re-target. Starts from the current presentation value and the current
   * velocity, so calling this on a moving spring redirects it rather than
   * restarting it.
   */
  to(target: number, opts: ToOptions = {}): void {
    this.target = target;
    if (opts.config) this.config = opts.config;
    if (opts.velocity !== undefined) this.velocity = opts.velocity;
    this.onRest = opts.onRest;

    if (prefersReducedMotion()) {
      this.stop();
      this.value = target;
      this.velocity = 0;
      this.onFrame(target);
      this.onRest?.();
      this.onRest = undefined;
      return;
    }
    if (this.raf === 0) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.step);
    }
  }

  stop(): void {
    if (this.raf !== 0) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.onRest = undefined;
  }

  private readonly step = (now: number): void => {
    const frame = Math.min((now - this.last) / 1000, MAX_FRAME);
    this.last = now;

    const omega = (2 * Math.PI) / this.config.response;
    const zeta = this.config.damping;

    let remaining = frame;
    while (remaining > 0) {
      const dt = Math.min(remaining, SUB_STEP);
      remaining -= dt;
      const displacement = this.value - this.target;
      const accel = -omega * omega * displacement - 2 * zeta * omega * this.velocity;
      this.velocity += accel * dt;
      this.value += this.velocity * dt;
    }

    if (
      Math.abs(this.value - this.target) < this.restDelta &&
      Math.abs(this.velocity) < this.restSpeed
    ) {
      this.value = this.target;
      this.velocity = 0;
      this.raf = 0;
      this.onFrame(this.value);
      const rest = this.onRest;
      this.onRest = undefined;
      rest?.();
      return;
    }

    this.onFrame(this.value);
    this.raf = requestAnimationFrame(this.step);
  };
}

/**
 * Where a flick would come to rest, from Apple's *Designing Fluid Interfaces*
 * sample code. Note this is the exponential-decay form scroll views actually
 * use — not the textbook `v² / 2a`, which lands somewhere else entirely.
 *
 * @param velocity px/second at release
 * @param decelerationRate 0.998 for normal scroll feel, 0.99 for snappier
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. A hard stop reads as "frozen"; this
 * reads as "responsive, but there is nothing more here".
 *
 * @param overshoot how far past the bound the pointer has travelled
 * @param dimension the size of the surface being dragged
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
