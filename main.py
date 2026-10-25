
from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATABASE_PATH = BASE_DIR / "mydatabae.db"

app = FastAPI(title="EmployeeHub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://studenthub-1-b9rt.onrender.com",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/static",
    StaticFiles(directory=str(STATIC_DIR)),
    name="static",
)


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER NOT NULL CHECK(age >= 1)
            )
        """)


initialize_database()


def employee_to_dict(employee):
    return {
        "id": employee["id"],
        "name": employee["name"],
        "age": employee["age"],
    }


@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/employees")
def get_employees():
    with get_connection() as connection:
        employees = connection.execute(
            "SELECT id, name, age FROM employees ORDER BY id DESC"
        ).fetchall()

    return [employee_to_dict(employee) for employee in employees]


@app.get("/employees/search")
def search_employees(name: str):
    name = name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Please enter an employee name",
        )

    with get_connection() as connection:
        employees = connection.execute(
            """
            SELECT id, name, age
            FROM employees
            WHERE name LIKE ?
            ORDER BY id DESC
            """,
            (f"%{name}%",),
        ).fetchall()

    return [employee_to_dict(employee) for employee in employees]


@app.get("/employees/{employee_id}")
def get_employee(employee_id: int):
    with get_connection() as connection:
        employee = connection.execute(
            "SELECT id, name, age FROM employees WHERE id = ?",
            (employee_id,),
        ).fetchone()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    return employee_to_dict(employee)


@app.post("/employees", status_code=201)
def add_employee(name: str, age: int):
    name = name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Employee name is required",
        )

    if age < 1:
        raise HTTPException(
            status_code=400,
            detail="Age must be at least 1",
        )

    with get_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO employees (name, age) VALUES (?, ?)",
            (name, age),
        )

        employee_id = cursor.lastrowid

        employee = connection.execute(
            "SELECT id, name, age FROM employees WHERE id = ?",
            (employee_id,),
        ).fetchone()

    return {
        "message": "Employee added successfully",
        "employee": employee_to_dict(employee),
    }


@app.put("/employees/{employee_id}")
def update_employee(employee_id: int, name: str, age: int):
    name = name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Employee name is required",
        )

    if age < 1:
        raise HTTPException(
            status_code=400,
            detail="Age must be at least 1",
        )

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE employees
            SET name = ?, age = ?
            WHERE id = ?
            """,
            (name, age, employee_id),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Employee not found",
            )

        employee = connection.execute(
            "SELECT id, name, age FROM employees WHERE id = ?",
            (employee_id,),
        ).fetchone()

    return {
        "message": "Employee updated successfully",
        "employee": employee_to_dict(employee),
    }


@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM employees WHERE id = ?",
            (employee_id,),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Employee not found",
            )

    return {"message": "Employee deleted successfully"}