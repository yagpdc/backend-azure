#!/bin/bash

# Script para marcar um usuário como online (para testes)

if [ -z "$1" ]; then
  echo "❌ Erro: userId não fornecido"
  echo ""
  echo "Uso: ./mark-online.sh <userId>"
  echo "Exemplo: ./mark-online.sh 674abc123"
  echo ""
  echo "Para pegar seu userId, acesse /words/profile e copie o campo 'id'"
  exit 1
fi

USER_ID=$1

echo "🔄 Marcando usuário $USER_ID como online..."

curl -X POST http://localhost:3000/online \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}" \
  -s | jq

echo ""
echo "✅ Feito! Agora acesse http://localhost:3000/words/ranking"
echo "   e procure por $USER_ID - deve estar com isOnline: true"
