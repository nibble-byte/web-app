import { render, screen } from '@testing-library/react'
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
})
