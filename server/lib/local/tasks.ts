type Task = {
  name?: string;
  appEngineHttpRequest: {
    body: string;
    headers: {[key: string]: string};
    httpMethod: string;
    relativeUri: string;
  };
  scheduleTime: {seconds: number};
};

export default class LocalTasks {
  queuePath(project: string, location: string, queue: string): string {
    return `${project}-${location}-${queue}`;
  }

  async createTask({parent, task}: {parent: string; task: Task}): Promise<[Task]> {
    console.log(`📝 Creating task for ${parent}:`);
    task.name = Math.floor(Math.random() * 10 ** 12).toString();
    console.log(`${JSON.stringify(task)}`);
    console.log(`${Buffer.from(task.appEngineHttpRequest.body, 'base64').toString()}`);
    fetch(`http://localhost:8080${task.appEngineHttpRequest.relativeUri}`, {
      headers: {
        ...task.appEngineHttpRequest.headers,
        'x-appengine-queuename': parent,
        'x-appengine-taskname': task.name,
      },
      method: task.appEngineHttpRequest.httpMethod,
      body: Buffer.from(task.appEngineHttpRequest.body, 'base64').toString(),
    });
    return [task];
  }
}
