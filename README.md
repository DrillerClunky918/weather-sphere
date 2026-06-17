# WeatherSphere 🌍💨

WeatherSphere is a straightforward, lightweight web application for monitoring air quality. It fetches and processes environmental data directly in your browser, providing real-time air conditions without tracking your personal data or requiring an account.

🔗 **Live Demo:** [https://owl-drinking-acre.codeberg.page/weather-sphere/#/](https://owl-drinking-acre.codeberg.page/weather-sphere/#/)

---

## 🚀 Key Features

### 1. **Your Air Profile**
* **Instant Current Readings:** View up-to-the-minute levels for major air pollutants based on your current location.
* **Past 24-Hour Average:** Easily switch between live data and a 24-hour average to see how your air quality has trended over the last day.
* **Interactive Timelines:** Detailed, hoverable graphs that track pollution spikes and dips over a multi-day timeline.

### 2. **Live Global Search**
* **Worldwide Coverage:** Look up any city across the globe (e.g., London, Tokyo, Seoul) using the integrated Open-Meteo API.
* **Clear Health Warnings:** The app automatically compares results against safety guidelines to give you instant health advice (such as marking air quality as **POOR** and advising you to wear a mask or limit outdoor time).

### 3. **Curated Station List**
* A quick-access grid on the dashboard featuring 10 major global cities (including New York, Paris, Sydney, Tokyo, Cairo, São Paulo, and Mumbai) for instant cross-continental comparison.

---

## 📊 Monitored Pollutants & Thresholds

The application tracks metrics aligned with World Health Organization (WHO) air quality guidelines using concentration units of **µg/m³**:

| Pollutant | Full Name | Common Sources & Description |
| :--- | :--- | :--- |
| **PM 2.5** | Fine Particulate Matter | Tiny fragments from smoke, vehicle exhaust, and industrial emissions that can penetrate deep into the lungs. |
| **PM 10** | Coarse Particulate Matter | Larger particles like road dust, soot, pollen, and mold. |
| **NO₂** | Nitrogen Dioxide | A gas heavily linked to traffic congestion and fossil-fuel burning vehicles. |
| **O₃** | Ozone | A secondary pollutant created by chemical reactions in the atmosphere. |
| **SO₂** | Sulfur Dioxide | A pungent gas produced by heavy industrial processes and power generation plants. |
| **CO** | Carbon Monoxide | An odorless gas caused by incomplete fuel combustion, common in heavy, idling traffic. |

---

## 🛠️ How It Works & Tech Stack

WeatherSphere runs entirely on the **client side** (directly inside your internet browser). 

* **Data Aggregation:** The app requests public metrics based on precise latitude and longitude coordinates.
* **Primary API:** Powered by the [Open-Meteo API](https://open-meteo.com/), which combines national meteorological records with public satellite models.
* **Privacy Focused:** Because everything happens directly in your browser, the app works independently without needing a dedicated database, user logins, or data tracking servers.

---

## 💻 Running the App Locally

Follow these quick steps to get a local copy of the project up and running on your machine:

# 1. Clone the repository
git clone https://codeberg.org/your-username/weather-sphere.git
cd weather-sphere

# 2. Install the required packages
npm install

# 3. Run the application using Vite
npx vite