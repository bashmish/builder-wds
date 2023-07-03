const VIRTUAL_PREFIX = 'virtual-storybook-builder-wds-';

// must be file paths with extension, otherwise "fromRollup" adapter will resolve it incorrectly as an "outside of root" dir
// must be defined without "\0" in sources and resolved to "\0"+source to make "@web/rollup-plugin-html" parse it correctly
export const virtualAppPath = `${VIRTUAL_PREFIX}app.js`;
export const virtualStoriesPath = `${VIRTUAL_PREFIX}stories.js`;
export const virtualSetupAddonsPath = `${VIRTUAL_PREFIX}addons.js`;
