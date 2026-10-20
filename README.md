# Expense Tracker

A full-stack Expense Tracker built with FastAPI, SQLAlchemy and SQLite, with an HTML/CSS/JavaScript frontend for managing expenses and tracking spending summaries.

## Features

- Add, view, update and delete expenses
- Filter expenses by category and date range
- Calculate monthly and yearly expense summaries
- View spending totals by category
- Validate request data using Pydantic
- Store expense records in SQLite using SQLAlchemy
- Auto-generated API documentation at `/docs`

## Tech Stack

| **Layer** | **Technology** |
|---|---|
| Backend | FastAPI |
| ORM | SQLAlchemy |
| Validation | Pydantic |
| Database | SQLite |
| Frontend | HTML, CSS, JavaScript |
| Server | Uvicorn |

## Project Structure

```text
expenses_project/
├── expenses.py      # FastAPI app and routes
├── database.py      # Database connection and sessions
├── models.py        # SQLAlchemy model
├── schema.py        # Pydantic schemas
├── index.html       # Frontend
├── style.css        # Frontend styling
├── app.js           # Frontend logic
└── README.md
```

## API Endpoints

| **Method** | **Endpoint** | **Description** |
|---|---|---|
| GET | `/expenses` | Retrieve all expenses |
| POST | `/expenses` | Create an expense |
| GET | `/expenses/{expense_id}` | Retrieve an expense by ID |
| PUT | `/expenses/{expense_id}` | Update an expense |
| DELETE | `/expenses/{expense_id}` | Delete an expense |
| GET | `/expenses/filter` | Filter expenses by category |
| GET | `/expenses/filterbydate` | Filter expenses by date range |
| GET | `/expenses/summary/monthly` | Get a monthly expense summary |
| GET | `/expenses/summary_by_category` | Get spending for a specific category |
| GET | `/expenses/summary_by_all_categories` | Get spending totals across categories |
| GET | `/expenses/summary_by_year` | Get a yearly expense summary |

Explore the available parameters, request formats and responses through the interactive API documentation at `/docs`.

## Example Request

Example `POST /expenses` body:

```json
{
  "amount": 250.50,
  "category": "Food",
  "date": "2026-10-05"
}
```

## Validation Rules

| **Field** | **Type** | **Rule** |
|---|---|---|
| `amount` | float | Greater than 0 |
| `category` | string | 2 to 50 characters |
| `date` | date | Valid date in `YYYY-MM-DD` format |

## Database Schema

Table: `ExpensesList`

| **Column** | **Type** | **Constraints** |
|---|---|---|
| `id` | INTEGER | Primary key, indexed |
| `amount` | FLOAT | NOT NULL |
| `category` | VARCHAR(50) | NOT NULL |
| `date` | DATE | NOT NULL |

