# from pydantic import BaseModel, Field
# from datetime import date

# class expenseRequest(BaseModel):
#     amount: float = Field(gt=0)
#     category: str = Field(min_length=2, max_length=50)
#     date: date

#     model_config = {
#         "json_schema_extra" : {
#             "example": {
#                 "amount": 1.0,
#                 "category": "string",
#                 "date": "2026-10-03"
#                 }
#         }
#     }

from datetime import date
from pydantic import BaseModel, Field, ConfigDict


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: str = Field(min_length=2, max_length=50)
    date: date


class ExpenseUpdate(BaseModel):
    amount: float = Field(gt=0)
    category: str = Field(min_length=2, max_length=50)


class ExpenseResponse(BaseModel):
    id: int
    amount: float
    category: str
    date: date

    model_config = ConfigDict(from_attributes=True)