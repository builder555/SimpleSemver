const core = require("@actions/core");
const github = require("@actions/github");

function getCommitMessages(sinceHash) {
  const commits = github.context.payload.commits;
  if (sinceHash) {
    const sinceIndex = commits.findIndex((c) => c.sha === sinceHash);
    commits.splice(0, sinceIndex);
  }
  return commits.map((c) => `${c.message.toLowerCase()} (${c.sha.slice(0, 7)})`);
}
function formatReleaseNotes(notes) {
  let releaseNotes = "";
  if(notes.breaking.length > 0) {
    releaseNotes += `## Breaking Changes\n*${notes.breaking.join("\n*")}\n\n`;
  }
  if(notes.features.length > 0) {
    releaseNotes += `## Features\n*${notes.features.join("\n*")}\n\n`;
  }
  if(notes.fixes.length > 0) {
    releaseNotes += `## Fixes\n*${notes.fixes.join("\n*")}\n\n`;
  }
  if(notes.other.length > 0) {
    releaseNotes += `## Other\n*${notes.other.join("\n*")}\n\n`;
  }
  return releaseNotes;
}
function parseCommits(messages, lastVersion) {
  let [major, minor, patch] = lastVersion.split(".").map(Number);
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
  return { releaseNotes, newVersion: `${major}.${minor}.${patch}` };
}

try {
  const lastVersion = core.getInput("last-version");
  const sinceHash = core.getInput("last-hash");
  const messages = getCommitMessages(sinceHash);
  const { releaseNotes, newVersion } = parseCommits(messages, lastVersion);
  if (lastVersion == newVersion) {
    console.log("No new release");
    return;
  }
  core.setOutput("version", newVersion);
  core.setOutput("release-notes", releaseNotes);
  console.log(`New version: ${newVersion}\nRelease notes: \n${releaseNotes}`);
} catch (error) {
  core.setFailed(error.message);
}