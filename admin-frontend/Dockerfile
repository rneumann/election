FROM node:24.11.0-alpine3.21 AS build

RUN addgroup -S app && adduser -S app -G app

# Change the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies for production
RUN npm ci

# Copy the rest of the application
COPY . .

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

# Build the application
RUN npm run build


FROM nginx:1.28.0-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-admin.conf /etc/nginx/nginx.conf

RUN ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log

RUN mkdir -p /tmp/nginx/client_body_temp \
             /tmp/nginx/proxy_temp \
             /tmp/nginx/fastcgi_temp \
             /tmp/nginx/uwsgi_temp \
             /tmp/nginx/scgi_temp \
    && chown -R nginx:nginx /tmp/nginx


USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
