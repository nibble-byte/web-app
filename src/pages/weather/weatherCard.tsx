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
type MeasureKey =
    | 'temp' | 'rain' | 'precip' | 'wind'
    | 'humidity' | 'dewpoint' | 'snow' | 'windDir' | 'gusts' | 'cloud' | 'pressure' | 'radiation' | 'visibility' | 'aqi';

type Measure = {
    key: MeasureKey;
    field: string;
    label: string;
    unit: string;
    color: string;
    decimals: number;
    // Value range of this line's own hidden y scale.
    domain: [number | string, number | string | ((max: number) => number)];
    // Converts the API value to the displayed unit.
    scale?: number;
    defaultOn?: boolean;
    width?: number;
};

const atLeast = (floor: number, step: number) => (max: number) => Math.max(floor, Math.ceil(max / step) * step);

const MEASURES: Measure[] = [
    { key: 'temp', field: 'temperature', label: 'Temperature', unit: '°F', color: '#187a72', decimals: 1, domain: [0, 120], defaultOn: true, width: 3 },
    { key: 'rain', field: 'rainChance', label: 'Rain chance', unit: '%', color: '#1976d2', decimals: 0, domain: [0, 100], defaultOn: true },
    { key: 'precip', field: 'precipitation', label: 'Precipitation', unit: ' in', color: '#8e44ad', decimals: 2, domain: [0, atLeast(0.5, 0.1)], defaultOn: true },
    { key: 'wind', field: 'wind', label: 'Wind', unit: ' km/h', color: '#ef8a17', decimals: 0, domain: [0, atLeast(20, 10)], defaultOn: true },
    { key: 'humidity', field: 'relativehumidity_2m', label: 'Humidity', unit: '%', color: '#00acc1', decimals: 0, domain: [0, 100] },
    { key: 'dewpoint', field: 'dewpoint_2m', label: 'Dew point', unit: '°F', color: '#5c6bc0', decimals: 1, domain: [-20, 120] },
    { key: 'snow', field: 'snowfall', label: 'Snowfall', unit: ' in', color: '#90a4ae', decimals: 2, domain: [0, atLeast(0.5, 0.1)] },
    { key: 'windDir', field: 'winddirection_10m', label: 'Wind direction', unit: '°', color: '#c0792b', decimals: 0, domain: [0, 360] },
    { key: 'gusts', field: 'windgusts_10m', label: 'Wind gusts', unit: ' km/h', color: '#d84315', decimals: 0, domain: [0, atLeast(30, 10)] },
    { key: 'cloud', field: 'cloudcover', label: 'Cloud cover', unit: '%', color: '#78909c', decimals: 0, domain: [0, 100] },
    { key: 'pressure', field: 'surface_pressure', label: 'Pressure', unit: ' hPa', color: '#6d4c41', decimals: 0, domain: ['auto', 'auto'] },
    { key: 'radiation', field: 'shortwave_radiation', label: 'Solar radiation', unit: ' W/m²', color: '#f9a825', decimals: 0, domain: [0, atLeast(100, 100)] },
    { key: 'visibility', field: 'visibility', label: 'Visibility', unit: ' mi', color: '#43a047', decimals: 1, domain: [0, atLeast(5, 5)], scale: 1 / 1609.344 },
    { key: 'aqi', field: 'us_aqi', label: 'Air quality (US AQI)', unit: '', color: '#e91e63', decimals: 0, domain: [0, atLeast(100, 50)] },
];
const DEFAULT_VISIBLE = Object.fromEntries(MEASURES.map((measure) => [measure.key, !!measure.defaultOn])) as Record<MeasureKey, boolean>;
const CHART_HEIGHT = 260;
const COMPACT_CHART_HEIGHT = 150;
// Room for the horizontal scrollbar so the vertical axis never overflows.
const SCROLLBAR_ALLOWANCE = 16;

type HourlyPoint = {
    timestamp: string;
    ts: number;
    time: string;
    [field: string]: number | string | null | undefined;
};

const readingOf = (point: HourlyPoint, field: string): number | null => {
    const value = point[field];
    return typeof value === 'number' ? value : null;
};

