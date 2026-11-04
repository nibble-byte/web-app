import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Menu, MenuItem, Typography } from '@mui/material';
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
    ReferenceLine,
    ReferenceDot
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
const TEMP_COLOR = '#187a72';
const RAIN_COLOR = '#1976d2';
const PRECIP_COLOR = '#8e44ad';
const WIND_COLOR = '#ef8a17';
const AXIS_COLORS = { temp: TEMP_COLOR, rain: RAIN_COLOR, precip: PRECIP_COLOR, wind: WIND_COLOR };
const MEASURE_FIELDS = { temp: 'temperature', rain: 'rainChance', precip: 'precipitation', wind: 'wind' } as const;
const AXIS_OPTIONS = [
    { key: 'temp', label: 'Temperature' },
    { key: 'rain', label: 'Rain chance' },
    { key: 'precip', label: 'Precipitation' },
    { key: 'wind', label: 'Wind speed' },
] as const;
type AxisKey = (typeof AXIS_OPTIONS)[number]['key'];
const CHART_HEIGHT = 260;
const COMPACT_CHART_HEIGHT = 150;
// Room for the horizontal scrollbar so the vertical axis never overflows.
const SCROLLBAR_ALLOWANCE = 16;

type HourlyPoint = {
    timestamp: string;
    ts: number;
    time: string;
    temperature: number;
    precipitation: number | null;
    rainChance: number | null;
    wind: number | null;
};

// Linear interpolation of every measure at `at` (ms); a measure is null when either neighbouring hour has no reading.
export const interpolateAt = (points: HourlyPoint[], at: number): HourlyPoint | null => {
    if (points.length === 0 || at < points[0].ts || at > points[points.length - 1].ts) return null;
    let after = points.findIndex((point) => point.ts >= at);
    if (after < 0) after = points.length - 1;
    const b = points[after];
    const a = points[Math.max(0, after - (b.ts === at ? 0 : 1))];
    const ratio = b.ts === a.ts ? 0 : (at - a.ts) / (b.ts - a.ts);
    const blend = (x: number | null, y: number | null) => (x === null || y === null ? null : x + (y - x) * ratio);
    return {
        timestamp: '',
        ts: at,
        time: moment(at).format('h:mm A'),
        temperature: blend(a.temperature, b.temperature) as number,
        precipitation: blend(a.precipitation, b.precipitation),
        rainChance: blend(a.rainChance, b.rainChance),
        wind: blend(a.wind, b.wind),
    };
};

// Horizontal distance (px) within which the hover shows the interpolated "now" values.
const NOW_HOVER_PX = 10;

const CustomTooltip: React.FC<any> = ({ active, payload, label, nowPoint, hoveringNow: nearNow }) => {
    const theme = useTheme();
    if (active && payload && payload.length > 0) {
        const hoveringNow = !!nowPoint && !!nearNow;
        const source: HourlyPoint = hoveringNow ? nowPoint : payload[0].payload;
        const precipitation = source?.precipitation;
        const chance = source?.rainChance;
        const wind = source?.wind;
        label = hoveringNow ? nowPoint.ts : label;
        return (
            <Box
                sx={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    padding: theme.spacing(1),
                }}
            >
                <Typography variant="caption" sx={{ color: theme.palette.text.primary }}>
                    {hoveringNow ? `Now: ${moment(label).format('ddd h:mm A')}` : `Time: ${moment(label).format('ddd h:mm A')}`}
                </Typography>
                <Typography variant="caption" sx={{ color: TEMP_COLOR, display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 600 }}>
                    <span className={styles.swatch} style={{ background: TEMP_COLOR }} aria-hidden="true" />
                    {`Temperature: ${typeof source?.temperature === 'number' ? (hoveringNow ? source.temperature.toFixed(1) : source.temperature) : '—'}°F`}
                </Typography>
                <Typography variant="caption" sx={{ color: RAIN_COLOR, display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 600 }}>
                    <span className={styles.swatch} style={{ background: RAIN_COLOR }} aria-hidden="true" />
                    {`Rain chance: ${typeof chance === 'number' ? `${Math.round(chance)}%` : '—'}`}
                </Typography>
                <Typography variant="caption" sx={{ color: PRECIP_COLOR, display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 600 }}>
                    <span className={styles.swatch} style={{ background: PRECIP_COLOR }} aria-hidden="true" />
                    {`Precipitation: ${typeof precipitation === 'number' ? `${precipitation.toFixed(2)} in` : '—'}`}
                </Typography>
                <Typography variant="caption" sx={{ color: WIND_COLOR, display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 600 }}>
                    <span className={styles.swatch} style={{ background: WIND_COLOR }} aria-hidden="true" />
                    {`Wind: ${typeof wind === 'number' ? `${Math.round(wind)} km/h` : '—'}`}
                </Typography>
            </Box>
        );
    }
    return null;
};

