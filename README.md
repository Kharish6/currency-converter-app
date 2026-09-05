# CurrencyFlow — Currency Converter

A simple, modern currency converter built with **Node.js, Express.js, HTML, CSS, and JavaScript**.

The application retrieves the latest available exchange rates from the **Frankfurter API** and performs currency conversions without requiring a database, authentication, or user accounts.

## Features

- Convert between multiple currencies
- Supports all currencies provided by the Frankfurter API
- Latest available exchange rates
- Supports large amounts such as:
  - `20,000,000 INR`
  - `2 crore INR`
- Currency search
- Currency swap functionality
- Manual rate refresh
- Responsive and modern UI
- REST API backend
- Docker support
- No database required
- No authentication required
- Decimal-based calculations for accurate conversion

## Tech Stack

### Backend
- Node.js
- Express.js
- Decimal.js

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

### External API
- Frankfurter API

### DevOps
- Docker
- Dockerfile
- `.dockerignore`

## Project Structure

```text
currency-converter/
│
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── .dockerignore
├── .gitignore
├── Dockerfile
├── package.json
├── package-lock.json
└── server.js