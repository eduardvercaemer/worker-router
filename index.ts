import {Router} from "itty-router";

const HANDLER = Symbol("HANDLER");

export type Method =
  | "all"
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head";

export interface Env {
}

export interface Handler {
  (core: Core): any;

  readonly method: Method;
  readonly path: string;
  readonly [HANDLER]: true;
}

export abstract class Controller {
  handler(
    method: Method,
    path: string,
    cb: (core: Core) => any,
  ): Handler {
    const handler = <Handler>(<any>cb);
    Object.defineProperty(handler, HANDLER, {value: true});
    Object.defineProperty(handler, "method", {value: method});
    Object.defineProperty(handler, "path", {value: path});
    return Object.freeze(handler);
  }

  getHandlers(): Handler[] {
    return Object.getOwnPropertyNames(this)
      .map((name) => (<any>this)[name])
      .filter((handler) => handler[HANDLER]);
  }
}


export class Core {
  public readonly method: string;
  public readonly url: string;
  public readonly params!: Record<string, string | undefined>;
  public readonly query!: Record<string, string[] | string | undefined>;

  constructor(
    public readonly request: Request,
    public readonly env: Env,
    public readonly executionContext: ExecutionContext,
    public readonly controllers: Array<new (core: Core) => Controller>,
  ) {
    this.method = this.request.method;
    this.url = this.request.url;
  }

  public async handle(): Promise<Response> {
    const app = Router<Core>();

    for (const Controller of this.controllers) {
      const controller = new Controller(this);
      const handlers = controller.getHandlers();
      for (const handler of handlers) {
        app[handler.method](handler.path, handler);
      }
    }

    return app
      .handle(this)
      .then(this.then.bind(this))
      .catch(this.catch.bind(this))
      .finally(this.finally.bind(this));
  }

  private then(response: unknown): Response {
    return Response.json(response);
  }

  private catch(error: unknown): Response {
    console.debug(error);
    const message = error instanceof Error ? error.message : "Unknown Error";
    return new Response(message, {status: 500});
  }

  private finally(): void {
  }
}

