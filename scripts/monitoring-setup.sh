#!/bin/bash

# Monitoring setup script
set -e

echo "🔧 Setting up monitoring infrastructure..."

# Create monitoring directories
mkdir -p monitoring/{prometheus/rules,grafana/{provisioning,dashboards},alertmanager,filebeat,logstash/{config,pipeline}}

# Set permissions for monitoring volumes
sudo chown -R 472:472 monitoring/grafana
sudo chown -R 65534:65534 monitoring/prometheus
sudo chown -R 1000:1000 monitoring/alertmanager

# Create SSL certificates directory for nginx
mkdir -p nginx/ssl

# Generate self-signed certificates for development (replace with real certificates in production)
if [ ! -f nginx/ssl/cert.pem ]; then
    echo "🔐 Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Start monitoring stack
echo "🚀 Starting monitoring services..."
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
services=("prometheus:9090" "grafana:3001" "elasticsearch:9200" "kibana:5601")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -f -s "http://localhost:${port}/health" > /dev/null 2>&1 || \
       curl -f -s "http://localhost:${port}/" > /dev/null 2>&1; then
        echo "✅ ${name} is healthy"
    else
        echo "❌ ${name} is not responding"
    fi
done

# Import Grafana dashboards
echo "📊 Setting up Grafana dashboards..."
# Wait for Grafana to be fully ready
sleep 10

# Create datasources
curl -X POST \
  http://admin:admin@localhost:3001/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://prometheus:9090",
    "access": "proxy",
    "isDefault": true
  }' || echo "Prometheus datasource might already exist"

curl -X POST \
  http://admin:admin@localhost:3001/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Elasticsearch",
    "type": "elasticsearch",
    "url": "http://elasticsearch:9200",
    "access": "proxy",
    "database": "chatapp-*",
    "interval": "Daily",
    "timeField": "@timestamp"
  }' || echo "Elasticsearch datasource might already exist"

echo "✅ Monitoring setup completed!"
echo ""
echo "📊 Access URLs:"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana: http://localhost:3001 (admin/admin)"
echo "  Kibana: http://localhost:5601"
echo "  AlertManager: http://localhost:9093"
echo ""
echo "🔧 Next steps:"
echo "  1. Change default Grafana password"
echo "  2. Configure alert notification channels"
echo "  3. Import custom dashboards"
echo "  4. Set up SSL certificates for production"