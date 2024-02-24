var QueueState;
(function (QueueState) {
    QueueState["Idle"] = "IDLE";
    QueueState["Processing"] = "PROCESSING";
})(QueueState || (QueueState = {}));
export class Queue {
    tasks;
    state;
    constructor() {
        this.tasks = new Map();
        this.state = QueueState.Idle;
    }
    get length() {
        return this.tasks.size;
    }
    async process() {
        while (this.length > 0) {
            const taskId = this.tasks.keys().next().value;
            const task = this.tasks.get(taskId);
            if (task) {
                try {
                    await task.execute();
                }
                catch (error) {
                    console.error("Error executing task with ID:", task.id, error);
                }
            }
            this.tasks.delete(taskId);
        }
        this.state = QueueState.Idle;
    }
    enqueue(task) {
        this.tasks.set(task.id, task);
        if (this.state !== QueueState.Processing) {
            this.state = QueueState.Processing;
            this.process();
        }
        return task.id;
    }
    find(taskId) {
        return this.tasks.get(taskId);
    }
    findPosition(taskId) {
        const taskIds = Array.from(this.tasks.keys());
        return taskIds.indexOf(taskId);
    }
}
