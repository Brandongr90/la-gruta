#!/bin/bash

echo "🛠️  Reparando IndexedDB..."

# Cerrar todas las instancias
echo "1. Cerrando todas las instancias..."
pkill -9 -f "lagruta-ticket-system" 2>/dev/null || true

# Esperar un momento
sleep 2

# Eliminar IndexedDB corrupta
echo "2. Eliminando IndexedDB corrupta..."
rm -rf ~/Library/Application\ Support/lagruta-ticket-system/IndexedDB

# Limpiar quota database
echo "3. Limpiando quota database..."
rm -f ~/Library/Application\ Support/lagruta-ticket-system/QuotaManager*

echo "✅ IndexedDB reparada!"
echo ""
echo "Ahora puedes ejecutar: npm run dev"
