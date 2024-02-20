import express, {NextFunction, Request, Response} from 'express';
import {tasks, queuePath} from './environment';

type Content = {
  [key: string]: any;
};

export default class Tasks {
  static async enqueue(endpoint: string, content: Content, scheduleTime: number = Date.now()) {
    const task = {
      appEngineHttpRequest: {
        body: Buffer.from(JSON.stringify(content)).toString('base64'),
        headers: {'Content-Type': 'text/plain'},
        httpMethod: 'POST' as const,
        relativeUri: endpoint,
      },
      scheduleTime: {seconds: scheduleTime / 1000},
    };
    const [response] = await tasks.createTask({parent: queuePath, task: task});
    return response.name;
  }
}

export const taskHandlerMiddleware = [
  express.text(),
  (request: Request, response: Response, next: NextFunction) => {
    if (!request.headers['x-appengine-queuename'] || !request.headers['x-appengine-taskname']) {
      response.status(404).send();
      return;
    }
    console.log(`Running task ${request.headers['x-appengine-queuename']}/${request.headers['x-appengine-taskname']}`);
    request.body = JSON.parse(request.body);
    next();
  },
];
