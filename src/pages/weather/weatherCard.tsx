import React from 'react';
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
    ResponsiveContainer,
    Brush
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { DailyForecast, HourlyForecast } from './parseForecast';

interface WeatherCardProps {
    forecastData: DailyForecast;
    hourlyData: HourlyForecast;
    onClose: () => void;
}

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
                    {`Time: ${label}`}
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
}) => {
    const theme = useTheme();
    const dayName = moment(time).format('dddd');
    const fullDate = moment(time).format('LL');
    const iconClass = (weathercode !== null && weatherCodeIcons[weathercode]) || 'wi-na';
    const selectedDate = moment(time).format('YYYY-MM-DD');
    const today = moment().format('YYYY-MM-DD');
    const isTodaySelected = selectedDate === today;

    // Only valid hourly points for the selected date reach the chart.
    const hourlyForSelected = hourlyData.time.flatMap((hourTime, index) =>
        hourTime.slice(0, 10) === selectedDate
            ? [{
                timestamp: hourTime,
                time: moment(hourTime).format('h:mm A'),
                temperature: hourlyData.temperature_2m[index],
            }]
            : []
    );

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
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={hourlyForSelected}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                            <XAxis dataKey="time" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                            <YAxis domain={[0, 120]} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="temperature" stroke="#187a72" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                            <Brush 
                                dataKey="time" 
                                height={30} 
                                stroke={theme.palette.primary.main}
                                tickFormatter={(value) => moment(value, 'h:mm A').format('hh:mm A')}
                                travellerWidth={20}
                                fill={theme.palette.background.paper}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Box>
    );
};

export default WeatherCard;
