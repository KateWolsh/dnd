// TODO: write code here

function dragStart(event, fromColumn, index) {
  event.target.classList.add("dragging");
  event.dataTransfer.setData("fromColumn", fromColumn);
  event.dataTransfer.setData("index", index);
}

function dragEnd(event, fromColumn, index) {
  event.target.classList.remove("dragging");
}

class TaskDB {
  // {collectionName} - column identifier, for example 'todos'
  constructor(collectionName) {
    // private property
    this._collectionName = collectionName;
    // An array of tasks - [{id: ..., text: 'To do 1'}]
    this.collection = this._getTasks() || [];
  }

  // Adding new task to collection and saving
  addTask(text) {
    const task = { id: performance.now().toString(), text };
    this.collection.push(task);
    this._saveTasks(this.collection);
    return task;
  }

  // inserting task to a specific position and saving
  insertTask(task, index) {
    this.collection = [
      ...this.collection.slice(0, index),
      task,
      ...this.collection.slice(index),
    ];
    this._saveTasks(this.collection);
  }

  // removing task and saving
  removeTask(id) {
    const task = this.collection.find((task) => task.id === id);
    if (!task) {
      console.log("No such task is found");
    }
    this.collection = this.collection.filter((task) => task.id !== id);
    this._saveTasks(this.collection);
  }

  // retrieve from local storage and parse from the string
  _getTasks() {
    return JSON.parse(localStorage.getItem(this._collectionName));
  }

  // save to local storage in a format of a string
  _saveTasks(collection) {
    if (collection) {
      localStorage.setItem(this._collectionName, JSON.stringify(collection));
    }
  }
}

class TaskColumnRelation {
  constructor(columnId /*string*/, db /*TaskDB*/) {
    this.columnId = columnId;
    this.column = document.getElementById(columnId);
    this.db = db;
  }

  removeTask(task /*Node*/) {
    const id = task.getAttribute("id");
    this.db.removeTask(id);
    task.remove();
  }

  handleTaskCreation(addFormElement /*Node*/) {
    const taskInput = addFormElement.querySelector(".task-input");
    const newTask = taskInput.value;
    if (newTask) {
      const task = this.db.addTask(newTask);
      taskInput.value = "";
      this.column
        .querySelector(".task-list ul") // Element index will be collection.length - 1
        .appendChild(
          this.createTaskElement(task, this.db.collection.length - 1)
        );
    }
  }

  createTaskElement(task /*{id, text}*/, index) {
    const taskElem = document.createElement("li");
    taskElem.classList.add("task-wrapper");
    taskElem.setAttribute("id", task.id);
    taskElem.setAttribute("data-column", this.columnId);
    taskElem.innerHTML = `
        <span class="text">${task.text}</span>
        <button class="delete">X</button>
      `;
    taskElem.draggable = true;
    taskElem.ondragstart = (event) => {
      event.target.classList.add("dragging");
      event.dataTransfer.setData("fromColumn", this.columnId);
      event.dataTransfer.setData("id", task.id);
    };
    taskElem.ondragend = (event) => {
      event.target.classList.remove("dragging");
    };
    return taskElem;
  }

  createColumnTasks() {
    const list = document.createElement("ul");
    this.db.collection.forEach((task, index) => {
      list.appendChild(this.createTaskElement(task, index));
    });
    return list;
  }
}

const collectionNames = {
  todos: "todos",
  inProgress: "inProgress",
  dones: "Dones",
};

const tasksColumns = [
  new TaskColumnRelation("todos", new TaskDB(collectionNames.todos)),
  new TaskColumnRelation("inProgress", new TaskDB(collectionNames.inProgress)),
  new TaskColumnRelation("dones", new TaskDB(collectionNames.dones)),
];

