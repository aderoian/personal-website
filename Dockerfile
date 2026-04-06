# Apache + PHP — mirrors production routing via .htaccess (mod_rewrite).
FROM php:8.3-apache-bookworm

# Base image already sets AllowOverride All for /var/www/html (docker-php.conf).
RUN a2enmod rewrite

WORKDIR /var/www/html

COPY . /var/www/html/

RUN chown -R www-data:www-data /var/www/html/data \
    && chmod -R u+rwX /var/www/html/data

EXPOSE 80
