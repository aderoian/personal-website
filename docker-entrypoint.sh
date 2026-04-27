#!/bin/sh
set -e
# Bind mounts from the host replace /var/www/html/data at runtime with host ownership;
# Apache runs as www-data, so the mounted dir must be writable for that user.
if [ -d /var/www/html/data ]; then
    chown -R www-data:www-data /var/www/html/data
    chmod -R u+rwX /var/www/html/data
fi
exec docker-php-entrypoint "$@"
