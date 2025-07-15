interface OpenWeatherResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  dt: number;
}

interface GeocodeResponse {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private geocodeUrl = 'https://api.openweathermap.org/geo/1.0';
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenWeather API key is required');
    }
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(url: string, retries = 3): Promise<T> {
    const cacheKey = url;
    const cached = this.requestCache.get(cacheKey);
    
    // Return cached data if still fresh
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Weather-Dashboard/1.0',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          if (response.status === 401) {
            throw new Error('Invalid OpenWeather API key');
          }
          
          if (response.status === 404) {
            throw new Error('Location not found');
          }
          
          throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as T;
        
        // Cache successful response
        this.requestCache.set(cacheKey, { data, timestamp: Date.now() });
        
        return data;
      } catch (error) {
        console.error(`Weather API request failed (attempt ${attempt}/${retries}):`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff for retries
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  async getCurrentWeather(lat: number, lon: number): Promise<{
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    condition: string;
    description: string;
    icon: string;
  }> {
    const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
    
    try {
      const data = await this.makeRequest<OpenWeatherResponse>(url);
      
      return {
        temperature: Math.round(data.main.temp * 10) / 10,
        feelsLike: Math.round(data.main.feels_like * 10) / 10,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 10) / 10,
        windDirection: data.wind.deg || 0,
        condition: data.weather[0]?.main || 'Unknown',
        description: data.weather[0]?.description || 'No description',
        icon: data.weather[0]?.icon || '01d',
      };
    } catch (error) {
      console.error('Error fetching current weather:', error);
      throw error;
    }
  }

  async geocodeLocation(locationName: string): Promise<{
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    state?: string;
  }> {
    const encodedLocation = encodeURIComponent(locationName.trim());
    const url = `${this.geocodeUrl}/direct?q=${encodedLocation}&limit=1&appid=${this.apiKey}`;
    
    try {
      const data = await this.makeRequest<GeocodeResponse[]>(url);
      
      if (!data || data.length === 0) {
        throw new Error(`Location "${locationName}" not found`);
      }
      
      const location = data[0];
      return {
        name: location.state 
          ? `${location.name}, ${location.state}, ${location.country}`
          : `${location.name}, ${location.country}`,
        latitude: location.lat,
        longitude: location.lon,
        country: location.country,
        state: location.state,
      };
    } catch (error) {
      console.error('Error geocoding location:', error);
      throw error;
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<{
    name: string;
    country: string;
    state?: string;
  }> {
    const url = `${this.geocodeUrl}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`;
    
    try {
      const data = await this.makeRequest<GeocodeResponse[]>(url);
      
      if (!data || data.length === 0) {
        throw new Error('Unable to determine location name');
      }
      
      const location = data[0];
      return {
        name: location.state 
          ? `${location.name}, ${location.state}, ${location.country}`
          : `${location.name}, ${location.country}`,
        country: location.country,
        state: location.state,
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    }
  }

  // Clean up old cache entries
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.requestCache.delete(key);
      }
    }
  }
}