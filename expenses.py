
from datetime import date

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

import models
from database import engine, SessionLocal
from schema import ExpenseCreate, ExpenseUpdate, ExpenseResponse


app = FastAPI(title="Expense Tracker API")


# CORS configuration for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables if they do not already exist
models.Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        # Provide the session to the endpoint
        yield db
    finally:
        # Always close the session after the request
        db.close()

# --------------------------------------------------
# 1. GET ALL EXPENSES
# --------------------------------------------------

@app.get("/expenses", response_model=list[ExpenseResponse])
def give_all_expense(db: Session = Depends(get_db)):
    return db.query(models.Expense).all()


# --------------------------------------------------
# 2. CREATE AN EXPENSE
# --------------------------------------------------

@app.post(
    "/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED
)
def add_expense(
    new_expense: ExpenseCreate,
    db: Session = Depends(get_db)
):
    expense_data = models.Expense(
        **new_expense.model_dump()
    )

    db.add(expense_data)
    db.commit()
    db.refresh(expense_data)

    return expense_data


# --------------------------------------------------
# 3. FILTER EXPENSES BY CATEGORY
# --------------------------------------------------

@app.get("/expenses/filter", response_model=list[ExpenseResponse])
def filter_by_category(
    category: str,
    db: Session = Depends(get_db)
):
    return db.query(models.Expense).filter(
        func.lower(models.Expense.category) == category.lower()
    ).all()


# --------------------------------------------------
# 4. FILTER EXPENSES BY DATE RANGE
# --------------------------------------------------

@app.get(
    "/expenses/filterbydate",
    response_model=list[ExpenseResponse]
)
def get_expense_by_date(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date"
        )

    return db.query(models.Expense).filter(
        models.Expense.date >= start_date,
        models.Expense.date <= end_date
    ).all()


# --------------------------------------------------
# 5. MONTHLY EXPENSE SUMMARY
# --------------------------------------------------

@app.get("/expenses/summary/monthly")
def monthly_expense_summary(
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )

    total_expense = db.query(
        func.coalesce(func.sum(models.Expense.amount), 0)
    ).filter(
        extract("year", models.Expense.date) == year,
        extract("month", models.Expense.date) == month
    ).scalar()

    return {
        "year": year,
        "month": month,
        "total_expense": total_expense
    }


# --------------------------------------------------
# 6. SUMMARY BY ONE CATEGORY
# --------------------------------------------------

@app.get("/expenses/summary_by_category")
def expense_summary_by_category(
    category: str,
    db: Session = Depends(get_db)
):
    total_expense = db.query(
        func.coalesce(func.sum(models.Expense.amount), 0)
    ).filter(
        func.lower(models.Expense.category) == category.lower()
    ).scalar()

    return {
        "category": category,
        "total_expense": total_expense
    }


# --------------------------------------------------
# 7. SUMMARY BY ALL CATEGORIES
# --------------------------------------------------

@app.get("/expenses/summary_by_all_categories")
def expense_summary_by_all_categories(
    db: Session = Depends(get_db)
):
    results = db.query(
        models.Expense.category,
        func.sum(models.Expense.amount).label("total_expense")
    ).group_by(
        models.Expense.category
    ).all()

    return {
        category: total
        for category, total in results
    }


# --------------------------------------------------
# 8. YEARLY SUMMARY BY MONTH
# --------------------------------------------------

@app.get("/expenses/summary_by_year")
def expense_summary_of_all_months(
    year: int,
    db: Session = Depends(get_db)
):
    results = db.query(
        extract("month", models.Expense.date).label("month"),
        func.sum(models.Expense.amount).label("total_expense")
    ).filter(
        extract("year", models.Expense.date) == year
    ).group_by(
        extract("month", models.Expense.date)
    ).order_by(
        extract("month", models.Expense.date)
    ).all()

    monthly_totals = {
        int(month): total
        for month, total in results
    }

    return {
        "year": year,
        "monthly_totals": monthly_totals
    }


# --------------------------------------------------
# 9. GET ONE EXPENSE BY ID
# --------------------------------------------------

@app.get(
    "/expenses/{expense_id}",
    response_model=ExpenseResponse
)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id
    ).first()

    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id {expense_id} not found"
        )

    return expense


# --------------------------------------------------
# 10. DELETE AN EXPENSE
# --------------------------------------------------

@app.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id
    ).first()

    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id {expense_id} not found"
        )

    db.delete(expense)
    db.commit()

    return {
        "message": "Expense deleted successfully",
        "id": expense_id
    }


# --------------------------------------------------
# 11. UPDATE AN EXPENSE
# --------------------------------------------------

@app.put(
    "/expenses/{expense_id}",
    response_model=ExpenseResponse
)
def update_expense(
    expense_id: int,
    updated_data: ExpenseUpdate,
    db: Session = Depends(get_db)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id
    ).first()

    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    expense.amount = updated_data.amount
    expense.category = updated_data.category

    db.commit()
    db.refresh(expense)

    return expense
