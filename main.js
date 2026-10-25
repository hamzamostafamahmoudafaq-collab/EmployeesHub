
const API_URL = window.location.origin;

const cards = document.querySelector("#employee-cards");
const totalEmployees = document.querySelector("#total-employees");

const employeeForm = document.querySelector("#employee-form");
const employeeName = document.querySelector("#employee-name");
const employeeAge = document.querySelector("#employee-age");

const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit");

const formMessage = document.querySelector("#form-message");
const listMessage = document.querySelector("#list-message");

const searchForm = document.querySelector("#search-form");
const searchName = document.querySelector("#search-name");

let editingEmployeeId = null;
let currentSearch = "";


async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, options);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.detail || data.message || "Something went wrong."
        );
    }

    return data;
}


function showFormMessage(message, type = "success") {
    formMessage.textContent = message;
    formMessage.className = `message ${type}`;
}


function showListMessage(message, type = "success") {
    listMessage.textContent = message;
    listMessage.className = `message ${type}`;
}


function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}


// Create an employee card safely
function createEmployeeCard(employee) {
    const card = createElement("article", "card");

    const cardTop = createElement("div", "card-top");

    const employeeIcon = createElement("div", "employee-icon", "👤");

    const idLabel = createElement(
        "span",
        "employee-id",
        `ID #${employee.id}`
    );

    cardTop.append(employeeIcon, idLabel);

    const name = createElement("h3", "employee-name", employee.name);

    const age = createElement(
        "p",
        "employee-age",
        `Age: ${employee.age}`
    );

    const divider = createElement("div", "card-divider");

    const actions = createElement("div", "card-actions");

    const editButton = createElement("button", "edit-button", "Edit");
    editButton.type = "button";

    editButton.addEventListener("click", () => {
        startEditing(employee);
    });

    const deleteButton = createElement(
        "button",
        "delete-button",
        "Delete"
    );

    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
        deleteEmployee(employee.id, employee.name);
    });

    actions.append(editButton, deleteButton);

    card.append(cardTop, name, age, divider, actions);

    return card;
}


// Display employees
function renderEmployees(employees) {
    totalEmployees.textContent = employees.length;
    cards.replaceChildren();

    if (employees.length === 0) {
        const empty = createElement(
            "div",
            "empty-state",
            currentSearch
                ? "No employees match your search."
                : "No employees found. Add your first employee!"
        );

        cards.appendChild(empty);
        return;
    }

    employees.forEach((employee) => {
        cards.appendChild(createEmployeeCard(employee));
    });
}


// Get all employees or search results
async function allEmployees() {
    try {
        cards.replaceChildren(
            createElement("p", "empty-state", "Loading employees...")
        );

        const path = currentSearch
            ? `/employees/search?name=${encodeURIComponent(currentSearch)}`
            : "/employees";

        const employees = await apiRequest(path);

        renderEmployees(employees);

        showListMessage(
            currentSearch
                ? `Found ${employees.length} matching employee(s).`
                : `Loaded ${employees.length} employee(s).`
        );
    } catch (error) {
        console.error("Error loading employees:", error);

        cards.replaceChildren(
            createElement(
                "p",
                "empty-state error",
                "Could not load employees. Check the server."
            )
        );

        showListMessage(error.message, "error");
    }
}


// Add a new employee or save edits
employeeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = employeeName.value.trim();
    const age = Number(employeeAge.value);

    if (!name || name.length > 100) {
        showFormMessage("Please enter a valid employee name.", "error");
        return;
    }

    if (!Number.isInteger(age) || age < 1 || age > 120) {
        showFormMessage(
            "Age must be a whole number between 1 and 120.",
            "error"
        );
        return;
    }

    const isEditing = editingEmployeeId !== null;

    const path = isEditing
        ? `/employees/${editingEmployeeId}`
        : "/employees";

    const method = isEditing ? "PUT" : "POST";

    submitButton.disabled = true;
    submitButton.textContent = isEditing ? "Saving..." : "Adding...";

    try {
        const query = new URLSearchParams({
            name: name,
            age: String(age)
        });

        await apiRequest(`${path}?${query.toString()}`, {
            method: method
        });

        showFormMessage(
            isEditing
                ? "Employee updated successfully!"
                : "Employee added successfully!"
        );

        resetEmployeeForm();

        currentSearch = "";
        searchName.value = "";

        await allEmployees();

        document.querySelector("#employees").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        console.error("Error saving employee:", error);

        showFormMessage(
            error.message || "Could not save employee. Check the server.",
            "error"
        );
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = editingEmployeeId !== null
            ? "Save Changes"
            : "Add Employee";
    }
});


// Start editing an employee
function startEditing(employee) {
    editingEmployeeId = employee.id;

    employeeName.value = employee.name;
    employeeAge.value = employee.age;

    formTitle.textContent = "Edit Employee";
    submitButton.textContent = "Save Changes";

    cancelEditButton.hidden = false;

    showFormMessage(`Editing employee #${employee.id}.`);

    document.querySelector("#add-employee").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    employeeName.focus();
}


// Reset the form
function resetEmployeeForm() {
    employeeForm.reset();

    editingEmployeeId = null;

    formTitle.textContent = "Add New Employee";
    submitButton.textContent = "Add Employee";

    cancelEditButton.hidden = true;
}


// Cancel editing
cancelEditButton.addEventListener("click", () => {
    resetEmployeeForm();
    showFormMessage("Editing cancelled.");
});


// Delete an employee
async function deleteEmployee(id, name) {
    const confirmed = confirm(
        `Are you sure you want to delete ${name}?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(`/employees/${id}`, {
            method: "DELETE"
        });

        showListMessage("Employee deleted successfully.");

        if (editingEmployeeId === id) {
            resetEmployeeForm();
        }

        await allEmployees();
    } catch (error) {
        console.error("Error deleting employee:", error);

        showListMessage(
            error.message || "Could not delete employee.",
            "error"
        );
    }
}


// Search employees by name
searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    currentSearch = searchName.value.trim();
    await allEmployees();
});


// Clear search and display everyone
document.querySelector("#clear-search").addEventListener("click", async () => {
    searchName.value = "";
    currentSearch = "";

    await allEmployees();
});


// Refresh employees
document.querySelector("#refresh-button").addEventListener("click", async () => {
    await allEmployees();
});


// Load employees when the page opens
allEmployees();
