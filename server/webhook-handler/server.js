require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to verify the GitHub webhook signature (optional)
function verifySignature(req, res, buf, encoding) {
  // Add your verification logic here if needed
  // Example: comparing with a known secret or header value
}

app.use((req, res, next) => {
  bodyParser.json({
    verify: verifySignature,
  })(req, res, (err) => {
    if (err) {
      console.error('Error verifying signature:', err.message);
      return res.status(403).send('Forbidden');
    }
    next();
  });
});

// Handle the incoming webhook from Smee
app.post('/webhook', (req, res) => {
  try {
    const payload = req.body;
    const action = payload.action;
    const installationCommand = payload.installation_command;
    const username = payload.username;
    const token = payload.token;

    console.log(`Received action: ${action}`);
    console.log(`Installation command: ${installationCommand}`);

    // Execute the installation command
    exec(
      `echo ${token} | docker login ghcr.io -u ${username} --password-stdin`,
      (loginError, loginStdout, loginStderr) => {
        if (loginError) {
          console.error(`Error logging into GHCR: ${loginError.message}`);
          return;
        }
        if (loginStderr) {
          console.error(`Login stderr: ${loginStderr}`);
          return;
        }
        console.log(`Login stdout: ${loginStdout}`);

        // Pull the new Docker image from GHCR
        exec(installationCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error pulling Docker image: ${error.message}`);
            return;
          }

          console.log(`Docker image pulled successfully: ${stdout}`);
        });
      }
    );
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    res.status(500).send('Error processing webhook');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
