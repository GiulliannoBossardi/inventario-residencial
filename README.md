# 🏠 Inventário Residencial

Painel web para gerenciamento de itens residenciais, orçamentos e avaliações por cômodo — com login, múltiplos usuários, tema claro/escuro e exportação Excel.

---

## 📁 Estrutura do Repositório

```
inventario-residencial/
├── index.html   ← Estrutura HTML e referências
├── style.css    ← Estilos (tema claro, escuro, responsivo)
├── script.js    ← Toda a lógica da aplicação
└── README.md    ← Este arquivo
```

---

## 🚀 Como usar localmente

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/inventario-residencial.git
cd inventario-residencial
```

2. Abra o `index.html` diretamente no navegador.
> Não requer servidor, build ou instalação de dependências.

3. Acesso padrão:
- **Usuário:** `admin`
- **Senha:** `admin123`

> ⚠️ Altere a senha padrão após o primeiro acesso em Configurações → Usuários.

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---|---|
| 🔐 Login | Autenticação por usuário e senha |
| 📊 Dashboard | Gráfico de rosca + resumo de valores por cômodo |
| 🛋️ Cômodos | Cadastro de itens com descrição, marca, qtd e valor |
| 🔍 Avaliação | Orçamentos com link, observações e aprovação/reprovação |
| 📤 Exportação | Arquivos `.xlsx` com formatação monetária (R$) |
| ⚙️ Configurações | Gerenciamento de cômodos e usuários |
| 👥 Usuários | Criação, remoção e alteração de senha por perfil |
| 🌙 Tema | Alternância entre modo claro e escuro |
| 💾 Persistência | Dados salvos no `localStorage` do navegador |

---

## 👤 Perfis de Acesso

| Perfil | Permissões |
|---|---|
| **Administrador** | Acesso total: criar/remover usuários, alterar qualquer senha |
| **Usuário** | Gerenciar itens e cômodos, alterar apenas a própria senha |

---

## 🛠️ Tecnologias

- **HTML5 / CSS3 / JavaScript** — puro, sem frameworks
- **[Chart.js 4.4](https://www.chartjs.org/)** — gráfico de rosca
- **[SheetJS (xlsx 0.18)](https://sheetjs.com/)** — exportação Excel
- **localStorage** — persistência de dados local

---

## ☁️ Deploy no Vercel

1. Faça push dos arquivos para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**
3. Importe o repositório GitHub
4. Em **Configure Project**, deixe os campos assim:
   - **Framework Preset:** `Other`
   - **Root Directory:** *(vazio)*
   - **Build Command:** *(vazio)*
   - **Output Directory:** *(vazio)*
5. Clique em **Deploy** ✅

---

## ⚠️ Segurança

As senhas são armazenadas com um hash simples no `localStorage`. Este projeto é voltado para **uso pessoal/local**. Para ambientes multiusuário em rede, recomenda-se um backend com bcrypt, JWT e HTTPS.

---

## 📄 Licença

[MIT](https://opensource.org/licenses/MIT)
