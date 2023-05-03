import type { Builder } from '@storybook/types';
import { DevServerConfig, startDevServer } from '@web/dev-server';
import type { DevServer } from '@web/dev-server-core';
import express from 'express';
import { dirname, join } from 'path';
import { koaToExpress } from './koa-to-express';
import { storybookBuilderPlugin } from './storybook-builder-plugin';

// Storybook's Stats are optional Webpack related property
type WdsStats = {
  toJson: () => any;
};

export type WdsBuilder = Builder<DevServerConfig, WdsStats>;

let wdsServer: DevServer;

export const bail: WdsBuilder['bail'] = async (e?: Error): Promise<void> => {
  try {
    await wdsServer.stop();
  } catch (err) {
    console.warn('unable to stop WDS server');
  }

  throw e;
};

export const start: WdsBuilder['start'] = async ({
  startTime,
  options,
  router: storybookRouter,
  server: storybookServer,
}) => {
  const previewResolvedDir = dirname(require.resolve('@storybook/preview/package.json'));
  const previewDirOrigin = join(previewResolvedDir, 'dist');
  storybookRouter.use(
    '/sb-preview',
    express.static(previewDirOrigin, { immutable: true, maxAge: '5m' }),
  );

  try {
    wdsServer = await startDevServer({
      // TODO: if not false, then overrides some params set in the config here, e.g. port (looks like a bug of dev-server)
      readCliArgs: false,
      // we should not read the local wds config, wdsFinal hook can be used instead in the storybook config
      readFileConfig: false,
      // TODO: looks like we need "autoExitProcess: false" to disable autoExit, because it won't be possible anyway since the storybook's own dev server will run as a parent process and I don't think it will forward any events automatically, therefore "bail" is needed
      autoExitProcess: false,
      config: {
        // TODO: do not hardcode port
        port: 3003,
        plugins: [storybookBuilderPlugin(options)],
      },
    });
    // TODO: consider using proxy instead of middleware
    storybookRouter.use(koaToExpress(wdsServer.koaApp));
  } catch (e) {
    console.warn('unable to start WDS server');
  }
};
