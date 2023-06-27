import type { Options } from '@storybook/types';
import type { Plugin } from 'rollup';
import { generateAppScript } from './generate-app-script';
import { generateSetupAddonsScript } from './generate-setup-addons-script';
import { generateStoriesScript } from './generate-stories-script';
import { injectExportsOrder } from './inject-exports-order';
import { listStories } from './list-stories';
import { virtualAppPath, virtualSetupAddonsPath, virtualStoriesPath } from './virtual-paths';

export function rollupPluginStorybookBuilder(storybookOptions: Options): Plugin {
  let storyFilePaths: string[];

  return {
    name: 'rollup-plugin-storybook-builder',

    async buildStart() {
      storyFilePaths = await listStories(storybookOptions);
    },

    async resolveId(source) {
      if (source === virtualAppPath) {
        return '\0' + source;
      }

      if (source === virtualSetupAddonsPath) {
        return '\0' + source;
      }

      if (source === virtualStoriesPath) {
        return '\0' + source;
      }
    },

    async load(id) {
      if (id === '\0' + virtualAppPath) {
        return generateAppScript(storybookOptions);
      }

      if (id === '\0' + virtualSetupAddonsPath) {
        return generateSetupAddonsScript();
      }

      if (id === '\0' + virtualStoriesPath) {
        return generateStoriesScript(storybookOptions);
      }
    },

    async transform(code, id) {
      if (storyFilePaths.includes(id)) {
        // inject story order
        return injectExportsOrder(code, id);
      }
    },
  };
}
