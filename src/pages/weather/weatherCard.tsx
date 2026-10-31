import React, { useLayoutEffect, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import moment from 'moment';
import styles from './weatherCard.module.css';
import { weatherCodeIcons } from './weatherCodeMapping';
import {
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { DailyForecast, HourlyForecast } from './parseForecast';

interface WeatherCardProps {
    forecastData: DailyForecast;
    hourlyData: HourlyForecast;
    onClose: () => void;
    // Day picker rendered at the top of the card.
    dayPicker?: React.ReactNode;
    // Called with a YYYY-MM-DD date when scrolling the hourly chart moves into another day.
    onSelectDate?: (date: string) => void;
}

const HOUR_WIDTH = 44;
const Y_AXIS_WIDTH = 40;
const CHART_HEIGHT = 260;

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    const theme = useTheme();
    if (active && payload && payload.length > 0) {
        return (
            <Box
                sx={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    padding: theme.spacing(1),
                }}
            >
                <Typography variant="caption" sx={{ color: theme.palette.text.primary }}>
                    {`Time: ${moment(label).format('ddd h:mm A')}`}
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                    {`Temperature: ${payload[0].value}°F`}
                </Typography>
            </Box>
        );
    }
    return null;
};

const Unavailable: React.FC = () => <span role="img" aria-label="Unavailable">—</span>;

const degrees = (value: number | null) =>
    value === null ? <Unavailable /> : <>{Math.round(value)}°</>;

const clockTime = (value: string | null) =>
    value === null ? <Unavailable /> : <>{moment(value).format('h:mm')} <small>{moment(value).format('A')}</small></>;

