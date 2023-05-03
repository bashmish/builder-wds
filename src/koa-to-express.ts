// refactored from https://github.com/xingxingted/koa-to-express/blob/master/lib/koa-to-express.js

import type { RequestHandler } from 'express';
import { STATUS_CODES } from 'http';
import type Koa from 'koa';
import compose from 'koa-compose';
import { Stream } from 'stream';

export function koaToExpress(app: Koa): RequestHandler {
  const middleware = compose(app.middleware);

  return (req, res, next) => {
    const ctx = app.createContext(req, res);

    if (ctx.status === 200) {
      res.statusCode = 404;
    }

    middleware(ctx, () => {
      return Promise.resolve();
    })
      .then(() => {
        // allow bypassing koa
        if (ctx.respond === false) {
          return next();
        }

        if (!ctx.writable) {
          return next();
        }

        // TODO: check why "res" was overridden here and why types do not match
        const { body, status } = ctx;
        if (null != body) {
          if (body instanceof Stream) {
            return body.pipe(res);
          }

          return res.send(body);
        }

        // status body
        if (status !== 404) {
          const body = ctx.message || String(status);
          if (!res.headersSent) {
            ctx.type = 'text';
            ctx.length = Buffer.byteLength(body);
          }
          return res.send(body);
        }

        res.status(200);

        next();
      })

      .catch(err => {
        if (!(err instanceof Error)) {
          err = new Error(`non-error thrown: ${err}`);
        }
        if ('ENOENT' === err.code) {
          err.status = 404;
        }
        if ('number' !== typeof err.status || !STATUS_CODES[err.status]) {
          err.status = 500;
        }
        next(err);
      });
  };
}
