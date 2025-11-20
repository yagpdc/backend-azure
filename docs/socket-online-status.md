# Sistema de Status Online/Offline - Socket.IO

## Visão Geral

O sistema rastreia quais usuários estão ativos na plataforma em tempo real usando Socket.IO. Quando um usuário tem a aba ativa, ele aparece como **online** no ranking.

## Backend

### Infraestrutura

- **Socket.IO Server**: Rodando no mesmo servidor HTTP do Express
- **OnlineUsersService**: Gerencia estado de usuários online em memória
- **Endpoint /ranking**: Retorna status `isOnline` para cada jogador

### Como Funciona

1. Quando um usuário conecta, ele emite evento `user:online` com seu `userId`
2. O servidor adiciona o usuário ao conjunto de usuários online
3. Todos os clientes conectados recebem atualização via evento `users:online`
4. Quando o usuário desconecta (fecha aba), é removido automaticamente

### Múltiplas Abas

Se um usuário abrir múltiplas abas:
- Todas as conexões são rastreadas
- Usuário só aparece como **offline** quando TODAS as abas forem fechadas
- Cada aba mantém sua própria conexão Socket.IO

## Frontend - Como Implementar

### 1. Instalar Socket.IO Client

```bash
npm install socket.io-client
```

### 2. Criar Serviço de Socket

```typescript
// services/socket.service.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId: string) {
    if (this.socket?.connected) {
      console.log('Socket já conectado');
      return;
    }

    this.userId = userId;
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('🔌 Conectado ao Socket.IO');
      // Informar o servidor que o usuário está online
      this.socket?.emit('user:online', { userId: this.userId });
    });

    this.socket.on('disconnect', () => {
      console.log('👋 Desconectado do Socket.IO');
    });

    // Receber atualizações de usuários online
    this.socket.on('users:online', (data: { onlineUserIds: string[]; totalOnline: number }) => {
      console.log(`👥 ${data.totalOnline} usuários online:`, data.onlineUserIds);
      // Atualizar estado global ou context
      window.dispatchEvent(new CustomEvent('onlineUsersUpdate', { detail: data }));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  requestOnlineUsers() {
    this.socket?.emit('users:request');
  }
}

export const socketService = new SocketService();
```

### 3. Conectar ao Socket no App Principal

```typescript
// App.tsx ou similar
import { useEffect } from 'react';
import { socketService } from './services/socket.service';

function App() {
  const userId = localStorage.getItem('wordsUserId'); // ou seu sistema de auth

  useEffect(() => {
    if (userId) {
      // Conectar quando app carrega
      socketService.connect(userId);

      // Desconectar quando app desmonta
      return () => {
        socketService.disconnect();
      };
    }
  }, [userId]);

  return (
    // seu app
  );
}
```

### 4. Usar Status Online no Ranking

```typescript
// components/Ranking.tsx
import { useState, useEffect } from 'react';

interface Player {
  id: string;
  name: string;
  score: number;
  isOnline: boolean;
  // ... outros campos
}

function Ranking() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    // Buscar ranking inicial
    fetchRanking();

    // Atualizar ranking quando usuários online mudarem
    const handleOnlineUpdate = () => {
      fetchRanking(); // Recarregar ranking para pegar status atualizado
    };

    window.addEventListener('onlineUsersUpdate', handleOnlineUpdate);
    return () => window.removeEventListener('onlineUsersUpdate', handleOnlineUpdate);
  }, []);

  async function fetchRanking() {
    const response = await fetch('http://localhost:3000/words/ranking');
    const data = await response.json();
    setPlayers(data);
  }

  return (
    <div>
      {players.map((player) => (
        <div key={player.id}>
          <span>{player.name}</span>
          <span>{player.score} pts</span>
          <span className={player.isOnline ? 'online' : 'offline'}>
            {player.isOnline ? '🟢 Online' : '⚪ Offline'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### 5. Context Provider (Opcional, Recomendado)

```typescript
// contexts/OnlineUsersContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

interface OnlineUsersContextType {
  onlineUserIds: string[];
  totalOnline: number;
  isUserOnline: (userId: string) => boolean;
}

const OnlineUsersContext = createContext<OnlineUsersContextType>({
  onlineUserIds: [],
  totalOnline: 0,
  isUserOnline: () => false,
});

export function OnlineUsersProvider({ children }: { children: React.ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [totalOnline, setTotalOnline] = useState(0);

  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      setOnlineUserIds(event.detail.onlineUserIds);
      setTotalOnline(event.detail.totalOnline);
    };

    window.addEventListener('onlineUsersUpdate', handleUpdate as EventListener);
    return () => window.removeEventListener('onlineUsersUpdate', handleUpdate as EventListener);
  }, []);

  const isUserOnline = (userId: string) => {
    return onlineUserIds.includes(userId);
  };

  return (
    <OnlineUsersContext.Provider value={{ onlineUserIds, totalOnline, isUserOnline }}>
      {children}
    </OnlineUsersContext.Provider>
  );
}

export const useOnlineUsers = () => useContext(OnlineUsersContext);
```

Usar no componente:

```typescript
import { useOnlineUsers } from '../contexts/OnlineUsersContext';

function PlayerCard({ player }: { player: Player }) {
  const { isUserOnline } = useOnlineUsers();

  return (
    <div>
      <span>{player.name}</span>
      {isUserOnline(player.id) && <span>🟢 Online</span>}
    </div>
  );
}
```

## Eventos Socket.IO

### Cliente → Servidor

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `user:online` | `{ userId: string }` | Informa que o usuário está online |
| `users:request` | - | Solicita lista de usuários online |

### Servidor → Cliente

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `users:online` | `{ onlineUserIds: string[], totalOnline: number }` | Lista atualizada de usuários online |

## API REST

### GET /words/ranking

Retorna ranking com campo `isOnline`:

```json
[
  {
    "id": "6744e7...",
    "name": "Jogador 1",
    "score": 150,
    "streak": 5,
    "infiniteRecord": 30,
    "isOnline": true,
    "avatar": {...}
  }
]
```

## Configuração de CORS

O Socket.IO já está configurado para aceitar as mesmas origens do CORS do Express:

- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (Local)
- `https://projeto-front-rho.vercel.app`
- `https://words-game-five.vercel.app`

## Performance e Escalabilidade

### Estado Atual (In-Memory)
- Usuários online armazenados em memória do processo Node.js
- **Limitação**: Se tiver múltiplos servidores (load balancer), cada servidor tem sua própria lista
- **Adequado para**: 1 servidor, até milhares de usuários simultâneos

### Para Produção com Múltiplos Servidores

Se escalar horizontalmente (múltiplos servidores), use Redis como adapter:

```typescript
// Instalar: npm install @socket.io/redis-adapter redis
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## Troubleshooting

### Socket não conecta
- Verificar se servidor está rodando
- Conferir URL do socket no frontend
- Checar CORS

### Usuário não aparece como online
- Verificar se `userId` está sendo enviado corretamente
- Conferir console do servidor para logs
- Emitir `users:request` manualmente

### Múltiplas abas causam problema
- Isso é esperado! Usuário só fica offline quando TODAS as abas fecharem
- Cada aba = 1 conexão socket

### Status não atualiza em tempo real
- Verificar se está escutando evento `onlineUsersUpdate`
- Pode precisar recarregar ranking após receber atualização
