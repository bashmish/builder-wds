import rollupAliasPlugin from '@rollup/plugin-alias';
import rollupCommonjsPlugin from '@rollup/plugin-commonjs';
import rollupInjectPlugin from '@rollup/plugin-inject';
import rollupJsonPlugin from '@rollup/plugin-json';
import rollupReplacePlugin from '@rollup/plugin-replace';
import { stringifyProcessEnvs } from '@storybook/core-common';
import { globals } from '@storybook/preview/globals';
import type { Builder } from '@storybook/types';
import { DevServerConfig, startDevServer } from '@web/dev-server';
import type { DevServer } from '@web/dev-server-core';
import { fromRollup } from '@web/dev-server-rollup';
import detectFreePort from 'detect-port';
import express from 'express';
import { dirname, join } from 'path';
import rollupExternalGlobalsPlugin from 'rollup-plugin-external-globals';
import { koaToExpress } from './koa-to-express';
import { storybookBuilderPlugin } from './storybook-builder-plugin';

const aliasPlugin = fromRollup(rollupAliasPlugin);
const commonjsPlugin = fromRollup(rollupCommonjsPlugin);
const externalGlobalsPlugin = fromRollup(rollupExternalGlobalsPlugin);
const injectPlugin = fromRollup(rollupInjectPlugin);
const jsonPlugin = fromRollup(rollupJsonPlugin);
const replacePlugin = fromRollup(rollupReplacePlugin);

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

  const env = await options.presets.apply<Record<string, string>>('env');

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
              process: 'process/browser.js',
            },
          }),
          storybookBuilderPlugin(options),
          replacePlugin({
            // covers known "process.env.*" values and helps to remove dev code from production build
            ...stringifyProcessEnvs(env),
          }),
          externalGlobalsPlugin(globals),
          commonjsPlugin({
            requireReturnsDefault: 'preferred',
          }),
          jsonPlugin(),
          injectPlugin({
            preventAssignment: true,
            // covers usages of "process" other than known "process.env.*" values
            process: 'process',
          }),
        ],
      },
    });
    // TODO: consider using proxy instead of middleware
    storybookRouter.use(koaToExpress(wdsServer.koaApp));
  } catch (e) {
    console.warn('unable to start WDS server');
  }
};
