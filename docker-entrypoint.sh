#!/bin/sh
# Docker entrypoint script for frontend
# Injects runtime environment variables into the app

# Create env-config.js with runtime environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  VITE_API_URL: "${VITE_API_URL:-}",
  VITE_WS_URL: "${VITE_WS_URL:-}"
};
EOF

# Replace nginx config variables
if [ -n "$API_URL" ]; then
    sed -i "s|\${API_URL}|$API_URL|g" /etc/nginx/conf.d/default.conf
else
    # Remove API proxy if not configured
    sed -i '/location \/api/,/}/d' /etc/nginx/conf.d/default.conf
fi

if [ -n "$WS_URL" ]; then
    sed -i "s|\${WS_URL}|$WS_URL|g" /etc/nginx/conf.d/default.conf
else
    # Remove WS proxy if not configured
    sed -i '/location \/ws/,/}/d' /etc/nginx/conf.d/default.conf
fi

# Execute the main command
exec "$@"