// Linear interpolation of every measure at `at` (ms); a measure is null when either neighbouring hour has no reading.
export const interpolateAt = (points: HourlyPoint[], at: number): HourlyPoint | null => {
    if (points.length === 0 || at < points[0].ts || at > points[points.length - 1].ts) return null;
    let after = points.findIndex((point) => point.ts >= at);
    if (after < 0) after = points.length - 1;
    const b = points[after];
    const a = points[Math.max(0, after - (b.ts === at ? 0 : 1))];
    const ratio = b.ts === a.ts ? 0 : (at - a.ts) / (b.ts - a.ts);
    const result: HourlyPoint = { timestamp: '', ts: at, time: moment(at).format('h:mm A') };
    for (const { field } of MEASURES) {
        const x = readingOf(a, field);
        const y = readingOf(b, field);
        result[field] = x === null || y === null ? null : x + (y - x) * ratio;
    }
    return result;
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
        ...Object.fromEntries(
            MEASURES.filter((measure) => measure.field in (hourlyData.extra ?? {})).map((measure) => {
                const reading = hourlyData.extra[measure.field as keyof HourlyForecast['extra']][index];
                return [measure.field, typeof reading === 'number' ? reading * (measure.scale ?? 1) : null];
            })
        ),
    }));
    const hourlyForSelected = allHourly.filter((point) => point.timestamp.slice(0, 10) === selectedDate);
    // Add extra width so you can scroll until the last data point reaches the center
    // The extra space equals roughly half the typical viewport width for the chart
    const baseChartWidth = allHourly.length * HOUR_WIDTH;
    const extraScrollSpace = 400; // Approximate half-width for centering the last point
    const chartWidth = baseChartWidth + extraScrollSpace;
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
    const [highlightedTs, setHighlightedTs] = useState<number | null>(null);
    const [centerTs, setCenterTs] = useState<number | null>(null);
    const [visibleFirstTs, setVisibleFirstTs] = useState<number>(firstTs);
    const [visibleLastTs, setVisibleLastTs] = useState<number>(lastTs);
    const [statMenuAnchor, setStatMenuAnchor] = useState<HTMLElement | null>(null);
    const [visibleStats, setVisibleStats] = useState<MeasureKey[]>(['temp', 'wind', 'rain']);

    const [visibleLines, setVisibleLines] = useState<Record<MeasureKey, boolean>>(DEFAULT_VISIBLE);
    const [lineMenuAnchor, setLineMenuAnchor] = useState<HTMLElement | null>(null);
    const toggleLine = (key: MeasureKey) => setVisibleLines((current) => ({ ...current, [key]: !current[key] }));
    const shownMeasures = MEASURES.filter((measure) => visibleLines[measure.key]);

    // Each line gets its own hidden y scale so very different units stay readable together.
    const yAxes = MEASURES.map((measure) => (
        <YAxis key={measure.key} yAxisId={measure.key} domain={measure.domain as [number, number]} hide />
    ));
    const chartLines = () =>
        shownMeasures.map((measure) => (
            <Line key={measure.key} yAxisId={measure.key} type="monotone" dataKey={measure.field} stroke={measure.color} strokeWidth={measure.width ?? 2} dot={false} isAnimationActive={false} />
        ));

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

    // Update visible range for clamping now indicator
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el || pxPerMs === 0) {
            setVisibleFirstTs(firstTs);
            setVisibleLastTs(lastTs);
            return;
        }
        const vFirstTs = firstTs + (el.scrollLeft / pxPerMs);
        const vLastTs = vFirstTs + (el.clientWidth / pxPerMs);
        setVisibleFirstTs(vFirstTs);
        setVisibleLastTs(vLastTs);
    });

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

    // Selects today and positions the chart so the current hour is in the center.
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

    // Timestamp of the hourly point in the middle of the visible chart area.
    const tsAtCenter = (el: HTMLDivElement) => {
        const x = el.scrollLeft + el.clientWidth / 2;
        if (allHourly.length === 0) return undefined;
        const ts = pxPerMs > 0 ? firstTs + x / pxPerMs : firstTs;
        return Math.min(lastTs, Math.max(firstTs, ts));
    };

    // Selects the day under the center of the chart as the user scrolls.
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const el = event.currentTarget;
        const ts = tsAtCenter(el);
        if (ts !== undefined) {
            setCenterTs(ts);
        }
        const date = dateAtCenter(el);
        if (date && date !== selectedDate) {
            scrollSelectedDate.current = date;
            onSelectDate?.(date);
        }
    };

    // Get the point at the center of the visible chart, or use the current point if not scrolling
    const centerPoint = centerTs !== null ? interpolateAt(allHourly, centerTs) : null;
    const currentPoint = centerPoint ?? (isTodaySelected ? nowPoint : null);
    const headlineTemperature = currentPoint ? readingOf(currentPoint, 'temperature') : temperature_2m_max;
    const headlineWind = currentPoint ? readingOf(currentPoint, 'wind') : windspeed_10m_max;
    const headlineRainChance = currentPoint ? readingOf(currentPoint, 'rainChance') : precipitation_probability_max;

    // Clamp nowMs to visible range for edge display when now is off-screen
    const nowTsClamped = Math.max(visibleFirstTs, Math.min(visibleLastTs, nowMs));

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
                        <Typography className={styles.metricLabel}>{currentPoint ? (centerPoint ? moment(currentPoint.ts).format('ddd h:mm A') : 'NOW') : 'DAILY HIGH'}</Typography>
                        <Typography className={styles.temperatureValue}>
                            {degrees(headlineTemperature)}
                        </Typography>
                    </Box>
                    <Typography className={styles.temperatureRange}>
                        H {degrees(temperature_2m_max)} <span>/</span> L {degrees(temperature_2m_min)}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" aria-label="Choose summary stats" aria-haspopup="menu" aria-expanded={!!statMenuAnchor}
                    onClick={(event) => setStatMenuAnchor(event.currentTarget)}>Stats ▾</Button>
                <Menu anchorEl={statMenuAnchor} open={!!statMenuAnchor} onClose={() => setStatMenuAnchor(null)}>
                    {MEASURES.map((measure) => (
                        <MenuItem key={measure.key} onClick={() => setVisibleStats((current) =>
                            current.includes(measure.key) ? current.filter((key) => key !== measure.key) : [...current, measure.key])}>
                            <Checkbox checked={visibleStats.includes(measure.key)} tabIndex={-1} disableRipple inputProps={{ 'aria-label': measure.label }} />
                            {measure.label}
                        </MenuItem>
                    ))}
                </Menu>
            </Box>
            <Box className={styles.metrics}>
                {MEASURES.filter((measure) => visibleStats.includes(measure.key)).map((measure) => {
                    const value = currentPoint ? readingOf(currentPoint, measure.field)
                        : measure.key === 'wind' ? headlineWind : measure.key === 'rain' ? headlineRainChance
                        : measure.key === 'temp' ? headlineTemperature : null;
                    return (
                        <Box key={measure.key} className={styles.metric}>
                            <Typography className={styles.metricLabel}>{measure.label.toUpperCase()}</Typography>
                            <Typography className={styles.metricValue}>
                                {value === null ? <Unavailable /> : <>{Number(value.toFixed(measure.decimals))}<small>{measure.unit}</small></>}
                            </Typography>
                        </Box>
                    );
                })}
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
                        <Typography className={styles.chartTitle}>Hourly Weather</Typography>
                        <Button size="small" className={styles.nowButton} onClick={jumpToNow} disabled={!nowPoint} aria-label="Jump to today and now">
                            <span className={styles.nowDot} aria-hidden="true" />
                            Today &amp; Now
                        </Button>
                        <Button size="small" className={styles.axesButton} onClick={(event) => setLineMenuAnchor(event.currentTarget)} aria-haspopup="menu" aria-expanded={!!lineMenuAnchor} aria-label="Choose lines">
                            Lines ▾
                        </Button>
                        <Menu anchorEl={lineMenuAnchor} open={!!lineMenuAnchor} onClose={() => setLineMenuAnchor(null)}>
                            {MEASURES.map((measure) => (
                                <MenuItem key={measure.key} dense onClick={() => toggleLine(measure.key)}>
                                    <FormControlLabel
                                        control={<Checkbox size="small" sx={{ color: measure.color, '&.Mui-checked': { color: measure.color } }} checked={visibleLines[measure.key]} tabIndex={-1} disableRipple />}
                                        label={<><span className={styles.swatch} style={{ background: measure.color }} aria-hidden="true" />{measure.label}</>}
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
                            sx={{ flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden', height: chartHeight + SCROLLBAR_ALLOWANCE }}
                        >
                            <LineChart onMouseMove={(state) => {
                                if (state?.activeLabel != null) setHighlightedTs(Number(state.activeLabel));
                            }} width={chartWidth} height={chartHeight} data={allHourly} margin={{ left: 0, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                <XAxis dataKey="ts" type="number" scale="time" domain={[firstTs, lastTs]} ticks={allHourly.filter((_, index) => index % 2 === 0).map((point) => point.ts)} tickFormatter={(value) => moment(value).format('h A')} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                                {yAxes}
                                {allHourly.filter((point) => point.timestamp.slice(11, 13) === '00').map((point) => (
                                    <ReferenceLine yAxisId="temp" key={point.timestamp} x={point.ts} stroke={theme.palette.divider} label={{ value: moment(point.timestamp).format('ddd M/D'), position: 'insideTopLeft', fontSize: 11, fill: theme.palette.text.secondary }} />
                                ))}
                                {nowPoint && (
                                    <ReferenceLine yAxisId="temp" x={nowTsClamped} stroke="#d32f2f" strokeWidth={2} strokeDasharray="4 3" label={{ value: 'Now', position: 'insideTopRight', fontSize: 11, fontWeight: 700, fill: '#d32f2f' }} />
                                )}
                                {centerTs !== null && (
                                    <ReferenceLine yAxisId="temp" x={centerTs} stroke={theme.palette.primary.main} strokeWidth={2} />
                                )}
                                {chartLines()}
                                {nowPoint && shownMeasures.map((measure) => {
                                    const value = readingOf(nowPoint, measure.field);
                                    return value !== null ? (
                                        <ReferenceDot key={`now-${measure.key}`} yAxisId={measure.key} x={nowTsClamped} y={value} r={5} fill={measure.color} stroke="#fff" strokeWidth={2} />
                                    ) : null;
                                })}
                                {centerPoint && shownMeasures.map((measure) => {
                                    const value = readingOf(centerPoint, measure.field);
                                    return value !== null ? (
                                        <ReferenceDot key={`center-${measure.key}`} yAxisId={measure.key} x={centerTs!} y={value} r={5} fill={measure.color} stroke="#fff" strokeWidth={2} ifOverflow="visible" />
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
