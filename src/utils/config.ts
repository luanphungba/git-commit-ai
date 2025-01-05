import Conf from 'conf';

const config = new Conf({
  projectName: 'commit-ai',
});

export default config;

export function getApiKey(): string {
  const apiKey = config.get('apiKey') as string;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please run: cai --setup');
  }
  return apiKey;
} 