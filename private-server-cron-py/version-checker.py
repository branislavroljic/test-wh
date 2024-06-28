import requests
import docker
import os
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("URL", "http://localhost:3001/version")
CURRENT_IMAGE = os.getenv("CURRENT_IMAGE", "ghcr.io/bojanb98/upravljacke-kontrole/api")

client = docker.from_env()


def get_latest_version():
    try:
        response = requests.get(URL)
        response.raise_for_status()
        return response.json()[
            "version"
        ]  # Adjust based on your endpoint's response structure
    except requests.RequestException as error:
        print(f"Error fetching latest version: {error}")
        return None


def get_current_version():
    try:
        images = client.images.list(CURRENT_IMAGE)
        if images:
            return (
                images[0].tags[0].split(":")[1]
            )  # Extract the tag part of the image name
        else:
            print("Current image not found.")
            return None
    except docker.errors.DockerException as error:
        print(f"Error fetching current version: {error}")
        return None


def check_and_update():
    latest_version = get_latest_version()
    current_version = get_current_version()
    print(latest_version)
    print(current_version)

    if latest_version and current_version and latest_version != current_version:
        print(
            f"New version available: {latest_version}. Current version: {current_version}."
        )
        # Perform your action here, e.g., pulling the new image, restarting containers, etc.
    else:
        print("No update needed.")


if __name__ == "__main__":
    check_and_update()
