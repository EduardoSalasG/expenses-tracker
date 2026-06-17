#!/bin/sh
set -eu

run_sql_directory() {
  directory="$1"
  if [ ! -d "$directory" ]; then
    return
  fi

  find "$directory" -maxdepth 1 -type f -name '*.sql' | sort | while read -r sql_file; do
    echo "running $sql_file"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$sql_file"
  done
}

run_sql_directory /docker-entrypoint-initdb.d/migrations
run_sql_directory /docker-entrypoint-initdb.d/bootstrap
