const fs = require("fs");
const path = require("path");

class TaskStorage {
  constructor(filePath) {
    this.filePath = filePath;
    this.ensureStore();
    this.data = this.load();
  }

  ensureStore() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      const initial = { users: {} };
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2), "utf-8");
    }
  }

  load() {
    const raw = fs.readFileSync(this.filePath, "utf-8");
    try {
      return JSON.parse(raw);
    } catch (error) {
      const fallback = { users: {} };
      fs.writeFileSync(this.filePath, JSON.stringify(fallback, null, 2), "utf-8");
      return fallback;
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getUserRecord(userId) {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        tasks: [],
        lastSummary: null
      };
    }
    return this.data.users[userId];
  }

  addTask(userId, task) {
    const user = this.getUserRecord(userId);
    const taskWithId = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: "pending",
      createdAt: new Date().toISOString(),
      ...task
    };
    user.tasks.push(taskWithId);
    this.save();
    return taskWithId;
  }

  listTasks(userId) {
    const user = this.getUserRecord(userId);
    return user.tasks;
  }

  completeTask(userId, matcher) {
    const user = this.getUserRecord(userId);
    const tasks = user.tasks;
    if (tasks.length === 0) {
      return null;
    }

    let index = -1;
    if (typeof matcher === "number" && matcher >= 0 && matcher < tasks.length) {
      index = matcher;
    } else if (typeof matcher === "string") {
      index = tasks.findIndex((task) =>
        task.title.toLowerCase().includes(matcher.toLowerCase())
      );
    }

    if (index === -1) {
      return null;
    }

    tasks[index].status = "done";
    tasks[index].completedAt = new Date().toISOString();
    this.save();
    return tasks[index];
  }

  clearCompleted(userId) {
    const user = this.getUserRecord(userId);
    const before = user.tasks.length;
    user.tasks = user.tasks.filter((task) => task.status !== "done");
    const removed = before - user.tasks.length;
    this.save();
    return removed;
  }
}

module.exports = TaskStorage;
