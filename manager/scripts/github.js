/**
 * github.js
 * Handles all communication with the GitHub Contents API.
 * Reads and writes character JSON files in the configured public repository.
 *
 * Config (stored in localStorage via app.js):
 *   githubToken  — Personal Access Token with repo scope
 *   githubOwner  — Repository owner (username or org)
 *   githubRepo   — Repository name
 *   githubBranch — Branch to read/write (default: "main")
 */

const GitHub = (() => {

  const BASE_URL = "https://api.github.com";

  // ─── Config Helpers ────────────────────────────────────────────────────────

  function getConfig() {
    return {
      token:  localStorage.getItem("githubToken")  || "",
      owner:  localStorage.getItem("githubOwner")  || "",
      repo:   localStorage.getItem("githubRepo")   || "",
      branch: localStorage.getItem("githubBranch") || "main",
    };
  }

  function isConfigured() {
    const config = getConfig();
    return config.token !== "" && config.owner !== "" && config.repo !== "";
  }

  function buildHeaders() {
    const config = getConfig();
    return {
      "Authorization": `Bearer ${config.token}`,
      "Accept":        "application/vnd.github+json",
      "Content-Type":  "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  function buildUrl(path) {
    const config = getConfig();
    return `${BASE_URL}/repos/${config.owner}/${config.repo}/contents/${path}`;
  }

  // ─── Core API Methods ──────────────────────────────────────────────────────

  /**
   * List all files in the characters/ directory.
   * Returns an array of { name, path, sha, downloadUrl } objects.
   */
  async function listCharacterFiles() {
    if (!isConfigured()) throw new Error("GitHub is not configured. Please set your token, owner, and repo in Settings.");

    const response = await fetch(buildUrl("characters"), {
      headers: buildHeaders(),
    });

    if (response.status === 404) {
      // Directory doesn't exist yet — return empty list
      return [];
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error ${response.status}: ${errorBody.message || response.statusText}`);
    }

    const files = await response.json();

    return files
      .filter(file => file.type === "file" && file.name.endsWith(".json"))
      .map(file => ({
        name:        file.name,
        path:        file.path,
        sha:         file.sha,
        downloadUrl: file.download_url,
      }));
  }

  /**
   * Read a single character file from the repo.
   * Returns { data: parsedObject, sha: string } so we can update it later.
   */
  async function readCharacterFile(filePath) {
    if (!isConfigured()) throw new Error("GitHub is not configured.");

    const response = await fetch(buildUrl(filePath), {
      headers: buildHeaders(),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error ${response.status}: ${errorBody.message || response.statusText}`);
    }

    const fileInfo = await response.json();
    const decoded  = atob(fileInfo.content.replace(/\n/g, ""));
    const parsed   = JSON.parse(decoded);

    return {
      data: parsed,
      sha:  fileInfo.sha,
    };
  }

  /**
   * Read a JSON library file from the repo.
   * Returns { data: parsedObject, sha: string|null, path: string }.
   * If the library file does not exist yet, fallbackData is returned with sha null.
   */
  async function readLibraryFile(fileName, fallbackData = null) {
    if (!isConfigured()) throw new Error("GitHub is not configured.");

    const filePath = `library/${fileName}`;
    const response = await fetch(buildUrl(filePath), {
      headers: buildHeaders(),
    });

    if (response.status === 404 && fallbackData !== null) {
      return {
        data: fallbackData,
        sha:  null,
        path: filePath,
      };
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error ${response.status}: ${errorBody.message || response.statusText}`);
    }

    const fileInfo = await response.json();
    const decoded  = atob(fileInfo.content.replace(/\n/g, ""));
    const parsed   = JSON.parse(decoded);

    return {
      data: parsed,
      sha:  fileInfo.sha,
      path: filePath,
    };
  }

  /**
   * List JSON files in a library subfolder, e.g. library/items.
   */
  async function listLibraryFolder(folderName) {
    if (!isConfigured()) throw new Error("GitHub is not configured.");

    const folderPath = `library/${folderName}`;
    const response = await fetch(buildUrl(folderPath), {
      headers: buildHeaders(),
    });

    if (response.status === 404) return [];

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error ${response.status}: ${errorBody.message || response.statusText}`);
    }

    const files = await response.json();
    return files
      .filter(file => file.type === "file" && file.name.endsWith(".json"))
      .map(file => ({
        name: file.name,
        path: file.path,
        sha: file.sha,
        downloadUrl: file.download_url,
      }));
  }

  async function readJsonFile(filePath, fallbackData = null) {
    if (!isConfigured()) throw new Error("GitHub is not configured.");

    const response = await fetch(buildUrl(filePath), {
      headers: buildHeaders(),
    });

    if (response.status === 404 && fallbackData !== null) {
      return { data: fallbackData, sha: null, path: filePath };
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error ${response.status}: ${errorBody.message || response.statusText}`);
    }

    const fileInfo = await response.json();
    const decoded = atob(fileInfo.content.replace(/\n/g, ""));
    return {
      data: JSON.parse(decoded),
      sha: fileInfo.sha,
      path: filePath,
    };
  }

  /**
   * Write a JSON library file in the repo.
   */
  async function writeLibraryFile(fileName, data, sha = null) {
    return writeCharacterFile(`library/${fileName}`, data, sha, `Update library/${fileName}`);
  }

  async function writeJsonFile(filePath, data, sha = null, message = null) {
    return writeCharacterFile(filePath, data, sha, message || `Update ${filePath}`);
  }

  /**
   * Write (create or update) a character file in the repo.
   * Provide the existing sha when updating; omit it when creating.
   *
   * @param {string} filePath   e.g. "characters/capella.json"
   * @param {object} data       Character data object (will be JSON.stringified)
   * @param {string} [sha]      Current file SHA (required for updates, omit for creates)
   * @param {string} [message]  Commit message
   */
  async function writeCharacterFile(filePath, data, sha = null, message = null) {
    if (!isConfigured()) throw new Error("GitHub is not configured.");

    const config      = getConfig();
    const jsonString  = JSON.stringify(data, null, 2);
    const encoded     = btoa(unescape(encodeURIComponent(jsonString)));
    const commitMessage = message || `Update ${filePath.split("/").pop()}`;

    const body = {
      message: commitMessage,
      content: encoded,
      branch:  config.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(buildUrl(filePath), {
      method:  "PUT",
      headers: buildHeaders(),
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error ${response.status}: ${errorBody.message || response.statusText}`);
    }

    const result = await response.json();
    return {
      sha:  result.content.sha,
      path: result.content.path,
    };
  }

  /**
   * Delete a character file from the repo.
   *
   * @param {string} filePath  e.g. "characters/capella.json"
   * @param {string} sha       Current file SHA (required by GitHub API)
   */
  async function deleteCharacterFile(filePath, sha) {
    if (!isConfigured()) throw new Error("GitHub is not configured.");

    const config = getConfig();

    const body = {
      message: `Delete ${filePath.split("/").pop()}`,
      sha:     sha,
      branch:  config.branch,
    };

    const response = await fetch(buildUrl(filePath), {
      method:  "DELETE",
      headers: buildHeaders(),
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error ${response.status}: ${errorBody.message || response.statusText}`);
    }

    return true;
  }

  /**
   * Build the raw.githubusercontent.com URL for a file.
   * Used in exported shareable sheets to fetch data without auth.
   *
   * @param {string} filePath  e.g. "characters/capella.json"
   */
  function buildRawUrl(filePath) {
    const config = getConfig();
    return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${filePath}`;
  }

  /**
   * Verify that the current config is valid by making a lightweight API call.
   * Returns { ok: true } or { ok: false, error: string }.
   */
  async function verifyConfig() {
    if (!isConfigured()) {
      return { ok: false, error: "Token, owner, and repo are all required." };
    }

    const config = getConfig();

    try {
      const response = await fetch(`${BASE_URL}/repos/${config.owner}/${config.repo}`, {
        headers: buildHeaders(),
      });

      if (response.status === 401) return { ok: false, error: "Invalid token — authentication failed." };
      if (response.status === 403) return { ok: false, error: "Token does not have access to this repo." };
      if (response.status === 404) return { ok: false, error: `Repo "${config.owner}/${config.repo}" not found.` };
      if (!response.ok)            return { ok: false, error: `GitHub returned status ${response.status}.` };

      return { ok: true };
    } catch (networkError) {
      return { ok: false, error: `Network error: ${networkError.message}` };
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  return {
    getConfig,
    isConfigured,
    buildRawUrl,
    verifyConfig,
    listCharacterFiles,
    readCharacterFile,
    writeCharacterFile,
    deleteCharacterFile,
    readLibraryFile,
    writeLibraryFile,
    listLibraryFolder,
    readJsonFile,
    writeJsonFile,
  };

})();
