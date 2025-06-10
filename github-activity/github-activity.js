#!/usr/bin/env node

const https = require('https');

const username = process.argv[2];

if (!username) {
  console.error('❌ Si us plau, proporciona un nom d\'usuari de GitHub.');
  console.error('Usage: github-activity <username>');
  process.exit(1);
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleString();
}

function fetchGithubEvents(username) {
  const url = `https://api.github.com/users/${username}/events`;

  const options = {
    headers: {
      'User-Agent': 'github-activity-cli',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  https.get(url, options, (res) => {
    let data = '';

    if (res.statusCode === 404) {
      console.error(`❌ L'usuari '${username}' no s'ha trobat a GitHub.`);
      process.exit(1);
    }

    if (res.statusCode !== 200) {
      console.error(`❌ Error accedint a l'API de GitHub. Codi: ${res.statusCode}`);
      process.exit(1);
    }

    res.on('data', (chunk) => data += chunk);

    res.on('end', () => {
      try {
        const events = JSON.parse(data);
        if (events.length === 0) {
          console.log(`ℹ️ No s'ha trobat activitat recent per a l'usuari '${username}'.`);
          return;
        }

        console.log(`📦 Activitat recent de ${username}:\n`);
        const seen = new Set();

        for (const event of events) {
          const repo = event.repo.name;
          const type = event.type;
          const time = formatDate(event.created_at);
          const key = `${type}-${repo}-${time}`;

          if (seen.has(key)) continue;
          seen.add(key);

          switch (type) {
            case 'PushEvent':
              const commits = event.payload.commits.length;
              console.log(`🔁 ${time} — Pushed ${commits} commit(s) to ${repo}`);
              break;
            case 'IssuesEvent':
              console.log(`🐞 ${time} — ${event.payload.action} an issue in ${repo}`);
              break;
            case 'WatchEvent':
              console.log(`⭐ ${time} — Starred ${repo}`);
              break;
            case 'ForkEvent':
              console.log(`🍴 ${time} — Forked ${repo}`);
              break;
            case 'PullRequestEvent':
              console.log(`📥 ${time} — ${event.payload.action} a pull request in ${repo}`);
              break;
            case 'CreateEvent':
              console.log(`🆕 ${time} — Created ${event.payload.ref_type} in ${repo}`);
              break;
            case 'IssueCommentEvent':
              console.log(`💬 ${time} — Commented on an issue in ${repo}`);
              break;
            default:
              console.log(`📌 ${time} — ${type} in ${repo}`);
          }
        }
      } catch (err) {
        console.error('❌ Error al processar la resposta:', err.message);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Error de connexió HTTPS:', err.message);
    process.exit(1);
  });
}

fetchGithubEvents(username);
