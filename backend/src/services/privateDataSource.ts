import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface PrivateCsvFetchOptions {
  filePath: string;
}

/**
 * Fetches a CSV file from the configured private GitHub repo using the GitHub REST API
 * with Authorization: Bearer <token>. Returns the raw CSV string.
 * Throws with clear errors for auth/config/network failures.
 */
export async function fetchPrivateCsvFromGitHub(options: PrivateCsvFetchOptions): Promise<string> {
  const { filePath } = options;
  const repo = config.privateDataRepo;
  const token = config.githubToken;

  if (!token) {
    throw new Error(
      'GITHUB_TOKEN env var is required to fetch data from the private repo. Create a PAT and set it on Railway.',
    );
  }
  if (!repo) {
    throw new Error('PRIVATE_DATA_REPO env var is not configured.');
  }

  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  logger.info({ repo, filePath }, 'Fetching private CSV from GitHub');

  try {
    const response = await axios.get<string>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.raw',
        'User-Agent': 'sector-charts-backend',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    });
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        throw new Error(
          `GitHub API auth failed (${status}). Check that GITHUB_TOKEN has "Contents: Read" scope for ${repo}.`,
        );
      }
      if (status === 404) {
        throw new Error(
          `GitHub API 404: file not found at ${repo}:${filePath}. Verify repo name and file path.`,
        );
      }
      throw new Error(`GitHub API request failed: ${err.message}`);
    }
    throw err;
  }
}
