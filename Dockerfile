FROM nginx:alpine

# Update vulnerable system packages
RUN apk upgrade --no-cache

# Copy website files
COPY . /usr/share/nginx/html/

# Remove internal configuration from public web root
RUN rm -rf /usr/share/nginx/html/nginx

# Configure Nginx
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Container health monitoring
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

EXPOSE 8
FROM nginx:alpine

# Update system packages
RUN apk upgrade --no-cache

# Copy only website directories
COPY HTML/ /usr/share/nginx/html/HTML/
COPY Img/ /usr/share/nginx/html/Img/
COPY Img1/ /usr/share/nginx/html/Img1/
COPY Php/ /usr/share/nginx/html/Php/
COPY Source/ /usr/share/nginx/html/Source/

# Nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Prepare permissions for non-root execution
RUN chown -R 101:101 /usr/share/nginx/html \
    && chmod -R a+rX /usr/share/nginx/html

# Run as non-root
USER 101:101

# Container health monitoring
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

EXPOSE 80

# Start Nginx directly
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
