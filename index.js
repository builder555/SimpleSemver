const core = require("@actions/core");
const github = require("@actions/github");

async function getAllCommits(sinceHash, token) {
  try {
    const octokit = github.getOctokit(token);
    
    const { owner, repo } = github.context.repo;
    
    const commits = [];
    let page = 1;
    let shouldGetMoreCommits = true;

    while (shouldGetMoreCommits) {
      const response = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 100,
        page
      });
      response.data.forEach((commit) => {
        if (commit.sha === sinceHash) {
          shouldGetMoreCommits = false;
        }
        if (shouldGetMoreCommits) {
          commits.push({
            id: commit.sha,
            message: commit.commit.message
          });
        }
      });

      if (response.data.length < 100) {
        shouldGetMoreCommits = false;
      } else {
        page += 1;
      }
    }
    
    return commits.reverse();
  } catch (error) {
    core.setFailed(`Failed to retrieve commits: ${error.message}`);
  }
}

async function getCommitMessages(sinceHash, token) {
  const commits = await getAllCommits(sinceHash, token);
  if (sinceHash) {
    const sinceIndex = commits.findIndex((c) => c.id === sinceHash);
    commits.splice(0, sinceIndex);
  }
  return commits.map((c) => `${c.message.toLowerCase()} (${c.id.slice(0, 7)})`);
}

function formatReleaseNotes(notes) {
  let releaseNotes = "";
  if (notes.breaking.length > 0) {
    releaseNotes += `## Breaking Changes\n* ${notes.breaking.join("\n* ")}\n\n`;
  }
  if (notes.features.length > 0) {
    releaseNotes += `## Features\n* ${notes.features.join("\n* ")}\n\n`;
  }
  if (notes.fixes.length > 0) {
    releaseNotes += `## Fixes\n* ${notes.fixes.join("\n* ")}\n\n`;
  }
  if (notes.other.length > 0) {
    releaseNotes += `## Other\n* ${notes.other.join("\n* ")}\n\n`;
  }
  return releaseNotes;
}

function parseCommits(messages, lastVersion) {
  let [major = 0, minor = 0, patch = 0] = lastVersion.split(".").map(Number);
  const notes = {
    breaking: [],
    features: [],
    fixes: [],
    other: [],
  };
  for (const message of messages) {
    if (message.startsWith("fix:")) {
      patch++;
      notes.fixes.push(message.slice(4).trim());
    } else if (message.startsWith("feat:")) {
      minor++;
      patch = 0;
      notes.features.push(message.slice(5).trim());
    } else if (message.startsWith("feat!") || message.startsWith("fix!")) {
      major++;
      minor = 0;
      patch = 0;
      notes.breaking.push(message.slice(message.indexOf("!") + 1).trim());
    } else if (message.startsWith("chore:")) {
      notes.other.push(message.slice(6).trim());
    } else {
      notes.other.push(message);
    }
  }
  let releaseNotes = formatReleaseNotes(notes);
  return { releaseNotes, major, minor, patch };
}

async function fetchLatestVersionAndHash (token) {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  let page = 1;
  let hasMoreTags = true;
  while(hasMoreTags) {
    const { data: tags } = await octokit.rest.repos.listTags({
      owner,
      repo,
      per_page: 100,
      page,
    });
    hasMoreTags = tags.length > 0;
    page++;
    // only match tags that look like "v3.0.0" or "v 3.0.0" 
    const versionTags = tags.filter(tag => tag.name.match(/^v[^\d]*\d+\.\d+\.\d+$/i));
    
    if (versionTags.length > 0) {
      const version = versionTags[0].name.replace(/[^\d.]/g, '');
      const hash = versionTags[0].commit.sha;
      return {
        version,
        hash
      }
    }
  }
  return { version: '0.0.0', hash: '' };
}

async function main() {
  let lastVersion = core.getInput("last-version");
  let sinceHash = core.getInput("last-hash");
  const token = core.getInput('github-token', { required: true });

  if (!lastVersion || !sinceHash) {
    ({ version: lastVersion, hash: sinceHash } = await fetchLatestVersionAndHash(token));
  }
  const messages = await getCommitMessages(sinceHash, token);
  console.log(`Parsing ${messages.length} commit messages...`);
  const { releaseNotes, major, minor, patch } = parseCommits(messages, lastVersion);
  const newVersion = `${major}.${minor}.${patch}`;
  if (lastVersion == newVersion) {
    console.log("No new release");
    return;
  }
  core.setOutput("major", major);
  core.setOutput("minor", minor);
  core.setOutput("patch", patch);
  core.setOutput("version", newVersion);
  core.setOutput("release-notes", releaseNotes);
  console.log(`New version: ${newVersion}\nRelease notes: \n${releaseNotes}`);
}

try {
  main();
} catch (error) {
  const errorLine = error.stack.split("\n")[1];
  core.setFailed(`${error.message} (${errorLine})`);
}
