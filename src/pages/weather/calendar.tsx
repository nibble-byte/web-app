import { Box, Button } from "@mui/material";
import moment, { Moment } from "moment";
import styles from './calendar.module.css';

interface CalendarProps {
  dailyForecasts: any[];
  selectedForecastIndex: number | null;
  setSelectedForecastIndex: (index: number) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  dailyForecasts,
  selectedForecastIndex,
  setSelectedForecastIndex,
}) => {
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
  const availableDates = dailyForecasts.map((f: any) =>
    moment(f.time).format("YYYY-MM-DD")
  );

  // Group calendarDates into weeks (arrays of 7 days)
  const weeks: Moment[][] = [];
  for (let i = 0; i < calendarDates.length; i += 7) {
    weeks.push(calendarDates.slice(i, i + 7));
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
            {week.map((cellDate, index) => {
              const formattedDate = cellDate.format("YYYY-MM-DD");
              const isAvailable = availableDates.includes(formattedDate);
              const isToday = cellDate.isSame(moment(), "day");
              const isSelected =
                selectedForecastIndex !== null &&
                moment(dailyForecasts[selectedForecastIndex].time).isSame(cellDate, "day");
              const displayText = isToday ? "Today" : cellDate.date().toString();

              // Find rain percentage for this day if available
              const forecastIdx = dailyForecasts.findIndex((f: any) =>
                moment(f.time).isSame(cellDate, "day")
              );
              const rainPercent =
                forecastIdx >= 0
                  ? dailyForecasts[forecastIdx].precipitation_probability_max ?? 0
                  : null;

              return (
                <Button
                  key={index}
                  variant="outlined"
                  className={`${styles.dayButton} ${isSelected ? styles.selectedDay : ''} ${isToday ? styles.today : ''}`}
                  onClick={() => {
                    if (isAvailable && forecastIdx >= 0) {
                      setSelectedForecastIndex(forecastIdx);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${cellDate.format('dddd, MMMM D')}${isAvailable ? `, high ${Math.round(dailyForecasts[forecastIdx].temperature_2m_max)} degrees, ${rainPercent}% chance of rain` : ', no forecast available'}`}
                  disabled={!isAvailable}
                >
                  <Box className={styles.dateBox}>
                    <span style={{ fontWeight: isToday ? "bold" : "normal" }}>{displayText}</span>
                  </Box>
                  {forecastIdx >= 0 && (
                    <Box
                      className={styles.tempBox}
                    >
                      <span style={{ fontSize: 8, display: "flex", alignItems: "center" }}>
                        <span role="img" aria-label="thermometer" style={{ fontSize: 14, marginRight: 3 }}>🌡️</span>
                        {Math.round(dailyForecasts[forecastIdx].temperature_2m_max)}°F
                      </span>
                    </Box>
                  )}
                  {rainPercent !== null && (
                    <Box
                      className={styles.rainBox}
                    >
                      <span role="img" aria-label="rain" style={{ fontSize: 13, marginRight: 2 }}>🌧️</span>
                      {rainPercent}%
                    </Box>
                  )}
                </Button>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
};

export default Calendar;
