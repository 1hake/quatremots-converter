# Use the latest Node.js runtime as a parent image
FROM node:18

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package.json and yarn.lock to install dependencies using yarn
COPY package.json yarn.lock ./

# Install Node.js dependencies using yarn
RUN yarn install

# Install ts-node, typescript globally for transpiling TypeScript
RUN yarn global add ts-node typescript

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the Node.js app
CMD ["yarn", "start"]