const WeatherCard: React.FC<WeatherCardProps> = ({
    forecastData: {
        time,
        temperature_2m_max,
        temperature_2m_min,
        weathercode,
        precipitation_probability_max,
        windspeed_10m_max,
        sunrise,
        sunset,
    },
    hourlyData,
    onClose,
    dayPicker,
    onSelectDate,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    // Date last chosen by scrolling the chart; the chart must not re-center on it.
    const scrollSelectedDate = useRef<string | null>(null);
    const theme = useTheme();
    const dayName = moment(time).format('dddd');
    const fullDate = moment(time).format('LL');
    const iconClass = (weathercode !== null && weatherCodeIcons[weathercode]) || 'wi-na';
    const selectedDate = moment(time).format('YYYY-MM-DD');
    const today = moment().format('YYYY-MM-DD');
    const isTodaySelected = selectedDate === today;

    // Every loaded hourly point, so the chart can scroll across days.
    const allHourly = hourlyData.time.map((hourTime, index) => ({
        timestamp: hourTime,
        time: moment(hourTime).format('h:mm A'),
        temperature: hourlyData.temperature_2m[index],
    }));
    const hourlyForSelected = allHourly.filter((point) => point.timestamp.slice(0, 10) === selectedDate);
    const chartWidth = Y_AXIS_WIDTH + allHourly.length * HOUR_WIDTH;
    const step = allHourly.length > 1 ? (chartWidth - Y_AXIS_WIDTH - 10) / (allHourly.length - 1) : HOUR_WIDTH;

    // Date of the hourly point in the middle of the visible chart area.
    const dateAtCenter = (el: HTMLDivElement) => {
        const x = el.scrollLeft + el.clientWidth / 2 - Y_AXIS_WIDTH;
        const index = Math.min(allHourly.length - 1, Math.max(0, Math.round(x / step)));
        return allHourly[index]?.timestamp.slice(0, 10);
    };

    // Centers the selected day in the chart when it was chosen elsewhere (or the data shifted).
    const firstHour = allHourly[0]?.timestamp;
    useLayoutEffect(() => {
        const el = scrollRef.current;
        const bySelection = scrollSelectedDate.current === selectedDate;
        scrollSelectedDate.current = null;
        if (bySelection) return;
        if (!el || el.clientWidth === 0 || dateAtCenter(el) === selectedDate) return;
        const noon = allHourly.findIndex((point) => point.timestamp.startsWith(`${selectedDate}T12`));
        const target = noon >= 0 ? noon : allHourly.findIndex((point) => point.timestamp.startsWith(selectedDate));
        if (target >= 0) el.scrollLeft = Y_AXIS_WIDTH + target * step - el.clientWidth / 2;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, firstHour, hourlyForSelected.length > 0]);

    // Selects the day under the center of the chart as the user scrolls.
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const date = dateAtCenter(event.currentTarget);
        if (date && date !== selectedDate) {
            scrollSelectedDate.current = date;
            onSelectDate?.(date);
        }
    };

    // Current conditions exist only for today and only when an hourly reading covers the current hour.
    const now = moment();
    const currentPoint = isTodaySelected
        ? hourlyForSelected.find((point) => moment(point.timestamp).isSame(now, 'hour'))
        : undefined;
    const headlineTemperature = currentPoint ? currentPoint.temperature : temperature_2m_max;

    return (
        <Box className={`${styles.weatherCard} ${theme.palette.mode === 'dark' ? styles.dark : ''}`}>
            <Box className={styles.closeRow}>
                <Button size="small" onClick={onClose} aria-label="Close weather details">
                    Close
                </Button>
            </Box>
            {dayPicker && <Box className={styles.dayPicker}>{dayPicker}</Box>}
            <Box className={styles.summary}>
                <Box className={styles.conditions}>
                    <i className={`wi ${iconClass}`} aria-hidden="true"></i>
                    <Box>
                        <Typography className={styles.date}>{dayName}, {fullDate}</Typography>
                        <Typography className={styles.summaryLabel}>{isTodaySelected ? 'TODAY’S CONDITIONS' : 'DAILY CONDITIONS'}</Typography>
                    </Box>
                </Box>
                <Box className={styles.temperature}>
                    <Box>
                        <Typography className={styles.metricLabel}>{currentPoint ? 'NOW' : 'DAILY HIGH'}</Typography>
                        <Typography className={styles.temperatureValue}>
                            {degrees(headlineTemperature)}
                        </Typography>
                    </Box>
                    <Typography className={styles.temperatureRange}>
                        H {degrees(temperature_2m_max)} <span>/</span> L {degrees(temperature_2m_min)}
                    </Typography>
                </Box>
            </Box>
            <Box className={styles.metrics}>
                <Box className={styles.metric}>
                    <Typography className={styles.metricLabel}>WIND</Typography>
                    <Typography className={styles.metricValue}>
                        {windspeed_10m_max === null ? <Unavailable /> : <>{Math.round(windspeed_10m_max)} <small>km/h</small></>}
                    </Typography>
                </Box>
                <Box className={styles.metric}>
                    <Typography className={styles.metricLabel}>RAIN CHANCE</Typography>
                    <Typography className={styles.metricValue}>
                        {precipitation_probability_max === null ? <Unavailable /> : <>{precipitation_probability_max}<small>%</small></>}
                    </Typography>
                </Box>
                <Box className={styles.metric}>
                    <Typography className={styles.metricLabel}>SUNRISE</Typography>
                    <Typography className={styles.metricValue}>{clockTime(sunrise)}</Typography>
                </Box>
                <Box className={styles.metric}>
                    <Typography className={styles.metricLabel}>SUNSET</Typography>
                    <Typography className={styles.metricValue}>{clockTime(sunset)}</Typography>
                </Box>
            </Box>
            {hourlyForSelected.length > 0 && (
                <Box className={styles.hourlySection}>
                    <Typography className={styles.chartTitle}>Hourly temperature</Typography>
                    <Box
                        ref={scrollRef}
                        role="region"
                        aria-label="Hourly temperature, scroll to change day"
                        tabIndex={0}
                        onScroll={handleScroll}
                        sx={{ overflowX: 'auto' }}
                    >
                        <LineChart width={chartWidth} height={CHART_HEIGHT} data={allHourly} margin={{ left: 0, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                            <XAxis dataKey="timestamp" interval={2} tickFormatter={(value) => moment(value).format('h A')} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                            <YAxis width={Y_AXIS_WIDTH} domain={[0, 120]} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            {allHourly.filter((point) => point.timestamp.slice(11, 13) === '00').map((point) => (
                                <ReferenceLine key={point.timestamp} x={point.timestamp} stroke={theme.palette.divider} label={{ value: moment(point.timestamp).format('ddd M/D'), position: 'insideTopLeft', fontSize: 11, fill: theme.palette.text.secondary }} />
                            ))}
                            <Line type="monotone" dataKey="temperature" stroke="#187a72" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                        </LineChart>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default WeatherCard;
