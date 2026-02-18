# Docker Setup Guide

## Pulling the Image

The image is automatically built and published to GitHub Container Registry on every push to `main`.

```bash
docker pull ghcr.io/jbcbro/plex-mcp-server:main
```

### Building Locally (optional)

```bash
docker build -t ghcr.io/jbcbro/plex-mcp-server:main .
```

## Server Modes

The image supports three server modes via the `SERVER_MODE` environment variable:

| Mode    | Description              | Required Env Vars                          |
|---------|--------------------------|--------------------------------------------|
| `plex`  | Plex only (default)      | `PLEX_URL`, `PLEX_TOKEN`                   |
| `arr`   | Plex + Sonarr/Radarr     | Above + `SONARR_API_KEY`, `RADARR_API_KEY` |
| `trakt` | Plex + Trakt.tv          | Above + `TRAKT_CLIENT_ID`, `TRAKT_CLIENT_SECRET` |

## Running the Container

### Plex-only server

```bash
docker run --rm -p 3000:3000 \
  -e PLEX_URL=http://your-plex-ip:32400 \
  -e PLEX_TOKEN=your_plex_token \
  ghcr.io/jbcbro/plex-mcp-server:main
```

### Plex + Arr server (Sonarr/Radarr)

```bash
docker run --rm -p 3000:3000 \
  -e SERVER_MODE=arr \
  -e PLEX_URL=http://your-plex-ip:32400 \
  -e PLEX_TOKEN=your_plex_token \
  -e SONARR_URL=http://your-sonarr-ip:8989 \
  -e SONARR_API_KEY=your_sonarr_api_key \
  -e RADARR_URL=http://your-radarr-ip:7878 \
  -e RADARR_API_KEY=your_radarr_api_key \
  ghcr.io/jbcbro/plex-mcp-server:main
```

### Plex + Trakt server

```bash
docker run --rm -p 3000:3000 \
  -e SERVER_MODE=trakt \
  -e PLEX_URL=http://your-plex-ip:32400 \
  -e PLEX_TOKEN=your_plex_token \
  -e TRAKT_CLIENT_ID=your_trakt_client_id \
  -e TRAKT_CLIENT_SECRET=your_trakt_client_secret \
  ghcr.io/jbcbro/plex-mcp-server:main
```

### Using an env file

Create a `.env` file with your configuration (see `.env.example` for reference), then:

```bash
docker run --rm -p 3000:3000 \
  --env-file .env \
  ghcr.io/jbcbro/plex-mcp-server:main
```

To use a different server mode with an env file, add `SERVER_MODE` to your `.env` or pass it directly:

```bash
docker run --rm -p 3000:3000 \
  --env-file .env \
  -e SERVER_MODE=arr \
  ghcr.io/jbcbro/plex-mcp-server:main
```

## Docker Compose

### Basic (Plex only)

```yaml
services:
  plex-mcp-server:
    image: ghcr.io/jbcbro/plex-mcp-server:main
    ports:
      - "3000:3000"
    environment:
      - SERVER_MODE=plex
      - PLEX_URL=http://your-plex-ip:32400
      - PLEX_TOKEN=your_plex_token
    volumes:
      - ./exports:/app/exports
```

### With Arr Stack (Plex + Sonarr + Radarr)

If you already have Sonarr and Radarr running, just point the MCP server at their APIs:

```yaml
services:
  plex-mcp-server:
    image: ghcr.io/jbcbro/plex-mcp-server:main
    ports:
      - "3000:3000"
    environment:
      - SERVER_MODE=arr
      - PLEX_URL=http://your-plex-ip:32400
      - PLEX_TOKEN=your_plex_token
      - SONARR_URL=http://your-sonarr-ip:8989
      - SONARR_API_KEY=your_sonarr_api_key
      - RADARR_URL=http://your-radarr-ip:7878
      - RADARR_API_KEY=your_radarr_api_key
    volumes:
      - ./exports:/app/exports
```

### Running

```bash
docker compose up
```

## Configuring with Claude Desktop

With the Docker container running (see above), add the following to your Claude Desktop MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "plex": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

This works for all server modes — just make sure the container is started with the desired `SERVER_MODE`.

## Networking Notes

- The container needs network access to your Plex server. If Plex runs on the host machine, use `host.docker.internal` instead of `localhost` in `PLEX_URL` (e.g., `http://host.docker.internal:32400`).
- The same applies for Sonarr/Radarr URLs when using the `arr` mode.
- The Docker image defaults to HTTP transport (`TRANSPORT=http`) on port 3000. Map the port with `-p 3000:3000`.
- To use a custom port, set `MCP_PORT` and update the port mapping accordingly (e.g., `-e MCP_PORT=8080 -p 8080:8080`).

## Persisting Exports

The library export feature writes to `/app/exports` inside the container. Mount a volume to persist these files:

```bash
docker run --rm -p 3000:3000 \
  -e PLEX_URL=http://your-plex-ip:32400 \
  -e PLEX_TOKEN=your_plex_token \
  -v ./exports:/app/exports \
  ghcr.io/jbcbro/plex-mcp-server:main
```

## Environment Variables Reference

| Variable              | Required | Default                    | Description                     |
|-----------------------|----------|----------------------------|---------------------------------|
| `TRANSPORT`           | No       | `http` (Docker) / `stdio`  | Transport mode: `stdio` or `http` |
| `MCP_PORT`            | No       | `3000`                     | Port for HTTP transport         |
| `SERVER_MODE`         | No       | `plex`                     | Server variant: `plex`, `arr`, `trakt` |
| `PLEX_URL`            | Yes      | `http://localhost:32400`   | Plex server URL                 |
| `PLEX_TOKEN`          | Yes      | —                          | Plex authentication token       |
| `SONARR_URL`          | No       | `http://localhost:8989`    | Sonarr URL (arr mode)           |
| `SONARR_API_KEY`      | No       | —                          | Sonarr API key (arr mode)       |
| `RADARR_URL`          | No       | `http://localhost:7878`    | Radarr URL (arr mode)           |
| `RADARR_API_KEY`      | No       | —                          | Radarr API key (arr mode)       |
| `TRAKT_CLIENT_ID`     | No       | —                          | Trakt OAuth client ID (trakt mode) |
| `TRAKT_CLIENT_SECRET` | No       | —                          | Trakt OAuth secret (trakt mode) |
| `DEBUG`               | No       | —                          | Enable debug logging            |
