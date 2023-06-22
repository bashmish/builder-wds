// based on https://github.com/storybookjs/storybook/blob/v7.0.9/code/lib/builder-vite/src/codegen-set-addon-channel.ts
import { globals } from '@storybook/preview/globals';

export async function generateSetupAddonsScript() {
  return `
const { createChannel: createPostMessageChannel } = ${globals['@storybook/channel-postmessage']};
const { createChannel: createWebSocketChannel } = ${globals['@storybook/channel-websocket']};
const { addons } = ${globals['@storybook/preview-api']};

const channel = createPostMessageChannel({ page: 'preview' });
addons.setChannel(channel);
window.__STORYBOOK_ADDONS_CHANNEL__ = channel;

const { SERVER_CHANNEL_URL } = globalThis;
if (SERVER_CHANNEL_URL) {
  const serverChannel = createWebSocketChannel({ url: SERVER_CHANNEL_URL });
  addons.setServerChannel(serverChannel);
  window.__STORYBOOK_SERVER_CHANNEL__ = serverChannel;
}
  `.trim();
}
