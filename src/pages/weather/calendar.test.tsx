import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Calendar from './calendar'
import { DailyForecast } from './parseForecast'

const day = (
  index: number,
  overrides: Partial<DailyForecast> = {}
): DailyForecast => ({
  index,
  time: `2026-03-${String(10 + index).padStart(2, '0')}`,
  temperature_2m_max: 60 + index,
  temperature_2m_min: 40,
  weathercode: 1,
  precipitation_probability_max: 20,
  windspeed_10m_max: 10,
  sunrise: null,
  sunset: null,
  ...overrides,
})

const renderCalendar = (
  forecasts: DailyForecast[],
  selected: number | null = null
) => {
  const select = vi.fn()
  render(
    <Calendar
      dailyForecasts={forecasts}
      selectedForecastIndex={selected}
      setSelectedForecastIndex={select}
    />
  )
  return select
}

describe('Calendar', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('describes complete days with their high and rain chance', () => {
    renderCalendar([day(0)])
    expect(
      screen.getByRole('button', {
        name: 'Tuesday, March 10, high 60 degrees, 20% chance of rain',
      })
    ).toBeEnabled()
  })

  it('shows placeholders for missing high and rain values, never 0%', () => {
    renderCalendar([
      day(0, { temperature_2m_max: null, precipitation_probability_max: null }),
    ])
    const button = screen.getByRole('button', {
      name: 'Tuesday, March 10, high temperature unavailable, chance of rain unavailable',
    })
    expect(button).toHaveTextContent('—')
    expect(button).not.toHaveTextContent('0%')
    expect(button).not.toHaveTextContent(/NaN|undefined|null/)
  })

  it('keeps partially populated days selectable', async () => {
    const user = userEvent.setup()
    const select = renderCalendar([
      day(0, { temperature_2m_max: null }),
      day(1, { precipitation_probability_max: null }),
    ])

    await user.click(screen.getByRole('button', { name: /Tuesday, March 10/ }))
    await user.click(
      screen.getByRole('button', { name: /Wednesday, March 11/ })
    )

    expect(select).toHaveBeenNthCalledWith(1, 0)
    expect(select).toHaveBeenNthCalledWith(2, 1)
  })

  it('disables days without a forecast', () => {
    renderCalendar([day(0), day(2)])

    const missing = screen.getByRole('button', {
      name: 'Wednesday, March 11, no forecast available',
    })
    expect(missing).toBeDisabled()
  })

  it('marks the selected day as pressed', () => {
    renderCalendar([day(0), day(1)], 1)
    expect(
      screen.getByRole('button', { name: /Wednesday, March 11/ })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: /Tuesday, March 10/ })
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('tolerates a selected index that is out of range', () => {
    renderCalendar([day(0)], 5)
    expect(
      screen.getByRole('button', { name: /Tuesday, March 10/ })
    ).toHaveAttribute('aria-pressed', 'false')
  })

  describe('strip layout', () => {
    it('renders only forecast days in one group, without the month grid', () => {
      render(
        <Calendar
          layout="strip"
          dailyForecasts={[day(0), day(2), day(9)]}
          selectedForecastIndex={2}
          setSelectedForecastIndex={vi.fn()}
        />
      )
      const strip = screen.getByRole('group', { name: 'Select a day' })
      expect(within(strip).getAllByRole('button')).toHaveLength(3)
      expect(screen.queryByText('Sun')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Thursday, March 19/ })
      ).toHaveAttribute('aria-pressed', 'true')
    })

    it('selects a day when clicked', async () => {
      const user = userEvent.setup()
      const select = vi.fn()
      render(
        <Calendar
          layout="strip"
          dailyForecasts={[day(0), day(1)]}
          selectedForecastIndex={0}
          setSelectedForecastIndex={select}
        />
      )
      await user.click(screen.getByRole('button', { name: /March 11/ }))
      expect(select).toHaveBeenCalledWith(1)
    })

    describe('reaching the start', () => {
      const scrollStripTo = (strip: HTMLElement, scrollLeft: number) => {
        Object.defineProperty(strip, 'scrollLeft', {
          value: scrollLeft,
          configurable: true,
          writable: true,
        })
        fireEvent.scroll(strip)
      }

      const renderStrip = (onReachStart?: () => void) => {
        render(
          <Calendar
            layout="strip"
            dailyForecasts={[day(0), day(1), day(2)]}
            selectedForecastIndex={1}
            setSelectedForecastIndex={vi.fn()}
            onReachStart={onReachStart}
          />
        )
        return screen.getByRole('group', { name: 'Select a day' })
      }

      it('asks for earlier days when scrolled to the left edge', () => {
        const onReachStart = vi.fn()
        scrollStripTo(renderStrip(onReachStart), 0)
        expect(onReachStart).toHaveBeenCalled()
      })

      it('does not ask while scrolled away from the edge', () => {
        const onReachStart = vi.fn()
        scrollStripTo(renderStrip(onReachStart), 400)
        expect(onReachStart).not.toHaveBeenCalled()
      })

      it('ignores scrolling when no handler is provided', () => {
        expect(() => scrollStripTo(renderStrip(), 0)).not.toThrow()
      })
    })
  })
})
