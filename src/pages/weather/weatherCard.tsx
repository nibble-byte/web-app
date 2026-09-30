import React from 'react';
import { Box, Typography } from '@mui/material';
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

interface RawDailyForecast {
    index: number;
    time: string;
    temperature_2m_max: number;
    temperature_2m_min: number;
    weathercode: number;
    precipitation_probability_max: number;
    windspeed_10m_max: number;
    sunrise: string;
    sunset: string;
}

interface HourlyData {
    time: string[];
    temperature_2m: number[];
}

interface WeatherCardProps {
    forecastData: RawDailyForecast;
    hourlyData: HourlyData;
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
}) => {
    const theme = useTheme();
    const dayName = moment(time).format('dddd');
    const fullDate = moment(time).format('LL');
    const iconClass = weatherCodeIcons[weathercode] || 'wi-na';
    const selectedDate = moment(time).format('YYYY-MM-DD');
    const today = moment().format('YYYY-MM-DD');
    const isTodaySelected = selectedDate === today;

    // Filter hourly data for the selected date.
    const hourlyForSelected = hourlyData.time.reduce((acc: any[], hourTime: string, index: number) => {
        if (moment(hourTime).format('YYYY-MM-DD') === selectedDate) {
            acc.push({
                time: moment(hourTime).format('h:mm A'),
                temperature: hourlyData.temperature_2m[index],
            });
        }
        return acc;
    }, []);

    // If today is selected, try to find current hourly temperature.
    const nowFormatted = moment().format('h:mm A');
    const currentData = hourlyForSelected.find((data: { time: string; temperature: number }) => data.time === nowFormatted);
    const currentTemperature = currentData ? currentData.temperature : temperature_2m_max;

    return (
        <Box className={`${styles.weatherCard} ${theme.palette.mode === 'dark' ? styles.dark : ''}`}>
            <Box className={styles.summary}>
                <Box className={styles.conditions}>
                    <i className={`wi ${iconClass}`} aria-hidden="true"></i>
                    <Box>
                        <Typography className={styles.date}>{dayName}, {fullDate}</Typography>
                        <Typography className={styles.summaryLabel}>{isTodaySelected ? 'TODAY’S CONDITIONS' : 'DAILY CONDITIONS'}</Typography>
                    </Box>
                </Box>
                <Box className={styles.temperature}>
                    <Typography className={styles.temperatureValue}>
                        {isTodaySelected ? Math.round(currentTemperature) : Math.round(temperature_2m_max)}°
                    </Typography>
                    <Typography className={styles.temperatureRange}>
                        H {Math.round(temperature_2m_max)}° <span>/</span> L {Math.round(temperature_2m_min)}°
                    </Typography>
                </Box>
            </Box>
            <Box className={styles.metrics}>
                <Box className={styles.metric}>
                    <Typography className={styles.metricLabel}>WIND</Typography>
                    <Typography className={styles.metricValue}>{Math.round(windspeed_10m_max)} <small>km/h</small></Typography>
                </Box>
                <Box className={styles.metric}>
                    <Typography className={styles.metricLabel}>RAIN CHANCE</Typography>
                    <Typography className={styles.metricValue}>{precipitation_probability_max || 0}<small>%</small></Typography>
                </Box>
                <Box className={styles.metric}>
                    <Typography className={styles.metricLabel}>SUNRISE</Typography>
                    <Typography className={styles.metricValue}>{moment(sunrise).format('h:mm')} <small>{moment(sunrise).format('A')}</small></Typography>
                </Box>
                <Box className={styles.metric}>
                    <Typography className={styles.metricLabel}>SUNSET</Typography>
                    <Typography className={styles.metricValue}>{moment(sunset).format('h:mm')} <small>{moment(sunset).format('A')}</small></Typography>
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
