# Scripts de Palavras - Documentação

## Validação de Consistência

### `npm run words:validate`

Verifica se todas as palavras de `palavras_5_letras.txt` (palavras que podem ser sorteadas) estão presentes em `words-five-letters.txt` (palavras aceitas como guess).

**Quando usar:**
- Após modificar manualmente qualquer arquivo de palavras
- Antes de fazer deploy
- Para diagnosticar problemas com validação de palavras

**Exemplo de saída:**
```
🔍 Validando consistência entre os arquivos de palavras...

📊 Estatísticas:
   palavras_5_letras.txt: 2189 palavras
   words-five-letters.txt: 8711 palavras

✅ Tudo certo!
   Todas as palavras de palavras_5_letras.txt estão presentes em words-five-letters.txt.
   O jogo funcionará corretamente (palavras sorteadas podem ser usadas como guess).
```

**Se houver problema:**
```
❌ PROBLEMA ENCONTRADO!
   5 palavras de palavras_5_letras.txt NÃO estão em words-five-letters.txt:

   - RUIVA
   - TESTE
   ...

⚠️  Isso significa que essas palavras podem ser sorteadas no modo infinito,
   mas os jogadores NÃO poderão usá-las como guess (validação falhará)!

💡 Execute: npm run words:add-word RUIVA (para adicionar uma por vez)
```

---

## Adicionar Palavra

### `npm run words:add-word <PALAVRA>`

Adiciona uma palavra de 5 letras em:
1. `dados/palavras_5_letras.txt` (palavras sorteáveis)
2. `dados/words-five-letters.txt` (palavras aceitas como guess)
3. Banco de dados MongoDB (coleção `wordsbankentries`)

**Exemplo:**
```bash
npm run words:add-word RUIVA
```

**Saída:**
```
🔤 Adicionando palavra: RUIVA

✅ Adicionada em: palavras_5_letras.txt
✅ Adicionada em: words-five-letters.txt
🔌 Conectado ao MongoDB
✅ Adicionada no banco de dados (WordsBankEntry)

✨ Concluído! A palavra "RUIVA" foi adicionada com sucesso.
```

**Se a palavra já existir:**
```
🔤 Adicionando palavra: RUIVA

ℹ️  Já existe em: palavras_5_letras.txt
ℹ️  Já existe em: words-five-letters.txt
🔌 Conectado ao MongoDB
ℹ️  Já existe no banco de dados

✨ Concluído! A palavra "RUIVA" foi adicionada com sucesso.
```

**Validações:**
- Palavra deve ter exatamente 5 letras
- Remove acentos automaticamente (ÁGUA → AGUAS)
- Converte para maiúsculas
- Mantém arquivos ordenados alfabeticamente
- Não adiciona duplicatas

---

## Arquitetura

### `palavras_5_letras.txt`
- **Uso:** Palavras que podem ser sorteadas nos puzzles diários e modo infinito
- **Quantidade:** ~2.189 palavras
- **Local:** `dados/palavras_5_letras.txt`
- **Serviço:** `WordsBankService` (via MongoDB)

### `words-five-letters.txt`
- **Uso:** Palavras aceitas como palpites válidos
- **Quantidade:** ~8.711 palavras (contém todas de `palavras_5_letras.txt` + extras)
- **Local:** `dados/words-five-letters.txt`
- **Serviço:** `WordsDictionaryService`

### Fluxo de Validação

1. **Jogador envia palpite** → `WordsDictionaryService.isAllowed()` verifica em `words-five-letters.txt`
2. **Sistema sorteia palavra** → `WordsBankService.getRandomWord()` busca de `palavras_5_letras.txt` (via MongoDB)

**Regra Crítica:** Toda palavra em `palavras_5_letras.txt` DEVE estar em `words-five-letters.txt`, senão o jogo quebra (palavra sorteada mas não aceita como guess).

---

## Outros Scripts

### `npm run words:import`
Importa todas as palavras de `palavras_5_letras.txt` para o MongoDB.

### `npm run words:seed-user`
Cria usuário de teste.

### `npm run words:reset-progress`
Reseta progresso de um usuário específico.

---

## Troubleshooting

### "Palavra foi sorteada mas não é aceita como guess"
1. Execute `npm run words:validate`
2. Adicione a palavra faltante: `npm run words:add-word <PALAVRA>`

### "Palavra não aparece no MongoDB após adicionar"
- Verifique se o MongoDB está rodando
- Execute `npm run words:import` para reimportar todas as palavras

### "Palavra tem acento"
O script remove acentos automaticamente:
- ÁGUA → AGUA
- JOSÉ → JOSE
- MAÇÃ → MACA
