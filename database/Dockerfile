FROM postgres:17-alpine

COPY initdb/00-run-sql-directories.sh /docker-entrypoint-initdb.d/00-run-sql-directories.sh
COPY migrations /docker-entrypoint-initdb.d/migrations
COPY bootstrap /docker-entrypoint-initdb.d/bootstrap

RUN sed -i 's/\r$//' /docker-entrypoint-initdb.d/00-run-sql-directories.sh \
  && chmod +x /docker-entrypoint-initdb.d/00-run-sql-directories.sh
