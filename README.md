# personal-website

Source for my website hosted at [armenderoian.dev](https://www.armenderoian.dev)

## Docker

Build and run (site on [http://localhost:8080](http://localhost:8080)):

```bash
docker compose up --build
```

Production-style image only:

```bash
docker build -t personal-website .
docker run --rm -p 8080:80 personal-website
```

Mount `includes/config.local.php` and `./data` as needed (see `docker-compose.yml` comments). Non-Docker dev: `./serve`.