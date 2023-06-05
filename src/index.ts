import { globals } from '@storybook/preview/globals';
import type { Builder, Options, StorybookConfig as StorybookConfigBase } from '@storybook/types';
import { DevServerConfig, mergeConfigs, startDevServer } from '@web/dev-server';
import type { DevServer } from '@web/dev-server-core';
import { fromRollup } from '@web/dev-server-rollup';
import detectFreePort from 'detect-port';
import express from 'express';
import { join, resolve } from 'path';
import rollupExternalGlobalsPlugin from 'rollup-plugin-external-globals';
import { getNodeModuleDir } from './get-node-module-dir';
import { koaToExpress } from './koa-to-express';
import { PREBUNDLED_MODULES_DIR, prebundleModulesPlugin } from './prebundle-modules-plugin';
import { readFileConfig } from './read-file-config';
import { storybookBuilderPlugin } from './storybook-builder-plugin';

const externalGlobalsPlugin = fromRollup(rollupExternalGlobalsPlugin);

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
  const previewDirOrigin = join(getNodeModuleDir('@storybook/preview'), 'dist');
  storybookRouter.use(
    '/sb-preview',
    express.static(previewDirOrigin, { immutable: true, maxAge: '5m' }),
  );
  storybookRouter.use(
    `/${PREBUNDLED_MODULES_DIR}`,
    express.static(resolve(`./${PREBUNDLED_MODULES_DIR}`)),
  );

  const env = await options.presets.apply<Record<string, string>>('env');

  const freePort: number = await detectFreePort();

  const wdsStorybookConfig: DevServerConfig = {
    nodeResolve: true,
    plugins: [
      prebundleModulesPlugin(env),
      storybookBuilderPlugin(options),
      externalGlobalsPlugin(globals),
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
