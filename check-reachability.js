const fs = require('fs');
const dns = require('dns');
const readline = require('readline');
const { promisify } = require('util');

// Promisified dns resolve function
const resolve = promisify(dns.resolve);

async function checkReachability(file) {
  const logFile = 'progress.log';
  let processedSites = new Set();

  // Load already processed sites from the log file
  if (fs.existsSync(logFile)) {
    const logData = fs.readFileSync(logFile, 'utf8');
    processedSites = new Set(logData.trim().split('\n'));
  }

  const reachable = fs.existsSync('reachable.txt') ? fs.readFileSync('reachable.txt', 'utf8').split('\n') : [];
  const unreachable = fs.existsSync('unreachable.txt') ? fs.readFileSync('unreachable.txt', 'utf8').split('\n') : [];

  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity
  });

  const toProcess = [];
  for await (const line of rl) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const parts = trimmedLine.split(/\s+/);
      if (parts.length > 1 && !processedSites.has(parts[1])) {
        toProcess.push(trimmedLine);
      }
    }
  }

  for (const line of toProcess) {
    const parts = line.split(/\s+/);
    const host = parts[1];
    try {
      await resolve(host);
      reachable.push(line);
    } catch (err) {
      unreachable.push(line);
    }
    processedSites.add(host);

    // Log the current state
    fs.writeFileSync(logFile, Array.from(processedSites).join('\n'));
    fs.writeFileSync('reachable.txt', reachable.join('\n'));
    fs.writeFileSync('unreachable.txt', unreachable.join('\n'));

    // Console log for progress
    console.log(`Processed: ${processedSites.size}/${processedSites.size + toProcess.length - processedSites.size}. Host: ${host}`);
  }

  console.log('Process completed. Check reachable.txt and unreachable.txt for results.');
}

checkReachability('HOSTS.txt').catch(console.error);