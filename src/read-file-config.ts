import { ConfigLoaderError, readConfig } from '@web/config-loader';
import { DevServerConfig, DevServerStartError } from '@web/dev-server';

export async function readFileConfig(): Promise<DevServerConfig> {
  try {
    return await readConfig('web-dev-server.config');
  } catch (error) {
    if (error instanceof ConfigLoaderError) {
      throw new DevServerStartError(error.message);
    }
    throw error;
  }
}
