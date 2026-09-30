import React, { memo, useMemo, useState } from 'react'
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { Stage, Layer, Rect, Circle, Line, Group } from 'react-konva'
import styles from './fractal.module.css'

export type FractalShape = 'square' | 'circle' | 'rectangle' | 'triangle'

const STAGE_WIDTH = 720
const STAGE_HEIGHT = 520
const BASE_SIZE = 140
const CHILD_SCALE = 0.42
const CHILD_DISTANCE_FACTOR = 0.62

const trianglePoints = (cx: number, cy: number, size: number): number[] => {
  const r = size * 0.55
  const pts: number[] = []
  for (let i = 0; i < 3; i++) {
    const a = (2 * Math.PI * i) / 3 - Math.PI / 2
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  return pts
}

interface FractalNodeProps {
  x: number
  y: number
  size: number
  depth: number
  vertices: number
  shape: FractalShape
}

const FractalNode = memo(function FractalNode({ x, y, size, depth, vertices, shape }: FractalNodeProps) {
  if (depth <= 0) return null

  const half = size / 2
  const rectW = size * 1.25
  const rectH = size * 0.65

  const shapeEl = (() => {
    switch (shape) {
      case 'circle':
        return <Circle x={x} y={y} radius={half} stroke="#90caf9" strokeWidth={1.5} fill="rgba(100, 181, 246, 0.25)" />
      case 'rectangle':
        return (
          <Rect
            x={x - rectW / 2}
            y={y - rectH / 2}
            width={rectW}
            height={rectH}
            stroke="#81c784"
            strokeWidth={1.5}
            fill="rgba(129, 199, 132, 0.22)"
            cornerRadius={2}
          />
        )
      case 'triangle':
        return (
          <Line
            points={trianglePoints(x, y, size)}
            closed
            stroke="#ffb74d"
            strokeWidth={1.5}
            fill="rgba(255, 183, 77, 0.22)"
          />
        )
      case 'square':
      default:
        return (
          <Rect
            x={x - half}
            y={y - half}
            width={size}
            height={size}
            stroke="#ba68c8"
            strokeWidth={1.5}
            fill="rgba(186, 104, 200, 0.22)"
          />
        )
    }
  })()

  if (depth <= 1) {
    return <>{shapeEl}</>
  }

  const childSize = size * CHILD_SCALE
  const dist = size * CHILD_DISTANCE_FACTOR

  return (
    <>
      {Array.from({ length: vertices }, (_, i) => {
        const angle = (2 * Math.PI * i) / vertices - Math.PI / 2
        const cx = x + Math.cos(angle) * dist
        const cy = y + Math.sin(angle) * dist
        return (
          <React.Fragment key={`${i}-${depth}`}>
            <FractalNode
              x={cx}
              y={cy}
              size={childSize}
              depth={depth - 1}
              vertices={vertices}
              shape={shape}
            />
          </React.Fragment>
        )
      })}
      {shapeEl}
    </>
  )
})

const Fractal = () => {
  const [vertices, setVertices] = useState(6)
  const [depth, setDepth] = useState(4)
  const [shape, setShape] = useState<FractalShape>('square')

  const center = useMemo(() => ({ x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 }), [])

  const fractalTree = useMemo(
    () => (
      <FractalNode
        x={center.x}
        y={center.y}
        size={BASE_SIZE}
        depth={depth}
        vertices={vertices}
        shape={shape}
      />
    ),
    [center.x, center.y, depth, vertices, shape]
  )

  const handleShapeChange = (e: SelectChangeEvent<FractalShape>) => {
    setShape(e.target.value as FractalShape)
  }

  return (
    <Stack className={styles.fractalPage} spacing={3}>
      <Box className={styles.intro}>
        <Typography className={styles.eyebrow}>Pattern laboratory / 04</Typography>
        <Typography className={styles.title} variant="h1">Recursive bloom</Typography>
        <Typography className={styles.description} variant="body1">
          Tune a simple rule set and watch it unfold into a living geometric system.
        </Typography>
      </Box>

      <Box className={styles.workspace}>
        <Box className={styles.controls} component="section" aria-label="Fractal controls">
          <Box className={styles.controlHeading}>
            <Typography variant="h6">Construction rules</Typography>
            <Typography variant="caption">Adjust the grammar of the bloom</Typography>
          </Box>
          <Stack spacing={2.5}>
            <Box>
              <Box className={styles.labelRow}>
                <Typography variant="body2">Directions</Typography>
                <Typography className={styles.value} variant="body2">{vertices}</Typography>
              </Box>
              <Slider
                value={vertices}
                onChange={(_e: unknown, v: number | number[]) =>
                  setVertices(Array.isArray(v) ? v[0] : v)
                }
                min={3}
                max={6}
                step={1}
                marks
                valueLabelDisplay="auto"
                aria-label="Number of directions"
              />
            </Box>
            <Box>
              <Box className={styles.labelRow}>
                <Typography variant="body2">Recursion depth</Typography>
                <Typography className={styles.value} variant="body2">{depth}</Typography>
              </Box>
              <Slider
                value={depth}
                onChange={(_e: unknown, v: number | number[]) =>
                  setDepth(Array.isArray(v) ? v[0] : v)
                }
                min={1}
                max={6}
                step={1}
                marks
                valueLabelDisplay="auto"
                aria-label="Recursion depth"
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel id="fractal-shape-label">Base form</InputLabel>
              <Select<FractalShape>
                labelId="fractal-shape-label"
                label="Base form"
                value={shape}
                onChange={handleShapeChange}
              >
                <MenuItem value="square">Square</MenuItem>
                <MenuItem value="circle">Circle</MenuItem>
                <MenuItem value="rectangle">Rectangle</MenuItem>
                <MenuItem value="triangle">Triangle</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Box className={styles.readout}>
            <Typography variant="overline">Current specimen</Typography>
            <Typography variant="body2">{shape} / {vertices} point orbit / level {depth}</Typography>
          </Box>
        </Box>

        <Box className={styles.canvasColumn} component="section" aria-label="Fractal preview">
          <Box className={styles.canvasHeader}>
            <Typography variant="body2">Live render</Typography>
            <Typography variant="caption">720 × 520 px</Typography>
          </Box>
          <Box className={styles.canvasFrame}>
            <Box className={styles.canvasGlow} />
            <Stage width={STAGE_WIDTH} height={STAGE_HEIGHT}>
              <Layer>
                <Group>{fractalTree}</Group>
              </Layer>
            </Stage>
          </Box>
        </Box>
      </Box>
    </Stack>
  )
}

export default Fractal
