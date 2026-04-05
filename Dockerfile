FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build the application
RUN npm run build

# Run all tests: lint, unit, and e2e
CMD ["sh", "-c", "npm run lint && npm run test && npm run test:e2e"]
