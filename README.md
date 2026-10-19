# WeatherSphere 🌍

WeatherSphere is a client-facing TypeScript platform designed to aggregate, and analyze, and air quality data. The application sits directly on top of four environmental telemetry engines—Open-Meteo, WAQI, OpenWeather, and WeatherAPI—to track data discrepancies and monitor global reporting accuracy.

In the real world, air quality datasets frequently suffer from station downtime, inconsistent scheduling, or structural reporting errors. WeatherSphere attempts to solve this data contamination problem by continuously monitoring criteria air pollutants and fine particulates, cross-referencing multi-source streams to isolate mathematical anomalies and establish an objective, outlier-trimmed atmospheric consensus.

## System Architecture & Features

- **Global Station Analytics Grid**: A curated, high-integrity monitoring grid tracking international hub stations across five continents.
- **Your Air Profile**: A hyper-localized, client-side dashboard that uses browser-level geocoding vectors to pinpoint the user's macro-location. It maps out a comprehensive 6-point criteria pollutant framework ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{O}_3$, $\text{SO}_2$, $\text{CO}$) with views between instant current readings and automated 24-hour arithmetic averages.
- **Interactive Trend Visualizations**: A high-density timeline tracking 7-day historical curves via Chart.js. The visualization layers feature an intersecting crosshair hover matrix for rapid data inspections and explicit null-state mapping to expose when specific API providers go dark.
- **Decoupled Client-Side Performance**: Engineered to scale cleanly by shifting heavy on-demand city queries and timeline parsing entirely to the user's browser, keeping the core database architecture fast and stable.