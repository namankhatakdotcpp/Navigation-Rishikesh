# 🌍 Rishikesh Travel Guide

A modern, frontend-focused tourism web application inspired by Uttarakhand Tourism.
This project showcases real-world UI/UX design, API integration, and interactive features like maps, weather, and dynamic pricing.

---

## 🚀 Features

### 🏠 Core Pages

* Home (Hero + Highlights + Weather + Map)
* Book Homestay
* Explore
* Experience (with categories)
* What To Do
* Pricing
* Gallery

---

### 🌦️ Weather Integration

* Live weather data using **Weatherstack API**
* Displays:

  * Temperature
  * Weather description
  * Humidity
  * Wind speed
* Animated weather UI (Skycons)

---

### 🗺️ Maps & Navigation (100% Free)

* Built using **Leaflet.js + OpenStreetMap**
* Features:

  * Location search
  * Marker updates
  * User location detection
  * Route directions (via Leaflet Routing Machine)

---

### 📅 Dynamic Pricing Calendar (Key Feature 🔥)

* Interactive calendar UI
* Select activity:

  * River Rafting
  * Bungee Jumping
* Click any date → shows **price range**
* Designed as a base for:

  * Dynamic pricing systems
  * Travel planning tools

---

### 💰 Pricing Table

* Clean UI for activities:

  * Duration
  * Inclusions
  * Price

---

### 🎨 UI/UX Highlights

* Modern dark-themed design
* Responsive layout (Grid + Flexbox)
* Smooth animations & hover effects
* Card-based components

---

## 🧱 Tech Stack

### Frontend

* HTML5
* CSS3 (Flexbox + Grid)
* JavaScript (Vanilla)

### APIs & Libraries

* Weatherstack API
* Leaflet.js (Maps)
* OpenStreetMap
* Leaflet Routing Machine
* Skycons (weather animation)

---

## 📁 Project Structure

```
/project
│
├── index.html
├── pricing.html
├── gallery.html
├── explore.html
├── experience.html
├── whattodo.html
├── homestay.html
│
├── /css
│   ├── styles.css
│
├── /js
│   ├── home.js
│   ├── config.js
│
├── /assets
│   ├── images/
│
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/rishikesh-travel-guide.git
cd rishikesh-travel-guide
```

---

### 2️⃣ Add Weather API Key

Open:

```
js/config.js
```

Add your Weatherstack key:

```js
const CONFIG = {
  WEATHERSTACK_API_KEY: "YOUR_API_KEY"
};
```

---

### 3️⃣ Run the Project

You can open directly:

```bash
index.html
```

OR use a local server:

```bash
npx live-server
```

---

## ⚠️ Important Notes

* Weatherstack free plan uses **HTTP (not HTTPS)**
* Maps use **Leaflet (no API key required)**
* `.env` is not used in static frontend (config.js is used instead)

---

## 🧠 Future Enhancements

* 🔐 User authentication
* 📦 Booking system
* 💳 Payment integration
* 📊 Dynamic pricing via backend
* 📍 Live availability tracking
* 📱 PWA (mobile app support)

---

## 💡 Inspiration

Inspired by:

* Uttarakhand Tourism Website
* Modern travel platforms like Airbnb

---

## 👨‍💻 Author

**Naman**
Frontend Developer | Building real-world projects 🚀

---

## ⭐ Contribute / Feedback

Feel free to fork, improve, or suggest features!

---

## 📜 License

This project is open-source and available under the MIT License.
