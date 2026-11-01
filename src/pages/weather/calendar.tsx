import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import moment, { Moment } from "moment";
import styles from './calendar.module.css';
import { DailyForecast } from './parseForecast';
import { weatherCodeIcons } from './weatherCodeMapping';

interface CalendarProps {
  dailyForecasts: DailyForecast[];
  selectedForecastIndex: number | null;
  setSelectedForecastIndex: (index: number) => void;
  // 'grid' is the full month view; 'strip' is a single horizontally scrollable row of forecast days.
  layout?: 'grid' | 'strip';
  // Strip only: called when the user scrolls to the first day so earlier days can be loaded.
  onReachStart?: () => void;
  // Grid only: called with a YYYY-MM month when the user moves to it, so its whole month can be loaded.
  onLoadMonth?: (month: string) => void;
}

// Distance from the left edge (px) that counts as having reached the start of the strip.
const STRIP_EDGE_THRESHOLD = 40;

export const Calendar: React.FC<CalendarProps> = ({
  dailyForecasts,
  selectedForecastIndex,
  setSelectedForecastIndex,
  layout = 'grid',
  onReachStart,
  onLoadMonth,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const mobile = useMediaQuery('(max-width:680px)');
  const profile = mobile ? styles.mobile : '';

  // Months (YYYY-MM) that contain forecast days, in order. Only one is shown at a time when there are several.
  const months = Array.from(new Set(dailyForecasts.map((f) => f.time.slice(0, 7))));
  const selectedMonth =
    selectedForecastIndex === null ? null : dailyForecasts[selectedForecastIndex]?.time.slice(0, 7) ?? null;
  const [viewedMonth, setViewedMonth] = useState<string | null>(selectedMonth);

  // The month follows the selected day, e.g. when it is picked in the strip or the data is reloaded.
  const [followedMonth, setFollowedMonth] = useState(selectedMonth);
  if (selectedMonth !== followedMonth) {
    setFollowedMonth(selectedMonth);
    if (selectedMonth) setViewedMonth(selectedMonth);
  }

  const todayMonth = moment().format('YYYY-MM');
  const shownMonth = viewedMonth ?? (months.includes(todayMonth) ? todayMonth : months[0]);
  const previousMonth = moment(shownMonth + '-01').subtract(1, 'month').format('YYYY-MM');
  const nextMonth = moment(shownMonth + '-01').add(1, 'month').format('YYYY-MM');
  // Several months of data, or a loader for earlier months, switches the grid to one month at a time.
  const monthView = months.length > 1 || !!onLoadMonth;
  const canGoPrevious = !!onLoadMonth || months.includes(previousMonth);
  const canGoNext = months.includes(nextMonth);

  // Moves the grid to a month and asks for the whole month if it is not loaded yet.
  const goToMonth = (month: string) => {
    setViewedMonth(month);
    onLoadMonth?.(month);
  };

  // Left-edge scroll width and first date before an update, so prepended days do not shift what the user is looking at.
  const stripSnapshot = useRef<{ width: number; firstTime: string } | null>(null);
  const firstTime = dailyForecasts[0]?.time;

  // After earlier days are prepended, move the scroll position by the width they added.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    const snapshot = stripSnapshot.current;
    if (strip && snapshot && snapshot.firstTime !== firstTime) {
      strip.scrollLeft += strip.scrollWidth - snapshot.width;
    }
    stripSnapshot.current = null;
  }, [firstTime]);

  // Asks for earlier days when the strip is scrolled close to its left edge.
  const handleStripScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const strip = event.currentTarget;
    if (onReachStart && strip.scrollLeft <= STRIP_EDGE_THRESHOLD) {
      stripSnapshot.current = { width: strip.scrollWidth, firstTime };
      onReachStart();
    }
  };

  // Keep the selected day visible when the strip is scrolled.
  useEffect(() => {
    if (layout !== 'strip') return;
    const selected = stripRef.current?.querySelector('[aria-pressed="true"]');
    selected?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [layout, selectedForecastIndex]);

  // Month view: five weeks (six if the month needs them) holding every day of the month. The
  // leading cells are filled with the previous month. Otherwise the range covers the whole forecast.
  const monthStart = moment(shownMonth + '-01');
  const monthEnd = moment(monthStart).endOf('month');
  const monthEndOfWeek = moment(monthEnd).endOf('week');
  const monthWeeks = Math.max(5, (monthEndOfWeek.diff(moment(monthStart).startOf('week'), 'days') + 1) / 7);
  const calendarStartDate = monthView
    ? moment(monthEndOfWeek).subtract(monthWeeks, 'weeks').add(1, 'day').startOf('day')
    : moment(dailyForecasts[0].time).startOf('week');
  const calendarEndDate = monthView
    ? monthEndOfWeek
    : moment(dailyForecasts[dailyForecasts.length - 1].time).endOf('week');

  // Total number of days to display in the grid.
  const totalCells = calendarEndDate.diff(calendarStartDate, "days") + 1;

  const calendarDates: Moment[] = Array.from({ length: totalCells }, (_, i) =>
    moment(calendarStartDate).add(i, "days")
  );

  // Create an array of available forecast dates (formatted as YYYY-MM-DD).
  const availableDates = dailyForecasts.map((f) =>
    moment(f.time).format("YYYY-MM-DD")
  );

  // Group calendarDates into weeks (arrays of 7 days)
  const weeks: Moment[][] = [];
  for (let i = 0; i < calendarDates.length; i += 7) {
    weeks.push(calendarDates.slice(i, i + 7));
  }

  // Renders one day button; used by both the month grid and the scrollable strip.
  const renderDay = (cellDate: Moment) => {
              const formattedDate = cellDate.format("YYYY-MM-DD");
              const isAvailable = availableDates.includes(formattedDate);
              const isToday = cellDate.isSame(moment(), "day");
              const isSelected =
                selectedForecastIndex !== null &&
                moment(dailyForecasts[selectedForecastIndex]?.time).isSame(cellDate, "day");
              const displayText = isToday ? "Today" : cellDate.date().toString();

              const forecastIdx = dailyForecasts.findIndex((f) =>
                moment(f.time).isSame(cellDate, "day")
              );
              const forecast = forecastIdx >= 0 ? dailyForecasts[forecastIdx] : null;
              const high = forecast?.temperature_2m_max ?? null;
              const rainPercent = forecast?.precipitation_probability_max ?? null;
              // Cells of earlier months without data are clickable: they load that whole month.
              const loadable = !forecast && !!onLoadMonth && monthView && formattedDate < shownMonth + '-01';
              const highLabel = high === null ? 'high temperature unavailable' : `high ${Math.round(high)} degrees`;
              const rainLabel = rainPercent === null ? 'chance of rain unavailable' : `${rainPercent}% chance of rain`;

              return (
                <Button
                  key={formattedDate}
                  variant="outlined"
                  className={`${styles.dayButton} ${isSelected ? styles.selectedDay : ''} ${isToday ? styles.today : ''}`}
                  onClick={() => {
                    if (monthView && cellDate.format('YYYY-MM') !== shownMonth) goToMonth(cellDate.format('YYYY-MM'));
                    if (isAvailable && forecastIdx >= 0) {
                      setSelectedForecastIndex(forecastIdx);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${cellDate.format('dddd, MMMM D')}${forecast ? `, ${highLabel}, ${rainLabel}` : loadable ? ', load forecast' : ', no forecast available'}`}
                  disabled={!isAvailable && !loadable}
                >
                  <Box className={styles.dateBox}>
                    <span style={{ fontWeight: isToday ? "bold" : "normal" }}>{displayText}</span>
                  </Box>
                  {forecast && (
                    <i
                      className={`wi ${(forecast.weathercode !== null && weatherCodeIcons[forecast.weathercode]) || 'wi-na'} ${styles.weatherIcon}`}
                      aria-hidden="true"
                    ></i>
                  )}
                  {forecast && (
                    <Box
                      className={styles.tempBox}
                    >
                      <span style={{ fontSize: 8, display: "flex", alignItems: "center" }}>
                        <span role="img" aria-label="thermometer" style={{ fontSize: 14, marginRight: 3 }}>🌡️</span>
                        {high === null ? '—' : `${Math.round(high)}°F`}
                      </span>
                    </Box>
                  )}
                  {forecast && (
                    <Box
                      className={styles.rainBox}
                    >
                      <span role="img" aria-label="rain" style={{ fontSize: 13, marginRight: 2 }}>🌧️</span>
                      {rainPercent === null ? '—' : `${rainPercent}%`}
                    </Box>
                  )}
                </Button>
              );
  };

  if (layout === 'strip') {
    return (
      <Box className={`${styles.strip} ${profile}`} ref={stripRef} onScroll={handleStripScroll} role="group" aria-label="Select a day">
        {dailyForecasts.map((f) => renderDay(moment(f.time)))}
      </Box>
    );
  }

  return (
    <Box className={`${styles.calendar} ${profile}`}>
      {/* Month and Year Header */}
      <Box className={styles.monthHeading}>
        {monthView && (
          <Button
            size="small"
            className={styles.monthButton}
            onClick={() => goToMonth(previousMonth)}
            disabled={!canGoPrevious}
            aria-label="Previous month"
          >
            ‹
          </Button>
        )}
        <span aria-live="polite">{moment(shownMonth + '-01').format("MMMM YYYY")}</span>
        {monthView && (
          <Button
            size="small"
            className={styles.monthButton}
            onClick={() => goToMonth(nextMonth)}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            ›
          </Button>
        )}
      </Box>

      {/* Weekday Headers */}
      <Box
        className={styles.weekdays}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <Box key={dayName}>
            {dayName}
          </Box>
        ))}
      </Box>

      {/* Calendar Grid: the month view shows every week; otherwise only weeks with an available date */}
      {weeks.map((week, weekIdx) => {
        const weekHasData = monthView || week.some((cellDate) =>
          availableDates.includes(cellDate.format("YYYY-MM-DD"))
        );
        if (!weekHasData) return null;
        return (
          <Box
            key={weekIdx}
            className={styles.week}
          >
            {week.map((cellDate) =>
              monthView && cellDate.isAfter(monthEnd) ? (
                <Box key={cellDate.format("YYYY-MM-DD")} aria-hidden="true" />
              ) : (
                renderDay(cellDate)
              )
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default Calendar;
