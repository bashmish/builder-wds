import rollupAliasPlugin from '@rollup/plugin-alias';
import rollupCommonjsPlugin from '@rollup/plugin-commonjs';
import rollupInjectPlugin from '@rollup/plugin-inject';
import rollupJsonPlugin from '@rollup/plugin-json';
import rollupReplacePlugin from '@rollup/plugin-replace';
import { stringifyProcessEnvs } from '@storybook/core-common';
import { globals } from '@storybook/preview/globals';
import type { Builder, Options, StorybookConfig as StorybookConfigBase } from '@storybook/types';
import { DevServerConfig, mergeConfigs, startDevServer } from '@web/dev-server';
import type { DevServer } from '@web/dev-server-core';
import { fromRollup } from '@web/dev-server-rollup';
import detectFreePort from 'detect-port';
import express from 'express';
import { dirname, join } from 'path';
import rollupExternalGlobalsPlugin from 'rollup-plugin-external-globals';
import { koaToExpress } from './koa-to-express';
import { readFileConfig } from './read-file-config';
import { storybookBuilderPlugin } from './storybook-builder-plugin';

const aliasPlugin = fromRollup(rollupAliasPlugin);
const commonjsPlugin = fromRollup(rollupCommonjsPlugin);
const externalGlobalsPlugin = fromRollup(rollupExternalGlobalsPlugin);
const injectPlugin = fromRollup(rollupInjectPlugin);
const jsonPlugin = fromRollup(rollupJsonPlugin);
const replacePlugin = fromRollup(rollupReplacePlugin);

export type StorybookConfigWds = StorybookConfigBase & {
  wdsFinal: (
    config: DevServerConfig,
    options: Options,
  ) => DevServerConfig | Promise<DevServerConfig>;
};

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

  // TODO: remove when fixed https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65510
  // @ts-ignore detectFreePort works without number but type is incorrect
  const freePort: number = await detectFreePort();

  const wdsStorybookConfig: DevServerConfig = {
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
  };

  const wdsUserConfig = await readFileConfig();

  const wdsFinalConfig = await options.presets.apply<DevServerConfig>(
    'wdsFinal',
    mergeConfigs(wdsUserConfig, wdsStorybookConfig, {
      // force using dynamically allocated port
      port: freePort,
      // reset local config "open" as it should not be used for storybook specific configuration
      open: false,
    }),
    options,
  );

  // if "wdsFinal" added "open" then rewrite it to open on storybook host (unless it's a full URL)
  if (
    wdsFinalConfig.open &&
    typeof wdsFinalConfig.open === 'string' &&
    !wdsFinalConfig.open.match(/^https?:\/\//)
  ) {
    const protocol = options.https ? 'https' : 'http';
    const host = options.host || 'localhost';
    const port = options.port;
    wdsFinalConfig.open = `${protocol}://${host}:${port}${wdsFinalConfig.open}`;
  }

  try {
    wdsServer = await startDevServer({
      // we load and merge configs manually
      readFileConfig: false,
      readCliArgs: false,
      autoExitProcess: false,
      config: wdsFinalConfig,
    });
    // TODO: consider using proxy instead of middleware
    storybookRouter.use(koaToExpress(wdsServer.koaApp));
  } catch (e) {
    console.warn('unable to start WDS server');
  }
};
