# Glossário — Brazilian Portuguese game vocabulary

One word per idea, everywhere. Struct-type data (classes, weapons, abilities)
is in `runtime/terms.json`; this page is for everything else and agrees with it.

## Voice

- Brazilian Portuguese, never European: `você`, `tela`, `arquivo`, `celular`,
  gerund for ongoing action (`carregando`, not `a carregar`).
- Players are strategy gamers, not crypto users. The chain stays out of sight:
  no blockchain, carteira, token, transação, gas, assinatura where a game word
  does the job (see the table). webapp's English is mostly game words already.
- Narration, help text and system messages: clear and direct, addressing
  `você`, with the imperative in the usual Brazilian form (`Toque`, `Selecione`,
  `Confirme`).
- HR Bot and corporate callers: polite, a little stiff and cheerful, like
  corporate HR speak (`Prezado Comandante`, `Boas-vindas`).
- Buttons, tabs and menu items: infinitive or a short noun (`Confirmar`,
  `Cancelar`, `Atacar`, `Perfil`).
- Titles and buttons follow webapp's capitalisation only where it is a heading:
  Portuguese capitalises the first word and proper nouns; game terms that
  webapp capitalises mid-sentence as named things keep their capitals.
- The player's gender is unknown. Prefer forms that need none: `Boas-vindas`,
  not `Bem-vindo`; `Comandante`; `sua conta`. Where a noun must be chosen, the
  generic `jogador` is fine.
- Portuguese runs about a quarter longer than English and the UI is narrow,
  set in wide pixel fonts. Choose the shorter of two good words for buttons,
  tabs, badges and stat labels.
- Counts: exact replacement can't choose a singular or a plural, so write a
  label and a value (`Membros: ${memberCount}`).
- Numbers, units and ids stay as they are: `W`, `kW`, `g`, `PID`, `#`, `1-42`.
- Characters: pt-BR letters and `— – … “ ” ‘ ’ º ª °` are drawn for webapp's
  pixel fonts (`art/fonts.py`). Anything else falls back to a system font.

## Words

