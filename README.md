# Smart Expense Tracker

Smart Expense Tracker is a full-stack personal finance app for tracking daily expenses, managing monthly budgets, forecasting spend, and generating AI-style spending insights.

The backend is a Node.js and Express API connected to MongoDB Atlas. The frontend is a static HTML, CSS, and JavaScript dashboard that can be served by the backend in production or hosted separately with a configurable API base URL.

## Features

- JWT authentication with signup, login, logout, and protected routes
- Expense CRUD for creating, reading, updating, and deleting expenses
- Daily and date-based expense history
- Monthly budget tracking with spent and remaining totals
- Category breakdown charts and monthly trend charts
- Forecast for projected month-end spending
- AI-style spending insights and savings recommendations
- PDF monthly report export
- Responsive dashboard with dark mode

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Node.js, Express.js
- Database: MongoDB Atlas with Mongoose
- Authentication: JSON Web Tokens, bcrypt
- Reports: PDFKit

## Project Structure

```text
smart-expense-tracker/
  frontend/
    index.html
    style.css
    script.js
    config.js
    config.example.js
  middleware/
    auth.js
  models/
    Budget.js
    Expense.js
    MonthlySummary.js
    User.js
  routes/
    auth.js
    budget.js
    expenses.js
    forecast.js
    report.js
  db.js
  index.js
  package.json
  .env.example
```

## Environment Variables

Create a `.env` file in the project root. Use `.env.example` as the template.

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/expenseTracker?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=
SERVE_FRONTEND=true
```

`MONGO_URI` should point to your MongoDB Atlas database.

`JWT_SECRET` should be a long, random value and must be kept private.

`CORS_ORIGIN` is optional. Set it when the frontend is hosted on a different domain, for example:

```env
CORS_ORIGIN=https://your-frontend-domain.com
```

`SERVE_FRONTEND` defaults to `true`. Set it to `false` if you want the backend to run as an API only.

## Frontend API Configuration

By default, `frontend/config.js` uses an empty `API_BASE_URL`, so the frontend calls the same origin that served it. This is ideal when Express serves the frontend in production.

For separate frontend and backend deployments, update `frontend/config.js` before deploying the frontend:

```js
window.SMART_EXPENSE_CONFIG = {
  API_BASE_URL: "https://your-backend-domain.com"
};
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from the example:

```bash
cp .env.example .env
```

3. Fill in `MONGO_URI` and `JWT_SECRET`.

4. Start the app:

```bash
npm start
```

5. Open the local app using the configured port:

```text
http://localhost:<PORT>
```

## Production Deployment

The backend can run independently with:

```bash
npm start
```

For a single-service deployment, keep `SERVE_FRONTEND=true`. Express will serve the static frontend from `frontend/` and expose the API routes from the same domain.

For split deployments:

- Deploy the backend with `SERVE_FRONTEND=false`.
- Deploy the `frontend/` directory to a static host.
- Set `frontend/config.js` to the deployed backend URL.
- Set `CORS_ORIGIN` on the backend to the frontend URL.

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/auth/signup` | Create a user account |
| POST | `/auth/login` | Log in and receive a JWT |
| GET | `/expenses` | Fetch authenticated user's expenses |
| POST | `/expenses` | Create an expense |
| PUT | `/expenses/:id` | Update an expense |
| DELETE | `/expenses/:id` | Delete an expense |
| GET | `/expenses/today` | Fetch today's expenses |
| GET | `/expenses/by-date?date=YYYY-MM-DD` | Fetch expenses by date |
| GET | `/expenses/monthly` | Fetch monthly summaries |
| GET | `/budget/current` | Fetch current budget and spend |
| POST | `/budget` | Set current monthly budget |
| GET | `/forecast` | Fetch spending forecast |
| GET | `/report/monthly` | Download monthly PDF report |
| GET | `/health` | Health check |

## Screenshots

Add screenshots here after deployment or local testing:

- Login and signup
- Dashboard overview
- Expense history
- Budget and forecast
- PDF export

## Live Demo

Live demo URL:

```text
Add your deployed frontend or full-stack URL here.
```

Backend health check:

```text
https://your-backend-domain.com/health
```
