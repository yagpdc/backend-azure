# Como Aparecer Online no Ranking

## ❌ Problema Atual

Você está vendo `isOnline: false` porque **o frontend ainda não está conectando ao Socket.IO**.

O backend está pronto, mas você precisa:
1. Instalar Socket.IO no frontend
2. Conectar quando o app carregar
3. Enviar seu `userId` para o servidor

---

## ✅ Solução Rápida (Código para Adicionar no Frontend)

### 1. Instalar Socket.IO Client

```bash
npm install socket.io-client
```

### 2. Criar arquivo `src/services/socket.ts`

```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId: string) {
    if (this.socket?.connected) {
      return; // Já conectado
    }

    this.userId = userId;
    
    // IMPORTANTE: Ajuste a URL do servidor
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket conectado!');
      // Informar servidor que estou online
      this.socket?.emit('user:online', { userId: this.userId });
    });

    this.socket.on('disconnect', () => {
      console.log('👋 Socket desconectado');
    });

    this.socket.on('users:online', (data) => {
      console.log(`👥 ${data.totalOnline} usuários online`);
      // Você pode atualizar um estado global aqui se quiser
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.userId = null;
  }
}

export const socketService = new SocketService();
```

### 3. Conectar no `App.tsx` (ou componente principal)

```typescript
import { useEffect } from 'react';
import { socketService } from './services/socket';

function App() {
  useEffect(() => {
    // Pegar userId do localStorage ou do seu sistema de auth
    const userId = localStorage.getItem('wordsUserId');
    
    if (userId) {
      // Conectar ao socket
      socketService.connect(userId);

      // Desconectar ao desmontar
      return () => {
        socketService.disconnect();
      };
    }
  }, []);

  return (
    // seu app aqui
  );
}
```

### 4. Pronto! 🎉

Agora quando você entrar no app, você aparecerá como **online** no ranking automaticamente.

---

## 🧪 Testar Localmente Sem Modificar Frontend

Se você quiser testar **agora mesmo** sem mexer no frontend:

### Opção 1: Usar a página de teste HTML

1. Abra o arquivo `test-socket.html` no navegador
2. Digite seu `userId` (o mesmo que aparece no ranking)
3. Clique em "Conectar"
4. Acesse `/words/ranking` e veja que agora está online!

### Opção 2: Simular via API REST (temporário)

```bash
# Marcar seu usuário como online
curl -X POST http://localhost:3000/online \
  -H "Content-Type: application/json" \
  -d '{"userId": "SEU_USER_ID_AQUI"}'

# Ver quem está online
curl http://localhost:3000/online
```

**Exemplo:**
```bash
# Se seu userId é "674abc123"
curl -X POST http://localhost:3000/online \
  -H "Content-Type: application/json" \
  -d '{"userId": "674abc123"}'
```

Depois acesse `/words/ranking` e verá `isOnline: true`!

⚠️ **Nota**: Essa conexão HTTP simulada não se desconecta automaticamente. Use apenas para testar.

---

## 🔍 Debug: Verificar se o Socket está funcionando

### Ver usuários online no momento:

```bash
GET http://localhost:3000/online
```

Resposta:
```json
{
  "onlineUserIds": ["674abc123", "674def456"],
  "totalOnline": 2
}
```

### Ver seu status no ranking:

```bash
GET http://localhost:3000/words/ranking
```

Procure seu usuário e veja o campo `isOnline`.

---

## 📱 Resumo do Fluxo

```
Frontend carrega
    ↓
Conecta ao Socket.IO (io('http://localhost:3000'))
    ↓
Socket conecta com sucesso
    ↓
Envia: socket.emit('user:online', { userId: 'seu-id' })
    ↓
Backend adiciona você à lista de online
    ↓
GET /words/ranking retorna isOnline: true para você
```

---

## ❓ Por que está false agora?

Porque **nenhum cliente Socket.IO conectou e enviou seu userId**. O backend está esperando que o frontend:

1. Conecte ao Socket.IO
2. Envie evento `user:online` com seu `userId`
3. Mantenha a conexão aberta enquanto você navega

Sem isso, o backend não sabe que você está online!

---

## 🚀 URL do Servidor

No código acima, ajuste a URL do servidor conforme seu ambiente:

- **Local**: `http://localhost:3000`
- **Produção**: `https://seu-backend.com`

Certifique-se de que o CORS já está configurado para aceitar sua origem (já está configurado para localhost:5173 e Vercel).
