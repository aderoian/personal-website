#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/app/data}"
SEED_DIR="/app/data-seed"

mkdir -p "$DATA_DIR"

# Persist host volumes may predate new content files. Seed only when missing.
for file in projects.json blog.json blog-collections.json; do
	if [ ! -f "$DATA_DIR/$file" ]; then
		if [ -f "$SEED_DIR/$file" ]; then
			cp "$SEED_DIR/$file" "$DATA_DIR/$file"
		else
			printf '[]\n' > "$DATA_DIR/$file"
		fi
	fi
done

exec "$@"