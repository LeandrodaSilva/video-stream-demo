import {Match, match, MatchFunction} from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";

export interface Handler<P> {
  (req: Request, params: P): Response | Promise<Response>;
}

export interface Route<P extends object> {
  path: string;
  handler: Handler<P>;
  method: string;
  match: MatchFunction<P>;
}

export default class Router {
  _routes: Route<any>[];

  constructor() {
    this.get = this.get.bind(this);
    this.routes = this.routes.bind(this);
    this._routes = [];
  }

  get<P extends object>(path: string, handler: Handler<P>) {
    this._routes.push({
      path,
      handler,
      method: "GET",
      match: match<P>(path, {
        decode: decodeURIComponent,
      })
    });
  }

  post<P extends object>(path: string, handler: Handler<P>) {
    this._routes.push({
      path,
      handler,
      method: "POST",
      match: match<P>(path, {
        decode: decodeURIComponent,
      })
    });
  }

  put<P extends object>(path: string, handler: Handler<P>) {
    this._routes.push({
      path,
      handler,
      method: "PUT",
      match: match<P>(path, {
        decode: decodeURIComponent,
      })
    });
  }

  delete<P extends object>(path: string, handler: Handler<P>) {
    this._routes.push({
      path,
      handler,
      method: "DELETE",
      match: match<P>(path, {
        decode: decodeURIComponent,
      })
    });
  }

  use<P extends object>(path: string, handler: Handler<P>) {
    this._routes.push({
      path,
      handler,
      method: "USE",
      match: match<P>(path, {
        decode: decodeURIComponent,
      })
    });
  }

  async routes(req: Request) {
    const url = new URL(req.url);
    let match: Match = {
      path: url.pathname,
      index: 0,
      params: {}
    };

    const route = this._routes.find(
      (route) =>  {
        match = route.match(url.pathname);
        const sameMethod = route.method.toLowerCase() === req.method.toLowerCase();
        const samePath = match && match.path === url.pathname;
        return samePath && (sameMethod || route.method === "USE");
      },
    );

    if (route && match) {
      const params = "params" in match ? match.params : {};
      return await route.handler(req, params);
    }

    return new Response("Not Found", {
      status: 404,
    });
  }
}