// Vertical hover guide: follows the hourly point, but snaps to the "Now" line while it is being hovered.
const HoverCursor: React.FC<any> = ({ points, nowX }) => {
    const theme = useTheme();
    if (!points || points.length < 2) return null;
    const x = nowX ?? points[0].x;
    return <line x1={x} x2={x} y1={points[0].y} y2={points[1].y} stroke={nowX === null ? theme.palette.text.disabled : '#d32f2f'} strokeWidth={nowX === null ? 1 : 2} pointerEvents="none" />;
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
    const allHourly: HourlyPoint[] = hourlyData.time.map((hourTime, index) => ({
        timestamp: hourTime,
        ts: moment(hourTime).valueOf(),
        time: moment(hourTime).format('h:mm A'),
        temperature: hourlyData.temperature_2m[index],
        precipitation: hourlyData.precipitation[index] ?? null,
        rainChance: hourlyData.precipitation_probability[index] ?? null,
        wind: hourlyData.windspeed_10m[index] ?? null,
    }));
    const hourlyForSelected = allHourly.filter((point) => point.timestamp.slice(0, 10) === selectedDate);
    const chartWidth = allHourly.length * HOUR_WIDTH;
    const chartHeight = mobile ? COMPACT_CHART_HEIGHT : CHART_HEIGHT;
    // The current moment, refreshed every minute, drawn at its exact position between hours.
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);
    const firstTs = allHourly[0]?.ts ?? 0;
    const lastTs = allHourly[allHourly.length - 1]?.ts ?? 0;
    const pxPerMs = lastTs > firstTs ? (chartWidth - 10) / (lastTs - firstTs) : 0;
    const xOf = (ts: number) => (ts - firstTs) * pxPerMs;
    const nowPoint = interpolateAt(allHourly, nowMs);
    const nowX = xOf(nowMs);
    // True while the pointer is on the "Now" line, so the tooltip shows the interpolated current values.
    const [hoverNow, setHoverNow] = useState(false);
    const handleChartMove = (event: React.MouseEvent<HTMLDivElement>) => {
        const el = event.currentTarget;
        const x = event.clientX - el.getBoundingClientRect().left + el.scrollLeft;
        setHoverNow(Math.abs(x - nowX) <= NOW_HOVER_PX);
    };

    const [visibleAxes, setVisibleAxes] = useState<Record<AxisKey, boolean>>({ temp: true, rain: true, precip: true, wind: true });
    const [axisMenuAnchor, setAxisMenuAnchor] = useState<HTMLElement | null>(null);
    const toggleAxis = (key: AxisKey) => setVisibleAxes((current) => ({ ...current, [key]: !current[key] }));
    const shown = (element: React.ReactElement) => visibleAxes[element.key as AxisKey];

    const yAxes = [
        <YAxis key="temp" yAxisId="temp" domain={[0, 120]} hide />,
        <YAxis key="rain" yAxisId="rain" domain={[0, 100]} hide />,
        <YAxis key="precip" yAxisId="precip" domain={[0, (max: number) => Math.max(0.5, Math.ceil(max * 10) / 10)]} hide />,
        <YAxis key="wind" yAxisId="wind" domain={[0, (max: number) => Math.max(20, Math.ceil(max / 10) * 10)]} hide />,
    ];
    const chartLines = () => [
        <Line key="temp" yAxisId="temp" type="monotone" dataKey="temperature" stroke={TEMP_COLOR} strokeWidth={3} dot={false} activeDot={hoverNow ? false : { r: 5 }} isAnimationActive={false} />,
        <Line key="rain" yAxisId="rain" type="monotone" dataKey="rainChance" stroke={RAIN_COLOR} strokeWidth={2} dot={false} activeDot={hoverNow ? false : { r: 4 }} isAnimationActive={false} />,
        <Line key="precip" yAxisId="precip" type="monotone" dataKey="precipitation" stroke={PRECIP_COLOR} strokeWidth={2} dot={false} activeDot={hoverNow ? false : { r: 4 }} isAnimationActive={false} />,
        <Line key="wind" yAxisId="wind" type="monotone" dataKey="wind" stroke={WIND_COLOR} strokeWidth={2} dot={false} activeDot={hoverNow ? false : { r: 4 }} isAnimationActive={false} />,
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
        if (allHourly.length === 0) return undefined;
        const ts = pxPerMs > 0 ? firstTs + x / pxPerMs : firstTs;
        return moment(Math.min(lastTs, Math.max(firstTs, ts))).format('YYYY-MM-DD');
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
        if (target >= 0) el.scrollLeft = xOf(allHourly[target].ts) - el.clientWidth / 2;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, firstHour, hourlyForSelected.length > 0]);

    // Selects today and centers the chart on the current hour.
    const jumpToNow = () => {
        const el = scrollRef.current;
        if (!nowPoint) return;
        const todayDate = moment(nowMs).format('YYYY-MM-DD');
        if (todayDate !== selectedDate) {
            scrollSelectedDate.current = todayDate;
            onSelectDate?.(todayDate);
        }
        if (el) el.scrollLeft = nowX - el.clientWidth / 2;
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
                        <Button size="small" className={styles.nowButton} onClick={jumpToNow} disabled={!nowPoint} aria-label="Jump to today and now">
                            <span className={styles.nowDot} aria-hidden="true" />
                            Today &amp; Now
                        </Button>
                        <Button size="small" className={styles.axesButton} onClick={(event) => setAxisMenuAnchor(event.currentTarget)} aria-haspopup="menu" aria-expanded={!!axisMenuAnchor} aria-label="Choose lines">
                            Lines ▾
                        </Button>
                        <Menu anchorEl={axisMenuAnchor} open={!!axisMenuAnchor} onClose={() => setAxisMenuAnchor(null)}>
                            {AXIS_OPTIONS.map((option) => (
                                <MenuItem key={option.key} dense onClick={() => toggleAxis(option.key)}>
                                    <FormControlLabel
                                        control={<Checkbox size="small" sx={{ color: AXIS_COLORS[option.key], '&.Mui-checked': { color: AXIS_COLORS[option.key] } }} checked={visibleAxes[option.key]} tabIndex={-1} disableRipple />}
                                        label={<><span className={styles.swatch} style={{ background: AXIS_COLORS[option.key] }} aria-hidden="true" />{option.label}</>}
                                        onClick={(event) => event.preventDefault()}
                                    />
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>
                    <Box sx={{ display: 'flex' }}>
                        <Box
                            ref={scrollRef}
                            role="region"
                            aria-label="Hourly temperature, scroll to change day"
                            tabIndex={0}
                            onScroll={handleScroll}
                            onMouseMove={handleChartMove}
                            onMouseLeave={() => setHoverNow(false)}
                            sx={{ flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden', height: chartHeight + SCROLLBAR_ALLOWANCE }}
                        >
                            <LineChart width={chartWidth} height={chartHeight} data={allHourly} margin={{ left: 0, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                <XAxis dataKey="ts" type="number" scale="time" domain={[firstTs, lastTs]} ticks={allHourly.filter((_, index) => index % 2 === 0).map((point) => point.ts)} tickFormatter={(value) => moment(value).format('h A')} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                                {yAxes}
                                <Tooltip content={<CustomTooltip nowPoint={nowPoint} hoveringNow={hoverNow} />} cursor={<HoverCursor nowX={hoverNow && nowPoint ? nowX : null} />} />
                                {allHourly.filter((point) => point.timestamp.slice(11, 13) === '00').map((point) => (
                                    <ReferenceLine yAxisId="temp" key={point.timestamp} x={point.ts} stroke={theme.palette.divider} label={{ value: moment(point.timestamp).format('ddd M/D'), position: 'insideTopLeft', fontSize: 11, fill: theme.palette.text.secondary }} />
                                ))}
                                {nowPoint && (
                                    <ReferenceLine yAxisId="temp" x={nowMs} stroke="#d32f2f" strokeWidth={2} strokeDasharray="4 3" label={{ value: 'Now', position: 'insideTopRight', fontSize: 11, fontWeight: 700, fill: '#d32f2f' }} />
                                )}
                                {chartLines().filter(shown)}
                                {nowPoint && AXIS_OPTIONS.filter((option) => visibleAxes[option.key]).map((option) => {
                                    const value = nowPoint[MEASURE_FIELDS[option.key]];
                                    return typeof value === 'number' ? (
                                        <ReferenceDot key={`now-${option.key}`} yAxisId={option.key} x={nowMs} y={value} r={5} fill={AXIS_COLORS[option.key]} stroke="#fff" strokeWidth={2} ifOverflow="visible" />
                                    ) : null;
                                })}
                            </LineChart>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default WeatherCard;
