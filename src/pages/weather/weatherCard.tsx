import React, { useEffect, useLayoutEffect, useRef } from 'react';
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
import useMediaQuery from '@mui/material/useMediaQuery';
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
const AXIS_WIDTH = 56;
const TEMP_COLOR = '#187a72';
const RAIN_COLOR = '#1976d2';
const PRECIP_COLOR = '#8e44ad';
const Y_AXIS_WIDTH = AXIS_WIDTH * 3;
const CHART_HEIGHT = 260;
const COMPACT_CHART_HEIGHT = 150;
// Room for the horizontal scrollbar so the vertical axis never overflows.
const SCROLLBAR_ALLOWANCE = 16;

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    const theme = useTheme();
    if (active && payload && payload.length > 0) {
        const precipitation: number | null | undefined = payload[0].payload?.precipitation;
        const chance: number | null | undefined = payload[0].payload?.rainChance;
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
                <Typography variant="caption" sx={{ color: TEMP_COLOR, display: 'block' }}>
                    {`Temperature: ${payload[0].value}°F`}
                </Typography>
                <Typography variant="caption" sx={{ color: RAIN_COLOR, display: 'block' }}>
                    {`Rain chance: ${typeof chance === 'number' ? `${Math.round(chance)}%` : '—'}`}
                </Typography>
                <Typography variant="caption" sx={{ color: PRECIP_COLOR, display: 'block' }}>
                    {`Precipitation: ${typeof precipitation === 'number' ? `${precipitation.toFixed(2)} in` : '—'}`}
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
    const mobile = useMediaQuery('(max-width:680px)');
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
        precipitation: hourlyData.precipitation[index] ?? null,
        rainChance: hourlyData.precipitation_probability[index] ?? null,
    }));
    const hourlyForSelected = allHourly.filter((point) => point.timestamp.slice(0, 10) === selectedDate);
    const chartWidth = allHourly.length * HOUR_WIDTH;
    const chartHeight = mobile ? COMPACT_CHART_HEIGHT : CHART_HEIGHT;
    // Latest loaded hour that has already started, marked as "now" on the chart.
    const nowStamp = moment().format('YYYY-MM-DDTHH:00');
    const nowPoint = allHourly.filter((point) => point.timestamp <= nowStamp).pop();
    const nowInRange = !!nowPoint && nowStamp < moment(allHourly[allHourly.length - 1].timestamp).add(1, 'hour').format('YYYY-MM-DDTHH:00');
    const step = allHourly.length > 1 ? (chartWidth - 10) / (allHourly.length - 1) : HOUR_WIDTH;

    const yAxes = [
        <YAxis tickMargin={8} key="temp" yAxisId="temp" width={AXIS_WIDTH} domain={[0, 120]} unit="°" stroke={TEMP_COLOR} label={{ value: 'Temperature (°F)', angle: -90, position: 'insideLeft', offset: 8, style: { textAnchor: 'middle', fill: TEMP_COLOR, fontSize: 11 } }} tick={{ fill: TEMP_COLOR, fontSize: 11 }} />,
        <YAxis tickMargin={8} key="rain" yAxisId="rain" width={AXIS_WIDTH} domain={[0, 100]} unit="%" stroke={RAIN_COLOR} label={{ value: 'Rain chance (%)', angle: -90, position: 'insideLeft', offset: 8, style: { textAnchor: 'middle', fill: RAIN_COLOR, fontSize: 11 } }} tick={{ fill: RAIN_COLOR, fontSize: 11 }} />,
        <YAxis tickMargin={8} key="precip" yAxisId="precip" width={AXIS_WIDTH} domain={[0, (max: number) => Math.max(0.5, Math.ceil(max * 10) / 10)]} unit='"' stroke={PRECIP_COLOR} label={{ value: 'Precipitation (in)', angle: -90, position: 'insideLeft', offset: 8, style: { textAnchor: 'middle', fill: PRECIP_COLOR, fontSize: 11 } }} tick={{ fill: PRECIP_COLOR, fontSize: 11 }} />,
    ];
    // The pinned axis chart draws no lines; it only needs them to compute the same scales.
    const chartLines = (invisible: boolean) => [
        <Line key="temp" yAxisId="temp" type="monotone" dataKey="temperature" stroke={TEMP_COLOR} strokeWidth={3} dot={false} activeDot={invisible ? false : { r: 5 }} strokeOpacity={invisible ? 0 : 1} isAnimationActive={false} />,
        <Line key="rain" yAxisId="rain" type="monotone" dataKey="rainChance" stroke={RAIN_COLOR} strokeWidth={2} dot={false} activeDot={invisible ? false : { r: 4 }} strokeOpacity={invisible ? 0 : 1} isAnimationActive={false} />,
        <Line key="precip" yAxisId="precip" type="monotone" dataKey="precipitation" stroke={PRECIP_COLOR} strokeWidth={2} dot={false} activeDot={invisible ? false : { r: 4 }} strokeOpacity={invisible ? 0 : 1} isAnimationActive={false} />,
    ];

    // Vertical wheel over the hourly chart scrolls it through time: up is forward, down is back.
    // Horizontal wheel/trackpad gestures keep their normal behaviour.
    const hasHourly = hourlyForSelected.length > 0;
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onWheel = (event: WheelEvent) => {
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
            event.preventDefault();
            el.scrollLeft -= event.deltaY;
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [hasHourly]);

    // Date of the hourly point in the middle of the visible chart area.
    const dateAtCenter = (el: HTMLDivElement) => {
        const x = el.scrollLeft + el.clientWidth / 2;
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
        if (target >= 0) el.scrollLeft = target * step - el.clientWidth / 2;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, firstHour, hourlyForSelected.length > 0]);

    // Selects today and centers the chart on the current hour.
    const jumpToNow = () => {
        const el = scrollRef.current;
        if (!nowPoint) return;
        const todayDate = nowPoint.timestamp.slice(0, 10);
        if (todayDate !== selectedDate) {
            scrollSelectedDate.current = todayDate;
            onSelectDate?.(todayDate);
        }
        const index = allHourly.indexOf(nowPoint);
        if (el) el.scrollLeft = index * step - el.clientWidth / 2;
    };

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
        <Box className={`${styles.weatherCard} ${theme.palette.mode === 'dark' ? styles.dark : ''} ${mobile ? styles.mobile : ''}`}>
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
                    <Box className={styles.chartHeader}>
                        <Typography className={styles.chartTitle}>Hourly Temperature</Typography>
                        <Button size="small" className={styles.nowButton} onClick={jumpToNow} disabled={!nowInRange || !nowPoint} aria-label="Jump to today and now">
                            <span className={styles.nowDot} aria-hidden="true" />
                            Today &amp; Now
                        </Button>
                    </Box>
                    <Box sx={{ display: 'flex' }}>
                        <Box aria-hidden="true" sx={{ flex: 'none', width: Y_AXIS_WIDTH, height: chartHeight }}>
                            <LineChart width={Y_AXIS_WIDTH} height={chartHeight} data={allHourly} margin={{ left: 0, right: 0 }}>
                                <XAxis dataKey="timestamp" tick={false} axisLine={false} tickLine={false} />
                                {yAxes}
                                {chartLines(true)}
                            </LineChart>
                        </Box>
                        <Box
                            ref={scrollRef}
                            role="region"
                            aria-label="Hourly temperature, scroll to change day"
                            tabIndex={0}
                            onScroll={handleScroll}
                            sx={{ flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden', height: chartHeight + SCROLLBAR_ALLOWANCE }}
                        >
                            <LineChart width={chartWidth} height={chartHeight} data={allHourly} margin={{ left: 0, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                <XAxis dataKey="timestamp" interval={2} tickFormatter={(value) => moment(value).format('h A')} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                                {yAxes.map((axis) => React.cloneElement(axis, { hide: true, width: 0 }))}
                                <Tooltip content={<CustomTooltip />} />
                                {allHourly.filter((point) => point.timestamp.slice(11, 13) === '00').map((point) => (
                                    <ReferenceLine yAxisId="temp" key={point.timestamp} x={point.timestamp} stroke={theme.palette.divider} label={{ value: moment(point.timestamp).format('ddd M/D'), position: 'insideTopLeft', fontSize: 11, fill: theme.palette.text.secondary }} />
                                ))}
                                {nowInRange && nowPoint && (
                                    <ReferenceLine yAxisId="temp" x={nowPoint.timestamp} stroke="#d32f2f" strokeWidth={2} strokeDasharray="4 3" label={{ value: 'Now', position: 'insideTopRight', fontSize: 11, fontWeight: 700, fill: '#d32f2f' }} />
                                )}
                                {chartLines(false)}
                            </LineChart>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default WeatherCard;
