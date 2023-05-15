import type { Options } from '@storybook/types';
import type { DevServerCoreConfig, Plugin } from '@web/dev-server-core';
import { readFile } from 'fs-extra';
import { join } from 'path';
import { generateAppScript } from './generate-app-script';
import { generateSetupAddonsScript } from './generate-setup-addons-script';
import { generateStoriesScript } from './generate-stories-script';
import { injectExportsOrder } from './inject-exports-order';
import { listStories } from './list-stories';
import { transformIframeHtml } from './transform-iframe-html';
import { virtualAppPath, virtualSetupAddonsPath, virtualStoriesPath } from './virtual-paths';

export function storybookBuilderPlugin(storybookOptions: Options): Plugin {
  let projectRoot: string;
  let wdsConfig: DevServerCoreConfig;
  let storyFilePaths: string[];

  return {
    name: 'storybook-builder',

    async serverStart(args) {
      projectRoot = args.config.rootDir;
      wdsConfig = args.config;
      storyFilePaths = await listStories(storybookOptions);
    },

    async serve(context) {
      if (context.path === '/iframe.html') {
        const iframeHtmlTemplate = await readFile(
          require.resolve('../static/iframe-template.html'),
          'utf-8',
        );
        const iframeHtml = await transformIframeHtml(iframeHtmlTemplate, storybookOptions);
        return { type: 'html', body: iframeHtml };
      }

      if (context.path === virtualAppPath) {
        const code = await generateAppScript(storybookOptions, projectRoot);
        return { type: 'js', body: code };
      }

      if (context.path === virtualSetupAddonsPath) {
        const code = await generateSetupAddonsScript();
        return { type: 'js', body: code };
      }

      if (context.path === virtualStoriesPath) {
        const code = await generateStoriesScript(storybookOptions);
        return { type: 'js', body: code };
      }
    },

    async transform(context) {
      const filePath = join(projectRoot, context.path);
      if (storyFilePaths.includes(filePath)) {
        // inject story order
        context.body = await injectExportsOrder(context.body as string, filePath);
      }
    },
  };
}
