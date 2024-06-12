'use strict';

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to run the Python script using spawn
const runPythonScript = (scriptPath) => {
  const pythonProcess = spawn('python3', [scriptPath]);

  // Print output data from stdout
  pythonProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  // Print output data from stderr
  pythonProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  // Handle the end of the process
  pythonProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    process.exit(code); //propagate the exit code
  });
};

const scriptPath = resolve(__dirname, '..', 'database/generate_data.py');
runPythonScript(scriptPath);