class App {
  init() {
    tasksColumns.forEach((taskColumn) => {
      const columnContent = taskColumn.column.querySelector(".container");

      const listContainer = this.initialListRender(taskColumn, columnContent);
      const addFormElements = this.initAddTaskBlock(taskColumn);
      columnContent.append(listContainer, ...addFormElements);

      this.addListeners(taskColumn, columnContent);
      taskColumn.column.ondragover = (event) => {
        allowDrop(event, taskColumn.columnId);
      };
      taskColumn.column.ondrop = (event) => {
        drop(event, taskColumn.columnId);
      };
    });
  }

  addListeners(taskColumn, container) {
    container.addEventListener("click", (e) => {
      if (e.target.className === "delete") {
        taskColumn.removeTask(e.target.parentNode);
      }
      if (e.target.className === "add-task") {
        taskColumn.handleTaskCreation(e.target.parentNode);
      }
    });
  }

  initialListRender(taskColumn, columnContent) {
    const listContainer = document.createElement("div");
    listContainer.classList.add("task-list");
    const list = taskColumn.createColumnTasks();
    listContainer.appendChild(list);
    return listContainer;
  }

  initAddTaskBlock(taskColumn) {
    const addElement = document.createElement("div");
    addElement.innerHTML = `<button class="open-add-task">Add another card</button>`;

    const addFormElement = this.createAddTaskForm();
    // Hide task creation form by default
    addFormElement.classList.add("hidden");

    // Show task creation form on add button click and hide add button
    addElement.onclick = (e) => {
      addFormElement.classList.remove("hidden");
      addElement.classList.add("hidden");
    };

    // Show add button on 'task creation form' add or close buttons click and hide 'task creation form'
    addFormElement.onclick = (e) => {
      const className = e.target.className;
      if (className === "add-task" || className === "close") {
        addElement.classList.remove("hidden");
        addFormElement.classList.add("hidden");
      }
    };

    return [addElement, addFormElement];
  }

  createAddTaskForm() {
    const addElement = document.createElement("div");
    addElement.classList.add("add-task-form");
    addElement.innerHTML = `
      <input class="task-input" />
      <button class="add-task">Add</button>
      <button class="close">X</button>
      `;
    return addElement;
  }
}

function allowDrop(event, id) {
  event.preventDefault();

  const container = document.querySelector(`#${id} ul`);
  const afterElement = getDragAfterElement(container, event.clientY);
  const draggable = document.querySelector(".dragging");
  if (afterElement == null) {
    container.appendChild(draggable);
  } else {
    container.insertBefore(draggable, afterElement);
  }

  // console.log('draggable', document.getElementsByClassName('dragging-over'))
}

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".task-wrapper:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function drop(event, toColumn) {
  event.preventDefault();
  const container = document.querySelector(`#${toColumn} ul`);
  const insertBefore = getDragAfterElement(container, event.clientY);

  const id = event.dataTransfer.getData("id");
  const taskElem = document.getElementById(id);
  const fromColumn = taskElem.getAttribute("data-column");
  const taskColumnFrom = tasksColumns.find(
    (col) => col.columnId === fromColumn
  );

  const index = taskColumnFrom.db.collection.findIndex((el) => el.id === id);

  // Find selected column's storage

  const taskColumnTo = tasksColumns.find((col) => col.columnId === toColumn);

  let newIndex;
  if (insertBefore) {
    newIndex = taskColumnTo.db.collection.findIndex(
      (el) => el.id === insertBefore.getAttribute("id")
    );
  }
  // Swap the task between two columns
  console.log(index, taskColumnFrom.db.collection);
  const task = taskColumnFrom.db.collection[index];
  taskColumnFrom.db.removeTask(task.id);
  taskColumnTo.db.insertTask(
    task,
    newIndex !== undefined ? newIndex : taskColumnTo.db.collection.length
  );
  taskElem.setAttribute("data-column", toColumn);
}

const app = new App();
app.init();
// comment this to pass build
// const unusedVariable = "variable";

// // for demonstration purpose only
// export default function demo(value) {
//   return `Demo: ${value}`;
// }

// console.log("app.js included");
