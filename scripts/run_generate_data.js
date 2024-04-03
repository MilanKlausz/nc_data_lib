'use strict';

const { spawn } = require('child_process');
const path = require('path');

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
 });
};

const scriptPath = path.resolve(__dirname, '..', 'database/generate_data.py');
runPythonScript(scriptPath);