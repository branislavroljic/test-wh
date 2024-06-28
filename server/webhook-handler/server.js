require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const port = 3001;
const GH_WEBHOOK_SECRET = process.env.GH_WEBHOOK_SECRET;
const GHCR_PAT = process.env.GHCR_PAT;
const GHCR_USERNAME = process.env.GHCR_USERNAME;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to verify the GitHub webhook signature
function verifySignature(req, res, buf, encoding) {
  const signature = `sha256=${crypto
    .createHmac("sha256", GH_WEBHOOK_SECRET)
    .update(buf)
    .digest("hex")}`;

  if (req.headers["x-hub-signature-256"] !== signature) {
    throw new Error("Signature mismatch");
  }
}

app.use((req, res, next) => {
  bodyParser.json({
    verify: verifySignature,
  })(req, res, (err) => {
    if (err) {
      console.error("Error verifying signature:", err.message);
      return res.status(403).send("Forbidden");
    }
    next();
  });
});

// Handle GitHub webhook events
app.post("/webhook", (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    if (event === "registry_package") {
      const action = req.body.action;
      if (action === "published") {
        const packageVersion =
          req.body.registry_package.package_version.version;
        const installationCommand =
          req.body.registry_package.package_version.installation_command;

        console.log(`New package published: ${packageVersion}`);

        // Authenticate Docker with GHCR using the Personal Access Token
        exec(
          `echo ${GHCR_PAT} | docker login ghcr.io -u ${GHCR_USERNAME} --password-stdin`,
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
            exec(installationCommand, (error, stdout) => {
              if (error) {
                console.error(`Error pulling Docker image: ${error.message}`);
                return;
              }

              console.log(`Docker image pulled successfully: ${stdout}`);

              // Redeploy the Docker Compose service
              const composeDirectory = path.join(__dirname, "../");
              exec(
                `docker-compose -f ${composeDirectory}/docker-compose.yaml down 
                && docker-compose -f ${composeDirectory}/docker-compose.yaml up -d`,
                (composeError, composeStdout) => {
                  if (composeError) {
                    console.error(
                      `Error redeploying service: ${composeError.message}`
                    );
                    return;
                  }
                  console.log(
                    `Service redeployed successfully: ${composeStdout}`
                  );
                }
              );
            });
          }
        );
      }
    } else if (event === "ping") {
      console.log("GitHub sent the ping event");
    } else {
      console.log(`Unhandled event: ${event}`);
    }

    res.status(200).send("Webhook received"); // Server should respond with a 2XX response within 10 seconds of receiving a webhook delivery
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    res.status(500).send("Error processing webhook");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
