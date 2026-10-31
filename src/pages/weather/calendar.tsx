import { useEffect, useLayoutEffect, useRef } from "react";
import { Box, Button } from "@mui/material";
import moment, { Moment } from "moment";
import styles from './calendar.module.css';
import { DailyForecast } from './parseForecast';

interface CalendarProps {
  dailyForecasts: DailyForecast[];
  selectedForecastIndex: number | null;
  setSelectedForecastIndex: (index: number) => void;
  // 'grid' is the full month view; 'strip' is a single horizontally scrollable row of forecast days.
  layout?: 'grid' | 'strip';
  // Strip only: called when the user scrolls to the first day so earlier days can be loaded.
  onReachStart?: () => void;
}

// Distance from the left edge (px) that counts as having reached the start of the strip.
const STRIP_EDGE_THRESHOLD = 40;

export const Calendar: React.FC<CalendarProps> = ({
  dailyForecasts,
  selectedForecastIndex,
  setSelectedForecastIndex,
  layout = 'grid',
  onReachStart,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);

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

  // Use the first and last forecast dates to determine the calendar range
  const firstForecastDate = moment(dailyForecasts[0].time);
  const lastForecastDate = moment(dailyForecasts[dailyForecasts.length - 1].time);

  // Find the Sunday before (or on) the first forecast date
  const calendarStartDate = moment(firstForecastDate).startOf("week");
  // Find the Saturday after (or on) the last forecast date
  const calendarEndDate = moment(lastForecastDate).endOf("week");

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
              const highLabel = high === null ? 'high temperature unavailable' : `high ${Math.round(high)} degrees`;
              const rainLabel = rainPercent === null ? 'chance of rain unavailable' : `${rainPercent}% chance of rain`;

              return (
                <Button
                  key={formattedDate}
                  variant="outlined"
                  className={`${styles.dayButton} ${isSelected ? styles.selectedDay : ''} ${isToday ? styles.today : ''}`}
                  onClick={() => {
                    if (isAvailable && forecastIdx >= 0) {
                      setSelectedForecastIndex(forecastIdx);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${cellDate.format('dddd, MMMM D')}${forecast ? `, ${highLabel}, ${rainLabel}` : ', no forecast available'}`}
                  disabled={!isAvailable}
                >
                  <Box className={styles.dateBox}>
                    <span style={{ fontWeight: isToday ? "bold" : "normal" }}>{displayText}</span>
                  </Box>
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
      <Box className={styles.strip} ref={stripRef} onScroll={handleStripScroll} role="group" aria-label="Select a day">
        {dailyForecasts.map((f) => renderDay(moment(f.time)))}
      </Box>
    );
  }

  return (
    <Box className={styles.calendar}>
      {/* Month and Year Header */}
      <Box className={styles.monthHeading}>
        {firstForecastDate.format("MMMM YYYY")}
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

      {/* Calendar Grid: Only render weeks with at least one available date */}
      {weeks.map((week, weekIdx) => {
        const weekHasData = week.some((cellDate) =>
          availableDates.includes(cellDate.format("YYYY-MM-DD"))
        );
        if (!weekHasData) return null;
        return (
          <Box
            key={weekIdx}
            className={styles.week}
          >
            {week.map((cellDate) => renderDay(cellDate))}
          </Box>
        );
      })}
    </Box>
  );
};

export default Calendar;
