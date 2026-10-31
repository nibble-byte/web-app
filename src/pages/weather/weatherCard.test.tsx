import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeatherCard from './weatherCard'
import { DailyForecast, HourlyForecast } from './parseForecast'
import { renderWithProviders } from '../../test/renderWithProviders'

const forecast = (overrides: Partial<DailyForecast> = {}): DailyForecast => ({
  index: 0,
  time: '2026-03-10',
  temperature_2m_max: 61.4,
  temperature_2m_min: 40.2,
  weathercode: 1,
  precipitation_probability_max: 20,
  windspeed_10m_max: 12.6,
  sunrise: '2026-03-10T06:30',
  sunset: '2026-03-10T18:45',
  ...overrides,
})

const noHourly: HourlyForecast = { time: [], temperature_2m: [] }

const hourlyFor = (date: string): HourlyForecast => ({
  time: ['00', '01', '02'].map((hour) => `${date}T${hour}:00`),
  temperature_2m: [50, 51, 52],
})

const onClose = vi.fn()

const renderCard = (daily: DailyForecast, hourly: HourlyForecast = noHourly) =>
  renderWithProviders(
    <WeatherCard forecastData={daily} hourlyData={hourly} onClose={onClose} />
  )

const metric = (label: string) => screen.getByText(label).parentElement!

describe('WeatherCard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders every available measurement', () => {
    renderCard(forecast())

    expect(screen.getByText(/Tuesday, March 10, 2026/)).toBeInTheDocument()
    expect(screen.getByText('61°')).toBeInTheDocument()
    expect(screen.getByText(/H 61°/)).toBeInTheDocument()
    expect(screen.getByText(/L 40°/)).toBeInTheDocument()
    expect(metric('WIND')).toHaveTextContent('13 km/h')
    expect(metric('RAIN CHANCE')).toHaveTextContent('20%')
    expect(metric('SUNRISE')).toHaveTextContent('6:30 AM')
    expect(metric('SUNSET')).toHaveTextContent('6:45 PM')
    expect(screen.queryByLabelText('Unavailable')).not.toBeInTheDocument()
  })

  it('shows placeholders instead of zeros or invalid values for missing measurements', () => {
    const { container } = renderCard(
      forecast({
        temperature_2m_max: null,
        temperature_2m_min: null,
        weathercode: null,
        precipitation_probability_max: null,
        windspeed_10m_max: null,
        sunrise: null,
        sunset: null,
      })
    )

    expect(
      screen.getAllByLabelText('Unavailable').length
    ).toBeGreaterThanOrEqual(7)
    expect(metric('RAIN CHANCE')).not.toHaveTextContent('0%')
    expect(metric('WIND')).not.toHaveTextContent('km/h')
    expect(container).not.toHaveTextContent(/NaN|undefined|null|Invalid date/)
    expect(container.querySelector('i.wi-na')).toBeInTheDocument()
  })

  it('shows high and low temperatures independently', () => {
    renderCard(forecast({ temperature_2m_min: null }))
    expect(screen.getByText(/H 61°/)).toBeInTheDocument()
    expect(screen.getByText(/^H 61°/)).toHaveTextContent(/L\s*—/)
  })

  it('keeps a real 0% rain chance', () => {
    renderCard(forecast({ precipitation_probability_max: 0 }))
    expect(metric('RAIN CHANCE')).toHaveTextContent('0%')
  })

  it('labels the daily high and does not call it the current temperature on other days', () => {
    renderCard(forecast())
    expect(screen.getByText('DAILY HIGH')).toBeInTheDocument()
    expect(screen.queryByText('NOW')).not.toBeInTheDocument()
  })

  describe('today', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 2, 10, 1, 20))
    })

    it('shows the current hourly reading as the current temperature', () => {
      renderCard(forecast(), hourlyFor('2026-03-10'))
      expect(screen.getByText('NOW')).toBeInTheDocument()
      expect(screen.getByText('51°')).toBeInTheDocument()
      expect(screen.getByText(/H 61°/)).toBeInTheDocument()
    })

    it('falls back to a labelled daily high when no hourly reading covers now', () => {
      renderCard(forecast(), noHourly)
      expect(screen.getByText('DAILY HIGH')).toBeInTheDocument()
      expect(screen.queryByText('NOW')).not.toBeInTheDocument()
      expect(screen.getByText('61°')).toBeInTheDocument()
    })

    it('never shows a missing high as the current temperature', () => {
      renderCard(forecast({ temperature_2m_max: null }), noHourly)
      expect(screen.getByText('DAILY HIGH')).toBeInTheDocument()
      expect(screen.getAllByLabelText('Unavailable').length).toBeGreaterThan(0)
    })
  })

  it('asks to be closed when the Close button is clicked', async () => {
    const user = userEvent.setup()
    renderCard(forecast(), hourlyFor('2026-03-10'))
    await user.click(
      screen.getByRole('button', { name: 'Close weather details' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  describe('hourly chart', () => {
    it('is shown when valid hourly points exist for the selected day', () => {
      renderCard(forecast(), hourlyFor('2026-03-10'))
      expect(screen.getByText('Hourly temperature')).toBeInTheDocument()
    })

    it('is hidden when there is no hourly data', () => {
      renderCard(forecast(), noHourly)
      expect(screen.queryByText('Hourly temperature')).not.toBeInTheDocument()
    })

    it('is hidden when hourly data only covers other days', () => {
      renderCard(forecast(), hourlyFor('2026-03-11'))
      expect(screen.queryByText('Hourly temperature')).not.toBeInTheDocument()
    })
  })
})
