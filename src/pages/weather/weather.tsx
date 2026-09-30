// Weather.tsx
import React, { useState } from 'react';
import { Box, Typography, Button, useTheme, TextField } from '@mui/material';
import WeatherCard from './weatherCard';
import getOpenMeteoWeather from './getOpenMeteoWeather';
import Calendar from './calendar';
import styles from './weather.module.css';

interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ZippopotamResponse {
  'post code': string;
  country: string;
  'country abbreviation': string;
  places: Array<{
    'place name': string;
    longitude: string;
    state: string;
    'state abbreviation': string;
    latitude: string;
  }>;
}

const handleLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        }
      );
    } else {
      reject(new Error('Geolocation is not supported by this browser.'));
    }
  });
};

// Fetch coordinates from a US zip code using OpenWeatherMap Geocoding API
const getCoordinatesFromZip = async (zip: string): Promise<Coordinates> => {
  // You can use your own API key or a different geocoding service if you prefer
  const response = await fetch(
    `https://api.zippopotam.us/us/${zip}`
  );
  if (!response.ok) {
    throw new Error('Invalid zip code or failed to fetch location.');
  }
  const data: ZippopotamResponse = await response.json();
  return {
    latitude: Number(data.places[0].latitude),
    longitude: Number(data.places[0].longitude),
  };
};

const Weather: React.FC = () => {
  const theme = useTheme();
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedForecastIndex, setSelectedForecastIndex] = useState<number | null>(null);
  const [zipCode, setZipCode] = useState<string>('');

  const fetchWeatherData = async (coords?: Coordinates) => {
    setLoading(true);
    setError(null);
    try {
      let location = coords || userLocation;
      if (!location) {
        location = await handleLocation();
        setUserLocation(location);
      }
      if (location) {
        const weather = await getOpenMeteoWeather({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        setWeatherData(weather);
        setSelectedForecastIndex(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle zip code submit
  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const coords = await getCoordinatesFromZip(zipCode);
      setUserLocation(coords);
      await fetchWeatherData(coords);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Build an array of daily forecast objects from the merged API response.
  const dailyForecasts =
    weatherData && weatherData.daily
      ? weatherData.daily.time.map((time: string, index: number) => ({
          index,
          time,
          temperature_2m_max: weatherData.daily.temperature_2m_max[index],
          temperature_2m_min: weatherData.daily.temperature_2m_min[index],
          weathercode: weatherData.daily.weathercode[index],
          precipitation_probability_max: weatherData.daily.precipitation_probability_max
            ? weatherData.daily.precipitation_probability_max[index]
            : 0,
          windspeed_10m_max: weatherData.daily.windspeed_10m_max[index],
          sunrise: weatherData.daily.sunrise[index],
          sunset: weatherData.daily.sunset[index],
        }))
      : [];

  return (
    <Box className={`${styles.weatherPage} ${theme.palette.mode === 'dark' ? styles.dark : ''}`}>
      <Box className={styles.weatherHeading}>
        <Box>
          <Typography className={styles.eyebrow}>LOCAL CONDITIONS</Typography>
          <Typography component="h2" className={styles.heading}>Weather, in focus.</Typography>
          <Typography className={styles.subheading}>A clear look at the days ahead.</Typography>
        </Box>
        <Box className={styles.locationFormWrap}>
          <form onSubmit={handleZipSubmit} className={styles.locationForm}>
        <TextField
          label="Zip Code"
          variant="outlined"
          size="small"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className={styles.zipField}
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 5 }}
        />
        <Button
          type="submit"
          variant="contained"
          className={styles.searchButton}
          disabled={loading || zipCode.length === 0}
        >
          Search
        </Button>
        <Button
          variant="contained"
          onClick={() => fetchWeatherData()}
          className={styles.locationButton}
          disabled={loading}
        >
          Use my location
        </Button>
          </form>
        </Box>
      </Box>
      {loading && <Typography className={styles.status} aria-live="polite">Finding your forecast...</Typography>}
      {error && <Typography className={`${styles.status} ${styles.error}`} role="alert">{error}</Typography>}

      {dailyForecasts.length === 0 && !loading && !error && (
        <Box className={styles.emptyState}>
          <Box className={styles.weatherMark} aria-hidden="true" />
          <Typography className={styles.emptyTitle}>Your forecast is waiting.</Typography>
          <Typography className={styles.emptyCopy}>
            Search by ZIP code or use your current location to see the week ahead.
          </Typography>
        </Box>
      )}

      {dailyForecasts.length > 0 && (
        <Box className={styles.forecastContent}>
          {/* Display detailed forecast for the selected date (with hourly graph) */}
          {selectedForecastIndex !== null && (
            <Box className={styles.detailSection}>
              <WeatherCard 
                forecastData={dailyForecasts[selectedForecastIndex]} 
                hourlyData={weatherData.hourly} 
              />
            </Box>
          )}

          {/* Date selector header and calendar */}
          <Box className={styles.calendarSection}>
            <Box className={styles.sectionHeading}>
              <Box>
                <Typography className={styles.eyebrow}>THE WEEK AHEAD</Typography>
                <Typography component="h3" className={styles.sectionTitle}>Daily forecast</Typography>
              </Box>
              <Typography className={styles.sectionHint}>Select a day for the hourly outlook</Typography>
            </Box>
            <Calendar
              dailyForecasts={dailyForecasts}
              selectedForecastIndex={selectedForecastIndex}
              setSelectedForecastIndex={setSelectedForecastIndex}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Weather;
