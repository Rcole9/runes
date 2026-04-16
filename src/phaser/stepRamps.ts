import Phaser from "phaser";

type StepRampSpec = {
  x: number;          // left edge x
  y: number;          // bottom (ground) surface y
  steps: number;      // how many steps
  stepW: number;      // width of each step in px
  stepH: number;      // height gained per step in px
  thickness?: number; // collision thickness for each step (default 16)
};

/**
 * Creates a "slope" out of a staircase of static rectangles.
 * Works with Arcade physics and feels like a ramp if stepH is small (4-8px).
 */
export function addStepRamp(
  scene: Phaser.Scene,
  solids: Phaser.Physics.Arcade.StaticGroup,
  spec: StepRampSpec,
  texture = "ground"
) {
  const t = spec.thickness ?? 16;

  for (let i = 0; i < spec.steps; i++) {
    const stepTopY = spec.y - (i + 1) * spec.stepH;
    const stepCenterX = spec.x + i * spec.stepW + spec.stepW / 2;
    const stepCenterY = stepTopY + t / 2;

    const step = solids.create(stepCenterX, stepCenterY, texture) as Phaser.Physics.Arcade.Image;
    step.setDisplaySize(spec.stepW, t).refreshBody();
    step.setAlpha(0); // collision only; use your platform visual kit separately if desired
  }
}
