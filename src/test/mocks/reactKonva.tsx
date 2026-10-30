import { ReactNode } from 'react'

// jsdom has no canvas, so Konva's node build cannot load; render plain elements instead.
const Passthrough =
  (name: string) =>
  ({ children }: { children?: ReactNode }) => (
    <div data-konva={name}>{children}</div>
  )

export const Stage = Passthrough('Stage')
export const Layer = Passthrough('Layer')
export const Group = Passthrough('Group')
export const Rect = Passthrough('Rect')
export const Circle = Passthrough('Circle')
export const Line = Passthrough('Line')
