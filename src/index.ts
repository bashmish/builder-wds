import rollupAliasPlugin from '@rollup/plugin-alias';
import rollupCommonjsPlugin from '@rollup/plugin-commonjs';
import rollupJsonPlugin from '@rollup/plugin-json';
import { globals } from '@storybook/preview/globals';
import type { Builder } from '@storybook/types';
import { DevServerConfig, startDevServer } from '@web/dev-server';
import type { DevServer } from '@web/dev-server-core';
import { fromRollup } from '@web/dev-server-rollup';
import express from 'express';
import { dirname, join } from 'path';
import rollupExternalGlobalsPlugin from 'rollup-plugin-external-globals';
import { koaToExpress } from './koa-to-express';
import { storybookBuilderPlugin } from './storybook-builder-plugin';
import detectFreePort from 'detect-port';

const aliasPlugin = fromRollup(rollupAliasPlugin);
const commonjsPlugin = fromRollup(rollupCommonjsPlugin);
const externalGlobalsPlugin = fromRollup(rollupExternalGlobalsPlugin);
const jsonPlugin = fromRollup(rollupJsonPlugin);

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


  // @ts-ignore detectFreePort works without number but type is incorrect
  const freePort = await detectFreePort();

  try {
    wdsServer = await startDevServer({
      // we should not read the local wds config, wdsFinal hook can be used instead in the storybook config
      readFileConfig: false,
      readCliArgs: false,
      autoExitProcess: false,
      config: {
        // @ts-ignore
        port: freePort,
        nodeResolve: true,
        mimeTypes: {
          '**/*.json': 'js',
        },
        plugins: [
          aliasPlugin({
            entries: {
              assert: 'browser-assert',
            },
          }),
          storybookBuilderPlugin(options),
          externalGlobalsPlugin(globals),
          commonjsPlugin({
            requireReturnsDefault: 'preferred',
          }),
          jsonPlugin(),
        ],
      },
    });
    // TODO: consider using proxy instead of middleware
    storybookRouter.use(koaToExpress(wdsServer.koaApp));
  } catch (e) {
    console.warn('unable to start WDS server');
  }
};
