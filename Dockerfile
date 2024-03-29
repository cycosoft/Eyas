# Command to run this script from project root
# docker build -t eyas .
# docker run -it --rm eyas

# Use the official image as a parent image
FROM electronuserland/builder:wine

# Set the working directory in the Docker container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Copy the rest of the application's code into the container
COPY . .

# Run the command to generate the electron-builder output
CMD [ "npm", "run", "compile:win32" ]