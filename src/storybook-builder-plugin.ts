import type { Options } from '@storybook/types';
import type { DevServerCoreConfig, Plugin } from '@web/dev-server-core';
import { readFile } from 'fs-extra';
import { transformIframeHtml } from './transform-iframe-html';

export function storybookBuilderPlugin(storybookOptions: Options): Plugin {
  let wdsConfig: DevServerCoreConfig;

  return {
    name: 'storybook-builder',

    serverStart(args) {
      wdsConfig = args.config;
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

      // TODO: implement rendering module
    },

    async transform(context) {
      // TODO: implement exports order
      // if (storyFilePaths.includes(filePath)) {
      //   // inject story order, note that MDX and MD and fall through to this as well
      //   context.body = await injectExportsOrder(context.body as string, filePath);
      // }
    },
  };
}
