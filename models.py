# from database import Base
# from sqlalchemy import Column , Integer, String , Date

# class expenses(Base):
#     __tablename__ = 'ExpensesList'

#     id = Column(Integer, primary_key = True, index = True)
#     amount = Column(Integer)
#     category = Column(String)
#     date = Column(date)


from database import Base
from sqlalchemy import Column, Integer, String, Float, Date


class Expense(Base):
    __tablename__ = "ExpensesList"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    date = Column(Date, nullable=False)