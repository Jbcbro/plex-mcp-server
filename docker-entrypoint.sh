#!/bin/sh
set -e

case "$SERVER_MODE" in
  plex)
    exec node build/index.js "$@"
    ;;
  arr)
    exec node build/plex-arr-server.js "$@"
    ;;
  trakt)
    exec node build/plex-trakt-server.js "$@"
    ;;
  *)
    echo "Unknown SERVER_MODE: $SERVER_MODE"
    echo "Valid options: plex, arr, trakt"
    exit 1
    ;;
esac
