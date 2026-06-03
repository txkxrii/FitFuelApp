#!/bin/zsh
set -e

cd "$(dirname "$0")"

CERT_DIR=".cert"
CERT_FILE="$CERT_DIR/fitfuel-local.crt"
KEY_FILE="$CERT_DIR/fitfuel-local.key"
PORT="8443"
LOCAL_IP="$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo 127.0.0.1)"

mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$LOCAL_IP" >/dev/null 2>&1

echo "FitFuel HTTPS preview"
echo "Mac:    https://localhost:$PORT"
echo "Phone:  https://$LOCAL_IP:$PORT"
echo ""
echo "Laat dit venster open. Op je telefoon moet je mogelijk de certificaatwaarschuwing accepteren."

python3 - <<'PY'
import http.server
import ssl

server = http.server.ThreadingHTTPServer(("0.0.0.0", 8443), http.server.SimpleHTTPRequestHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(".cert/fitfuel-local.crt", ".cert/fitfuel-local.key")
server.socket = context.wrap_socket(server.socket, server_side=True)
server.serve_forever()
PY
