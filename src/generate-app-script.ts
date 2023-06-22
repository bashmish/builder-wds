// based on https://github.com/storybookjs/storybook/blob/v7.0.9/code/lib/builder-vite/src/codegen-modern-iframe-script.ts

import { loadPreviewOrConfigFile } from '@storybook/core-common';
import { globals } from '@storybook/preview/globals';
import type { Options, PreviewAnnotation } from '@storybook/types';
import { processPreviewAnnotation } from './process-preview-annotation';
import { virtualSetupAddonsPath, virtualStoriesPath } from './virtual-paths';

export async function generateAppScript(options: Options, projectRoot: string) {
  const { presets, configDir } = options;

  const previewOrConfigFile = loadPreviewOrConfigFile({ configDir });
  const previewAnnotations = await presets.apply<PreviewAnnotation[]>(
    'previewAnnotations',
    [],
    options,
  );
  const previewAnnotationURLs = [...previewAnnotations, previewOrConfigFile]
    .filter(Boolean)
    .map(path => processPreviewAnnotation(path, projectRoot));

  // This is pulled out to a variable because it is reused in both the initial page load
  // and the HMR handler.  We don't use the hot.accept callback params because only the changed
  // modules are provided, the rest are null.  We can just re-import everything again in that case.
  const getPreviewAnnotationsFunction = `
const getProjectAnnotations = async () => {
  const configs = await Promise.all([
${previewAnnotationURLs.map(previewAnnotation => `    import('${previewAnnotation}')`).join(',\n')}
  ]);
  return composeConfigs(configs);
}
  `.trim();

  // TODO: I think this might be not process by rollup build because they are in the virtual files?
  // although the resolveId should work in them too, it's only transform that is disabled, right?

  return `
import '${virtualSetupAddonsPath}';
import { importFn } from '${virtualStoriesPath}';

const { composeConfigs, PreviewWeb, ClientApi } = ${globals['@storybook/preview-api']};

${getPreviewAnnotationsFunction}

window.__STORYBOOK_PREVIEW__ = window.__STORYBOOK_PREVIEW__ || new PreviewWeb();

window.__STORYBOOK_STORY_STORE__ = window.__STORYBOOK_STORY_STORE__ || window.__STORYBOOK_PREVIEW__.storyStore;
window.__STORYBOOK_CLIENT_API__ = window.__STORYBOOK_CLIENT_API__ || new ClientApi({ storyStore: window.__STORYBOOK_PREVIEW__.storyStore });
window.__STORYBOOK_PREVIEW__.initialize({ importFn, getProjectAnnotations });
  `.trim();
}
