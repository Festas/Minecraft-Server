# Use nginx alpine for minimal footprint
FROM nginx:alpine

# Build arguments for environment variables
ARG MINECRAFT_VERSION=1.21.10
ARG SERVER_SOFTWARE=Paper
ARG DISCORD_INVITE_CODE=YOUR_INVITE_CODE

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy website files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY impressum.html /usr/share/nginx/html/
COPY datenschutz.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY images/ /usr/share/nginx/html/images/
COPY wiki/ /usr/share/nginx/html/wiki/

# Copy config template and generate config.js with environment variables
COPY js/config.template.js /tmp/config.template.js
RUN export MINECRAFT_VERSION="${MINECRAFT_VERSION}" \
           SERVER_SOFTWARE="${SERVER_SOFTWARE}" \
           DISCORD_INVITE_CODE="${DISCORD_INVITE_CODE}" && \
    envsubst '${MINECRAFT_VERSION} ${SERVER_SOFTWARE} ${DISCORD_INVITE_CODE}' < /tmp/config.template.js > /usr/share/nginx/html/js/config.js && \
    rm /tmp/config.template.js

# Create cache directory for nginx
RUN mkdir -p /var/cache/nginx

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
