# Integração Socket.IO - Modo Co-op

## ⚠️ IMPORTANTE: Frontend DEVE fazer Join na Sala

Para receber atualizações em tempo real, o frontend **OBRIGATORIAMENTE** precisa:

### 1. Conectar ao Socket.IO
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:8000', {
  withCredentials: true
});
```

### 2. Se Identificar (para status online)
```typescript
socket.on('connect', () => {
  socket.emit('user:online', { userId: user.id });
});
```

### 3. **CRÍTICO**: Entrar na Sala Socket.IO
```typescript
// Quando criar ou entrar em uma sala
const roomId = "MUURSI"; // vem da resposta da API

socket.emit('room:join', { roomId });
console.log(`📡 Conectado à sala ${roomId} via Socket.IO`);
```

### 4. Ouvir Eventos da Sala

```typescript
// Jogador entrou
socket.on('room:player-joined', (data) => {
  console.log('🎮 Jogador entrou:', data.player);
  // Atualizar lista de players na UI
});

// Jogo iniciou
socket.on('room:game-started', (data) => {
  console.log('🚀 Jogo começou!');
  console.log('Turno de:', data.currentTurnPlayer);
  // Mostrar tela de jogo
});

// Palpite feito
socket.on('room:guess-made', (data) => {
  console.log(`💭 ${data.playerName} jogou: ${data.guess}`);
  console.log(`Padrão: ${data.pattern}`);
  // Atualizar tabuleiro com o palpite
});

// Mudança de turno
socket.on('room:turn-changed', (data) => {
  console.log('🔄 Próximo turno:', data.nextTurnPlayer);
  // Atualizar UI mostrando de quem é o turno
});

// Palavra completada
socket.on('room:word-completed', (data) => {
  console.log(`✅ Palavra acertada: ${data.word}`);
  console.log(`Score: ${data.currentScore}`);
  // Mostrar animação de vitória e próxima palavra
});

// Game over
socket.on('room:game-over', (data) => {
  console.log(`❌ Game Over! Palavra era: ${data.correctWord}`);
  console.log(`Score final: ${data.finalScore}`);
  // Mostrar tela de fim de jogo
});

// Jogador abandonou
socket.on('room:player-abandoned', (data) => {
  console.log(`👋 ${data.playerName} abandonou`);
  // Mostrar mensagem e encerrar jogo
});
```

### 5. Sair da Sala (Cleanup)
```typescript
// Quando sair da tela de jogo
socket.emit('room:leave', { roomId });
```

## 🐛 Debug

Se não está recebendo eventos:
1. ✅ Verificar se fez `socket.emit('room:join', { roomId })`
2. ✅ Verificar se está ouvindo os eventos **ANTES** de entrar na sala
3. ✅ Abrir console do navegador e ver logs de Socket.IO
4. ✅ No backend, verificar se aparece: `🚪 Socket XXX entrou na sala YYY`

## 📋 Fluxo Completo

### Player 1 (Criador)
```typescript
// 1. Criar sala
const response = await api.post('/words/infinity/coop/create-room');
const { roomId } = response.data;

// 2. Join na sala via Socket.IO
socket.emit('room:join', { roomId });

// 3. Ouvir eventos
socket.on('room:player-joined', handlePlayerJoined);
socket.on('room:game-started', handleGameStarted);
// ... outros eventos

// 4. Aguardar player 2
// UI: "Aguardando jogadores (1/2)"
// UI: "Compartilhe o código: MUURSI"
```

### Player 2 (Convidado)
```typescript
// 1. Entrar na sala
const response = await api.post(`/words/infinity/coop/join-room/${roomId}`);

// 2. Join na sala via Socket.IO (IMEDIATAMENTE!)
socket.emit('room:join', { roomId });

// 3. Ouvir eventos
socket.on('room:game-started', handleGameStarted);
socket.on('room:guess-made', handleGuess);
// ... outros eventos

// Se sala ficou cheia, evento 'room:game-started' virá automaticamente!
```

### Durante o Jogo
```typescript
// Enviar palpite (via REST API)
const response = await api.post('/words/infinity/coop/guess', {
  guess: 'TERRA'
});

// Backend automaticamente emite eventos Socket.IO:
// - room:guess-made (para ambos os jogadores)
// - room:turn-changed (próximo turno)
// - room:word-completed (se acertou)
// - room:game-over (se perdeu)
```

## 🔴 ERRO COMUM

**Sintoma**: "Eu só consigo realmente entrar na sala depois que o usuário entra e eu reinicio a página"

**Causa**: Frontend **NÃO** está fazendo `socket.emit('room:join', { roomId })`

**Solução**: 
1. Após criar/entrar na sala via REST API
2. **IMEDIATAMENTE** fazer `socket.emit('room:join', { roomId })`
3. Sem isso, você não receberá eventos em tempo real!

## 📊 Ordem de Eventos

```
Player 1                           Backend                          Player 2
   |                                  |                                |
   |-- POST /create-room ----------->|                                |
   |<-- { roomId: "ABC123" }---------|                                |
   |                                  |                                |
   |-- socket.emit('room:join')----->|                                |
   |                                  |                                |
   |                                  |<-- POST /join-room/:roomId ----|
   |                                  |-- { roomId, players: [...] }-->|
   |                                  |                                |
   |<-- room:player-joined ----------|                                |
   |                                  |-- socket.emit('room:join') --->|
   |                                  |                                |
   |<-- room:game-started ------------|-- room:game-started --------->|
   |                                  |                                |
```

Sem o `socket.emit('room:join')`, os eventos **NÃO CHEGAM** no frontend! 🚨