| English | Português |
|---|---|
| Structs (the game) | Structs (a name; the interface is estrut.net) |
| Struct (a unit or building) | Estrutura |
| Player | Jogador |
| Commander | Comandante |
| Guild | Guilda |
| Guild member | Membro da guilda |
| Member Roster | Lista de Membros |
| Corporation, Corp | Corporação (names such as SN Corp stay) |
| HR Bot | Bot de RH |
| Planet | Planeta |
| Planetary Shield | Escudo Planetário |
| Shield | Escudo |
| Planetary Defense | Defesa Planetária |
| Fleet | Frota |
| On station / away | Em posição / Em missão |
| Raid | Incursão |
| Raider / Defender | Invasor / Defensor |
| Attack / Defend / Move | Atacar / Defender / Mover (nouns: Ataque / Defesa / Movimento) |
| Primary / Secondary Weapon | Arma Primária / Arma Secundária |
| Counter-Attack | Contra-ataque |
| Stealth (Mode) | Furtividade, Modo Furtivo |
| Evade | Esquivar, Esquiva |
| Target | Alvo |
| Battleground | Campo de Batalha |
| Ambit: Space / Air / Land / Water | Espaço / Ar / Terra / Água |
| Tile / Slot | Setor / Slot |
| Deploy | Implantar, Implantação |
| Build | Construir, Construção |
| Mine / Mining | Minerar / Mineração |
| Refine / Refining | Refinar / Refino |
| Alpha Matter | Matéria Alfa |
| Alpha (amount) | Alfa |
| Alpha Ore, Ore | Minério Alfa, Minério |
| Energy | Energia |
| Power, Watts | Potência, W |
| Capacity / Load | Capacidade / Consumo |
| Charge | Carga |
| Battery | Bateria |
| Online / Offline (a struct) | Ativa / Inativa |
| Activate / Deactivate | Ativar / Desativar |
| Destroyed | Destruída (a struct), Destruído |
| Reactor | Reator |
| Substation | Subestação |
| Infuse / Infusion | Infundir / Infusão |
| Defuse | Retirar Infusão, Retirada |
| Consume Alpha | Consumir Alfa |
| Generator | Gerador |
| Transfer, Send (alpha) | Transferir, Enviar, Transferência |
| Recipient | Destinatário |
| Transaction History | Histórico |
| Username | Nome de usuário |
| Player ID (PID) | ID do Jogador |
| Profile | Perfil |
| Account | Conta |
| Device | Dispositivo |
| Activate a device, activation code | Ativar dispositivo, código de ativação |
| Approve | Aprovar |
| Recovery Key | Chave de Recuperação |
| Log in / Log out | Entrar / Sair |
| Sign up, New Player | Novo Jogador |
| Returning Player | Já Tenho Conta |
| Orientation | Integração |
| Combat Training (tutorial) | Treinamento de Combate |
| Scan | Escanear, Varredura |
| Victory / Defeat | Vitória / Derrota |
| Loading | Carregando |
| Confirm / Cancel / Back / Close | Confirmar / Cancelar / Voltar / Fechar |
| Settings | Configurações |
| Directory | Diretório |
| Leaderboard | Classificação |
| Task, Executing | Tarefa, Em execução |
| Signal Jamming | Interferência de Sinal |
| Smart / Ballistic Weapon | Arma Inteligente / Balística |
| Gatling / Missile / Torpedo / Cannon | Gatling / Míssil / Torpedo / Canhão |
| Damage (DMG) | Dano |
| Health (HP) | Integridade |
| Secure / Vulnerable / Breached (shield) | Seguro / Vulnerável / Rompido |
| Breach, Breach Countdown | Ruptura, Contagem para Ruptura |
| Ore Reserves | Reservas de Minério |
| Inspect (long-press) | Inspecionar |
| Alpha Base | Base Alfa |
| Cooldown | Tempo de espera |
| Commission | Comissão |
| Name Redacted | Nome Oculto |
| Account address | Endereço da conta |
| Non-Player Address | Endereço de Não Jogador |
| Transfer Assets (permission) | Transferir Recursos |
| Signing paused | Envio de ordens pausado |
| Device seal | Selo do Dispositivo |
| Account Management (permission) | Gestão de Dispositivos |
| Structs Conglomerate | Conglomerado Structs |
| Alpha Star Council | Conselho da Estrela Alfa |
| Synthetic Resources Officer | Oficial de Recursos Sintéticos |
| Employee Orientation | Integração de Funcionários |
| Galactic Codex | Códice Galáctico |
| Hoag (System) / Trydor | Hoag (Sistema) / Trydor |
| Play Structs | Jogar Structs |
| Display Name | Nome de usuário |
| Blockchain / wallet address | Endereço da Conta |
| Confirmed on chain | Transferência confirmada, Alteração confirmada |
| Transaction (shown to a player) | Transferência (`ordens` where it means queued actions) |
| Ore Mined | Minério Extraído |
| Energy Usage | Consumo de Energia |
| Power Generation | Potência Gerada |
| Employee | Integrante (avoids gender) |
| Stay Logged In | Manter Sessão |
| N/A | N/D |
| [REDACTED] | [OCULTO] |

Struct names (the same as `runtime/terms.json`): Nave de Comando, Encouraçado,
Caça Estelar, Fragata, Caça de Perseguição, Bombardeiro Furtivo, Interceptador
de Alta Altitude, Artilharia Móvel, Tanque, Lançador SAM, Cruzador, Destróier,
Submersível, Extrator de Minério, Refinaria de Minério, Gerador de Escudo
Orbital, Satélite de Interferência, Bunker de Minério, Canhão de Defesa
Planetária, Gerador de Campo, Usina Continental, Motor Mundial. `Estrutura` is
feminine: `Estrutura destruída`. In the lore, the machine race is `Estruturas`,
capitalised. Model names (Spearpoint, Rolling Thunder, …) and model numbers stay
in English.
