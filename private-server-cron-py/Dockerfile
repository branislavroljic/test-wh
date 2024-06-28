# Use the official Python image
FROM python:3.9-alpine

# Install dependencies
RUN pip install requests python-dotenv docker

# Create and change to the app directory
WORKDIR /usr/app

# Copy app source code
COPY . .

# Set environment variables
ENV URL=${URL}
ENV CURRENT_IMAGE=${CURRENT_IMAGE}

# Run the script
CMD ["python", "version-checker.py"]
