# Dev image for the Astro site. Everything lives in the container.
# No dependency is installed on the host machine.
FROM node:22-alpine

WORKDIR /app

# Install deps first (layer cache holds as long as the manifests don't change).
COPY package.json package-lock.json* ./
RUN npm install

# Source code is mounted as a volume at runtime (see docker-compose.yml), but
# copy it anyway so the image can build standalone.
COPY . .

EXPOSE 4321

# --host to expose the server outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
