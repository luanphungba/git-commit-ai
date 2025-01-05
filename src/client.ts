import {simpleGit, SimpleGit} from 'simple-git';
import { OpenAI } from 'openai';
import { getApiKey } from './utils/config.js';

/**
 * Initialize OpenAI client
 * @returns {OpenAI} OpenAI client instance
 */
export function initializeOpenAI() {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return new OpenAI({ apiKey });
}

/**
 * Initialize Git client
 * @returns {SimpleGit} Simple Git client instance
 */
export function initializeGit() {
  return simpleGit();
} 