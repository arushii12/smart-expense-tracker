# 💸 Smart Expense Tracker

A full-stack web application to track daily expenses, analyze spending patterns, manage budgets, and visualize financial trends.

Built to help users **track → analyze → save smarter**.

---

## 🚀 Features

* Add, view and categorize expenses
* Monthly spending trend chart
* Category-wise breakdown (Pie & Bar charts)
* Budget management system
* Spending insights & analytics
* Expense history tracking
* Clean dashboard UI
* Dark mode toggle
* Responsive design

---

## 🧠 Problem It Solves

Most people don’t know where their money goes every month. This app helps users understand spending habits, identify top expense categories, stay within budget, and make data-driven financial decisions.

---

## 🛠 Tech Stack

**Frontend:** HTML, CSS, JavaScript, Chart.js
**Backend:** Node.js, Express.js
**Database:** MongoDB Atlas
**Other Tools:** Git, GitHub, REST APIs, MVC Architecture

---

## 📊 Data Visualizations

* Monthly Spending Trend – Line chart
* Category Breakdown – Bar chart
* Expense Distribution – Pie chart

---

## 🏗 Project Structure

```
smart-expense-tracker
│
├── frontend        → UI (HTML, CSS, JS)
├── backend
│   ├── models      → Database schemas
│   ├── routes      → API endpoints
│   └── server.js   → Express server
└── .gitignore
```

---

## 🔌 API Endpoints

| Method | Route     | Description           |
| ------ | --------- | --------------------- |
| POST   | /expenses | Add new expense       |
| GET    | /expenses | Fetch all expenses    |
| POST   | /budget   | Set monthly budget    |
| GET    | /forecast | Get spending forecast |

---

## 💡 Key Learning Outcomes

* Building full-stack applications
* Connecting frontend with REST APIs
* Working with MongoDB Atlas
* Data visualization using charts
* Managing Git repositories professionally

---

## 🔐 Environment Variables

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

---

## ▶️ Run Locally

1. Clone the repository
2. Install dependencies using `npm install`
3. Start server using `node server.js`

---

## 🌟 Future Improvements

* User authentication
* Export expense reports (PDF/CSV)
* AI-based spending prediction
* Mobile version

---
