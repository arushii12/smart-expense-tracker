# Smart Expense Tracker

Smart Expense Tracker is a full-stack personal finance and household budgeting application. It helps users track expenses, manage monthly budgets, monitor savings, analyze spending habits, forecast future expenses, and generate monthly financial reports from a clean dashboard interface.

The application includes JWT-based authentication, MongoDB-backed user data, budget and expense workflows, spending insights, receipt OCR support, forecasting, and PDF report export.

## Key Features

### Dashboard
- Financial overview for the selected month
- Budget, expense, savings, and spending summaries
- Financial Score with status indicators
- Charts for monthly and category-level spending

### Expense Management
- Add, edit, and delete expenses
- Categorize expenses and mark needs vs wants
- Track expenses by day, date range, and month
- Upload receipt images for OCR-assisted expense entry

### Budget Planning
- Set monthly budgets
- Track budget utilization and remaining budget
- Review monthly budget allocations
- Detect overspending and budget risk

### Insights
- Financial Score calculation
- Spending pattern analysis
- Savings recommendations
- KPI-style dashboard metrics
- Category and trend insights

### Forecasting
- Month-end spending projection
- Average daily spending estimate
- Remaining budget forecast
- Risk level and forecast confidence indicators

### Reports
- Downloadable PDF financial reports
- Monthly spending summaries
- Budget, savings, insights, and forecast performance tracking

### User Profile
- Profile view and account details
- Name and email management
- Token-protected account access

## Technology Stack

### Frontend
- HTML
- CSS
- JavaScript
- Chart.js
- Lucide icons

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Mongoose

### Authentication
- JWT Authentication
- bcrypt password hashing

### Reports and OCR
- PDFKit
- Tesseract.js
- Multer

### Deployment
- Vercel
- MongoDB Atlas

## Project Workflow

```text
Budget Setup
|
v
Add Expenses
|
v
Track Spending
|
v
Analyze Insights
|
v
Review Forecast
|
v
Generate Reports
|
v
Improve Financial Score
```

## Financial Score

The Financial Score is calculated from several budgeting and spending signals:

- Budget Performance
- Savings Ratio
- Forecast Reliability
- Spending Consistency

Implemented score ranges:

| Score | Rating |
| --- | --- |
| 90-100 | Excellent |
| 80-89 | Very Good |
| 70-79 | Good |
| 60-69 | Fair |
| 40-59 | At Risk |
| 0-39 | Critical |

## Installation

Clone the repository:

```bash
git clone https://github.com/arushii12/smart-expense-tracker.git
cd smart-expense-tracker
```

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Configure the required environment variables, then start the development server:

```bash
npm start
```

Open the app:

```text
http://localhost:5000
```

## Environment Variables

| Variable | Description |
| --- | --- |
| `MONGO_URI` | MongoDB Atlas connection string. Required in production. |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens. Required. |
| `NODE_ENV` | Runtime environment, usually `development` or `production`. |
| `SERVE_FRONTEND` | Controls whether Express serves the static frontend. Defaults to `true`. |

Optional:

| Variable | Description |
| --- | --- |
| `CORS_ORIGIN` | Allowed frontend origin for split frontend/backend deployments. |
| `PORT` | Local server port. Do not set manually on Vercel. |

## Folder Structure

```text
smart-expense-tracker/
|-- api/              # Vercel serverless entry point
|-- frontend/         # Static UI: HTML, CSS, JavaScript and client config
|-- routes/           # Express routes for auth, expenses, budgets, insights, forecast, receipts, profile and reports
|-- models/           # Mongoose models for users, expenses, budgets and income
|-- middleware/       # JWT authentication middleware
|-- services/         # OCR and receipt parsing services
|-- uploads/          # Local receipt uploads for development
|-- db.js             # MongoDB connection and production database guard
|-- index.js          # Express application setup
`-- vercel.json       # Vercel routing configuration
```

## Deployment Notes

The project is configured for a single Vercel deployment where the static frontend and Express API share the same domain.

Production requires:

- `MONGO_URI`
- `JWT_SECRET`
- `NODE_ENV=production`
- `SERVE_FRONTEND=true`

MongoDB Atlas is required in all environments.

Receipt uploads use temporary serverless storage on Vercel. For persistent receipt image storage, integrate a durable service such as Cloudinary, S3, or Vercel Blob.

## Future Enhancements

- AI spending recommendations
- Goal-based savings tracking
- Multi-user family budgeting
- Recurring expense automation
- Mobile application

## Author

Developed by **Arushii** as a full-stack personal finance project focused on budgeting workflows, financial insights, forecasting, and production-ready deployment practices.
