# Apache + PHP — mirrors production routing via .htaccess (mod_rewrite).
FROM php:8.3-apache-bookworm

# Base image already sets AllowOverride All for /var/www/html (docker-php.conf).
RUN a2enmod rewrite

WORKDIR /var/www/html

COPY docker-entrypoint.sh /usr/local/bin/personal-website-entrypoint.sh
RUN chmod +x /usr/local/bin/personal-website-entrypoint.sh

COPY . /var/www/html/
# Script is only needed in /usr/local/bin, not in the document root
RUN rm -f /var/www/html/docker-entrypoint.sh

RUN chown -R www-data:www-data /var/www/html/data \
    && chmod -R u+rwX /var/www/html/data

ENTRYPOINT ["/usr/local/bin/personal-website-entrypoint.sh"]
CMD ["apache2-foreground"]

EXPOSE 80
