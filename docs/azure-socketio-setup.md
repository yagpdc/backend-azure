# Configurar Socket.IO no Azure App Service

## 1. Habilitar WebSockets no Portal Azure

1. Acesse o Portal Azure: https://portal.azure.com
2. Navegue até seu App Service: `yago-vm-web-test`
3. No menu lateral, vá em **Configuração** → **Configurações gerais**
4. Em **Configurações da plataforma**:
   - ✅ **Web sockets**: ATIVADO (ON)
   - ✅ **Always On**: ATIVADO (ON) - importante para manter conexões persistentes
5. Clique em **Salvar**

## 2. Configurar CORS no App Service (Opcional)

Se ainda tiver problemas de CORS:

1. No menu lateral, vá em **CORS**
2. Em **Origens Permitidas**, adicione:
   ```
   https://projeto-front-rho.vercel.app
   https://words-game-five.vercel.app
   http://localhost:5173
   ```
3. ✅ Marcar **Habilitar Access-Control-Allow-Credentials**
4. Clique em **Salvar**

## 3. Verificar Configurações de Rede

1. No menu lateral, vá em **Rede**
2. Certifique-se que não há restrições de IP bloqueando conexões

## 4. Deploy com web.config

O arquivo `web.config` foi criado na raiz do projeto e deve ser incluído no deploy.

**Certifique-se que o `web.config` está sendo enviado para o Azure!**

Verifique no `.gitignore` se `web.config` NÃO está sendo ignorado.

## 5. Logs para Debug

Para ver logs de conexão Socket.IO:

1. No Portal Azure, vá em **Monitoramento** → **Fluxo de log**
2. Ou use Azure CLI:
   ```bash
   az webapp log tail --name yago-vm-web-test --resource-group seu-resource-group
   ```

Você deve ver logs como:
```
🔌 Socket conectado: svLNnDevjyJGxEjnAACR
✅ Usuário 691947453bc0b9319e1ccaf2 online (1 conexão(ões))
🚪 Socket svLNnDevjyJGxEjnAACR entrou na sala 29U6MM
```

## 6. Testar Conexão

Após habilitar WebSockets e fazer deploy:

```javascript
// No frontend, deve conectar sem erros
const socket = io('https://yago-vm-web-test-ffhjembcd5h9eebv.brazilsouth-01.azurewebsites.net', {
  transports: ['polling'], // Apenas polling para Azure
  withCredentials: true
});
```

## 7. Alternativa: Usar apenas HTTP Polling

Se WebSockets continuarem falhando, use apenas polling (já configurado no backend):

**Backend**: `transports: ["polling"]` ✅ (já feito)
**Frontend**: `transports: ["polling"]`

Polling funciona 100% no Azure, mas é menos eficiente que WebSocket.

## 8. Reiniciar App Service

Após qualquer mudança de configuração:

1. No Portal Azure, clique em **Reiniciar** no topo da página do App Service
2. Aguarde ~30 segundos
3. Teste novamente

## ⚠️ Problema Comum: Sticky Sessions

Se tiver múltiplas instâncias, habilite **ARR Affinity**:

1. Vá em **Configuração** → **Configurações gerais**
2. **ARR affinity**: ON
3. Salvar e reiniciar

Isso garante que o usuário sempre se conecta à mesma instância.

## 🐛 Debug

Se ainda não funcionar:

1. ✅ WebSockets habilitados no Portal?
2. ✅ web.config foi enviado no deploy?
3. ✅ App Service foi reiniciado após mudanças?
4. ✅ Frontend usa `transports: ['polling']`?
5. ✅ CORS configurado corretamente?

## 📝 Checklist Final

- [ ] WebSockets: ON no Portal Azure
- [ ] Always On: ON no Portal Azure
- [ ] ARR Affinity: ON no Portal Azure
- [ ] web.config enviado no deploy
- [ ] Backend: `transports: ["polling"]` ✅
- [ ] Frontend: `transports: ["polling"]`
- [ ] App Service reiniciado
- [ ] Testar conexão

## 🎯 Resultado Esperado

```
✅ Socket: Conectado! ID: svLNnDevjyJGxEjnAACR
🚪 Socket: Fazendo join na sala 29U6MM
🎮 Jogador entrou: { userId: "...", username: "yago" }
```

Sem erros de WebSocket no console! 🚀
