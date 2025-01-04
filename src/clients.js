import simpleGit from 'simple-git';
import { OpenAI } from 'openai';
import { config } from 'dotenv';

config();

/**
 * Initialize OpenAI client
 * @returns {OpenAI} OpenAI client instance
 */
export function initializeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return new OpenAI({ apiKey });
}

/**
 * Initialize Git client
 * @returns {import('simple-git').SimpleGit} Simple Git client instance
 */
export function initializeGit() {
  return simpleGit();
} 