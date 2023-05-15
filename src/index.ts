import rollupAliasPlugin from '@rollup/plugin-alias';
import rollupCommonjsPlugin from '@rollup/plugin-commonjs';
import rollupJsonPlugin from '@rollup/plugin-json';
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


  const freePort = await detectFreePort(3002);

  try {
    wdsServer = await startDevServer({
      // we should not read the local wds config, wdsFinal hook can be used instead in the storybook config
      readFileConfig: false,
      readCliArgs: false,
      autoExitProcess: false,
      config: {
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

// taken from https://github.com/storybookjs/storybook/blob/v7.0.9/code/lib/preview/src/globals/types.ts
// Here we map the name of a module to their NAME in the global scope.
const globals = {
  '@storybook/addons': '__STORYBOOK_MODULE_ADDONS__',
  '@storybook/channel-postmessage': '__STORYBOOK_MODULE_CHANNEL_POSTMESSAGE__',
  '@storybook/channel-websocket': '__STORYBOOK_MODULE_CHANNEL_WEBSOCKET__',
  '@storybook/channels': '__STORYBOOK_MODULE_CHANNELS__',
  '@storybook/client-api': '__STORYBOOK_MODULE_CLIENT_API__',
  '@storybook/client-logger': '__STORYBOOK_MODULE_CLIENT_LOGGER__',
  '@storybook/core-client': '__STORYBOOK_MODULE_CORE_CLIENT__',
  '@storybook/core-events': '__STORYBOOK_MODULE_CORE_EVENTS__',
  '@storybook/preview-web': '__STORYBOOK_MODULE_PREVIEW_WEB__',
  '@storybook/preview-api': '__STORYBOOK_MODULE_PREVIEW_API__',
  '@storybook/store': '__STORYBOOK_MODULE_STORE__',
};
