import Conf from 'conf';

export const CONFIG_KEYS = {
  API_KEY: 'apiKey',
  OPENAI_MODEL: 'openAiModel',
};

export const DEFAULT_OPENAI_MODEL = 'gpt-4o';

const config = new Conf({
  projectName: 'commit-ai',
  encryptionKey: 'cai-encryption-key', // Note that this is not intended for security purposes: https://www.npmjs.com/package/conf
});

export default config;

export function getApiKey(): string {
  return config.get(CONFIG_KEYS.API_KEY) as string;
} 

export function setApiKey(apiKey: string) {
  config.set(CONFIG_KEYS.API_KEY, apiKey);
}

export function getOpenAiModel(): string {
  return config.get(CONFIG_KEYS.OPENAI_MODEL) as string || DEFAULT_OPENAI_MODEL;
}

export function setOpenAiModel(model: string = DEFAULT_OPENAI_MODEL) {
  config.set(CONFIG_KEYS.OPENAI_MODEL, model);
}