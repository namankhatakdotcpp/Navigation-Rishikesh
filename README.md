# 🌄 Rishikesh Smart Travel Guide

A modern, AI-inspired travel web app that helps users plan trips to Rishikesh using **dynamic pricing insights, demand heatmaps, and smart recommendations**.

---

## 🚀 Features

### 🧠 Smart Travel Decision Engine

* AI-like pricing logic based on:

  * Weekends vs weekdays
  * Festivals & peak demand
  * Weather conditions
* Generates **fair price ranges** instead of static prices

---

### 🔥 Heatmap Calendar (Core Feature)

* Month-wise interactive calendar
* Color-coded demand:

  * 🟢 Low (cheaper days)
  * 🟡 Medium (balanced)
  * 🔴 High (peak demand)
* Click any date → view:

  * Price range
  * Demand score
  * Weather signal
  * Recommendations

---

### 📊 Pricing Intelligence

* Dynamic price ranges for:

  * River Rafting
  * Bungee Jumping
* Simulated real-world fluctuations

---

### 🧭 Trip Planner Logic

* Suggests best days based on:

  * Budget
  * Demand
  * Weather
* Helps users avoid overpriced days

---

### 🌦️ Weather Integration

* Integrated with Weatherstack API
* Shows:

  * Temperature
  * Conditions
  * Activity recommendation (e.g., “No rafting in rain”)

---

### 🗺️ Map + Directions (Planned / Optional)

* Location search
* Travel directions
* Nearby exploration

---

### 🖼️ Real Image Gallery (Local Assets)

* Uses **your own photos**, not stock images
* Folder-based structure:

```
assets/
  rafting/
  bungee/
  camping/
  lakshman-jhula/
  home/
```

* Features:

  * Lazy loading ⚡
  * Lightbox (click → fullscreen)
  * Category filters
  * Smooth hover animations

---

### 🎯 Vendor + Customer Value

#### 👤 For Customers:

* Transparent pricing
* Best time to visit insights
* Avoid overpaying

#### 🏢 For Vendors:

* Demand visibility
* Pricing optimization ideas
* Inventory awareness (simulated)

---

## 🧪 Fake ML Model Logic (Explainable AI)

This project simulates a pricing model using rule-based logic:

```
Price = Base Price
      + Weekend Surge
      + Festival Multiplier
      + Weather Adjustment
      + Demand Score
```

### Factors:

* 📅 Weekend → ↑ price
* 🎉 Festival → ↑↑ price
* 🌧️ Bad weather → ↓ or restricted activity
* 📈 Demand → dynamic adjustment

---

## 🛠️ Tech Stack

* HTML5
* CSS3 (Modern UI + Gradients)
* JavaScript (Vanilla)
* Weatherstack API
* Local Asset Management

---

## 📁 Project Structure

```
Rishikesh Website/
│
├── assets/              # All images (real photos)
├── css/
├── js/
│   ├── pricing.js
│   ├── pricingEngine.js
│   ├── gallery.js
│   ├── weatherEngine.js
│
├── index.html
├── pricing.html
├── gallery.html
├── whattodo.html
├── explore.html
```

---

## ⚙️ Setup

1. Clone repo / download files
2. Add your Weatherstack API key in:

```
config.js
```

3. Run locally:

```
Live Server / localhost
```

---

## ⚠️ Notes

* Pricing data is **AI-simulated (not real-time)**
* Slot availability is **indicative, not live**
* Map API can be added using free alternatives

---

## 🌟 Future Improvements

* Real ML pricing model
* Vendor dashboard
* Live booking integration
* User login + personalization
* Real-time inventory APIs

---

## 💡 Inspiration

Built to solve:

> “Tourists don’t know when prices are fair, and vendors struggle with demand visibility.”

---

## 👨‍💻 Author

Naman
B.Tech | Developer | Building smart travel systems 🚀

---

## ⭐ If you like this project

Give it a star ⭐ or use it as your portfolio project!
