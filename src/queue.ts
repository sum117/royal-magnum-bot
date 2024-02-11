export interface Task {
  id: number | string;
  execute: () => Promise<void>;
}

enum QueueState {
  Idle = "IDLE",
  Processing = "PROCESSING",
}

export class Queue {
  private tasks: Map<number | string, Task>;
  private state: QueueState;

  constructor() {
    this.tasks = new Map();
    this.state = QueueState.Idle;
  }

  get length() {
    return this.tasks.size;
  }

  private async process() {
    while (this.length > 0) {
      const taskId = this.tasks.keys().next().value;
      const task = this.tasks.get(taskId);

      if (task) {
        try {
          await task.execute();
        } catch (error) {
          console.error("Error executing task with ID:", task.id, error);
        }
      }
      this.tasks.delete(taskId);
    }
    this.state = QueueState.Idle;
  }

  enqueue(task: Task) {
    this.tasks.set(task.id, task);
    if (this.state !== QueueState.Processing) {
      this.state = QueueState.Processing;
      this.process();
    }
    return task.id;
  }

  find(taskId: number | string) {
    return this.tasks.get(taskId);
  }

  findPosition(taskId: number | string): number {
    const taskIds = Array.from(this.tasks.keys());
    return taskIds.indexOf(taskId);
  }
}
