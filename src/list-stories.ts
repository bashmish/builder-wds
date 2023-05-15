// based on https://github.com/storybookjs/storybook/blob/v7.0.9/code/lib/builder-vite/src/list-stories.ts

import { normalizeStories } from '@storybook/core-common';
import type { Options } from '@storybook/types';
import { promise as glob } from 'glob-promise';
import * as path from 'path';
import slash from 'slash';

export async function listStories(options: Options) {
  return (
    await Promise.all(
      normalizeStories(await options.presets.apply('stories', [], options), {
        configDir: options.configDir,
        workingDir: options.configDir,
      }).map(({ directory, files }) => {
        const pattern = path.join(directory, files);
        const absolutePattern = path.isAbsolute(pattern)
          ? pattern
          : path.join(options.configDir, pattern);

        return glob(slash(absolutePattern), { follow: true });
      }),
    )
  ).reduce((carry, stories) => carry.concat(stories), []);
}
