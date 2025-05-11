// @ts-check

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

const noBuild = process.argv.includes('--no-build');

// List your projects in the order they should be built
const projects = [
    'core',
    'telegramBot',
    'api',
    'ui'
];

// Function to run commands with error handling
function runCommand(command, cwd) {
    console.log(`Running: ${command} in ${cwd}`);
    try {
        execSync(command, { cwd, stdio: 'inherit' });
    } catch (error) {
        console.error(`Command failed: ${command}`);
        process.exit(1);
    }
}

// Function to create tar.gz archive
function createArchive(projectPath, projectName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetDirectory = projectName === 'ui' ? 'build' : 'dist';
    const archiveName = `${projectName}-${targetDirectory}-${timestamp}.tar.gz`;
    const distPath = path.join(projectPath, targetDirectory);
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(distPath)) {
        console.error(`Dist folder not found for ${projectName}`);
        return;
    }

    if (!fs.existsSync(packageJsonPath)) {
        console.error(`package.json not found for ${projectName}`);
        return;
    }

    console.log(`Creating archive: ${archiveName}`);
    // runCommand(`tar -czf ../${archiveName} ${targetDirectory}`, projectPath);

    // Create a temporary folder with both dist and package.json
    const tempDir = path.join(projectPath, 'temp-archive');
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        // Copy dist contents to temp folder
        fs.cpSync(distPath, path.join(tempDir, targetDirectory), { recursive: true });

        // Copy package.json to temp folder
        fs.copyFileSync(packageJsonPath, path.join(tempDir, 'package.json'));

        // Create archive from temp folder contents
        runCommand(`tar -czf ../${archiveName} .`, tempDir);

        fs.renameSync(path.join(projectPath, archiveName), path.join(projectPath, "..", archiveName));
    } finally {
        // Clean up temporary folder
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

for (const project of projects) {
    console.log(`\nProcessing ${project}...`);
    const projectPath = path.join("./projects", project);

    if (!noBuild)
        // Build the project
        runCommand('yarn run build', projectPath);

    // Create archive
    createArchive(projectPath, project);
}

console.log('\nAll projects built and archived successfully!');
