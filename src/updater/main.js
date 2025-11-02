#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

function isUpdateMode(args) {
  return args.length === 3;
}

async function main() {
  const args = process.argv.slice(2);

  if (!isUpdateMode(args)) {
    console.error('Usage: updater <source_dir> <target_dir> <executable_path>');
    process.exit(1);
  }

  const srcDirPath = path.resolve(args[0]);
  const dstDirPath = path.resolve(args[1]);
  const executablePath = path.resolve(args[2]);

  console.log('Updater started.');
  console.log('Source directory:', srcDirPath);
  console.log('Destination directory:', dstDirPath);
  console.log('Executable path:', executablePath);

  // copy new files over
  console.log('Copying new application files...');
  for (const srcFilePath of yieldAllFilesRecursively(srcDirPath)) {
    const dstFilePath = path.join(
      dstDirPath,
      path.relative(srcDirPath, srcFilePath),
    );
    await copyFileWithRetries(srcFilePath, dstFilePath);
  }

  // start the app
  console.log('Updater finished. Starting application...');
  childProcess
    .spawn(executablePath, {
      detached: true,
      stdio: 'ignore',
    })
    .unref();
}

if (require.main === module) {
  try {
    main().then().catch(console.error);
  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    process.exit(1);
  }
}

function* yieldAllFilesRecursively(filePath) {
  const entries = fs.statSync(filePath).isDirectory()
    ? fs.readdirSync(filePath, { withFileTypes: true })
    : [];
  for (const entry of entries) {
    const fullPath = path.join(filePath, entry.name);
    if (entry.isDirectory()) {
      yield* yieldAllFilesRecursively(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

async function copyFileWithRetries(
  srcPath,
  dstPath,
  // wait up to 30 seconds for old app to exit
  maxRetries = 30,
  delayMs = 1000,
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      fs.copyFileSync(srcPath, dstPath);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await sleep(delayMs);
    }
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
