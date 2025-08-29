FROM cypress/included:15.0.0

# Dependencies
WORKDIR .
COPY package*.json ./
RUN npm ci

COPY . .
CMD [ "npx", "cypress", "run" ]