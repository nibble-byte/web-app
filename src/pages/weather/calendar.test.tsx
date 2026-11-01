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
  selected: number | null = null,
  onLoadMonth?: (month: string) => void
) => {
  const select = vi.fn()
  render(
    <Calendar
      dailyForecasts={forecasts}
      selectedForecastIndex={selected}
      setSelectedForecastIndex={select}
      onLoadMonth={onLoadMonth}
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

  it('shows a weather icon on days with a forecast, with a fallback for unknown codes', () => {
    renderCalendar([day(0, { weathercode: 0 }), day(1, { weathercode: null })])

    const icon = (name: string) =>
      screen
        .getByRole('button', { name: new RegExp(name) })
        .querySelector('i.wi')
    expect(icon('Tuesday, March 10')).toHaveClass('wi-day-sunny')
    expect(icon('Wednesday, March 11')).toHaveClass('wi-na')
  })

  describe('forecasts spanning several months', () => {
    // March 30 - April 2, 2026
    const spanning = [0, 1, 2, 3].map((i) =>
      day(i, {
        time: ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02'][i],
      })
    )

    it('shows the month of the selected day, filled out with the previous month', () => {
      renderCalendar(spanning, 2)
      expect(screen.getByText('April 2026')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /^Thursday, April 2,/ })
      ).toBeInTheDocument()
      // March 29 - 31 only fill the first week.
      expect(
        screen.getByRole('button', { name: /^Tuesday, March 31,/ })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /March 28/ })
      ).not.toBeInTheDocument()
    })

    it('shows five weeks of days even for a short month', () => {
      // February 2026 starts on a Sunday and has exactly four weeks.
      renderCalendar(
        [day(0, { time: '2026-02-10' }), day(1, { time: '2026-03-02' })],
        0
      )
      expect(screen.getByText('February 2026')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /January 25/ })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /February 28/ })
      ).toBeInTheDocument()
    })

    it('loads the whole previous month when moving to it', async () => {
      const user = userEvent.setup()
      const load = vi.fn()
      renderCalendar(spanning, 2, load)
      await user.click(screen.getByRole('button', { name: 'Previous month' }))
      expect(load).toHaveBeenCalledWith('2026-03')
    })

    it('loads the previous month when a previous-month day without data is clicked', async () => {
      const user = userEvent.setup()
      const load = vi.fn()
      renderCalendar(
        [day(0, { time: '2026-04-01' }), day(1, { time: '2026-04-02' })],
        0,
        load
      )
      await user.click(screen.getByRole('button', { name: /March 31/ }))
      expect(load).toHaveBeenCalledWith('2026-03')
      expect(screen.getByText('March 2026')).toBeInTheDocument()
    })

    it('changes month with the previous and next buttons', async () => {
      const user = userEvent.setup()
      renderCalendar(spanning, 2)
      expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Previous month' }))
      expect(screen.getByText('March 2026')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /March 31/ })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /April 2/ })
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Previous month' })
      ).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Next month' }))
      expect(screen.getByText('April 2026')).toBeInTheDocument()
    })

    it('has no month buttons when the data fits in one month', () => {
      renderCalendar([day(0), day(1)])
      expect(
        screen.queryByRole('button', { name: 'Next month' })
      ).not.toBeInTheDocument()
    })
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
