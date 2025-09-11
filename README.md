# **Cerno : Agentic Deep Research**

![License](https://img.shields.io/badge/license-MIT-blue)
![Local-First](https://img.shields.io/badge/local--first-true-ff69b4)
<a href="https://www.producthunt.com/products/cerno-agentic-local-deep-research?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-cerno&#0045;agentic&#0045;local&#0045;deep&#0045;research" target="_blank">
  <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=976447&theme=dark&t=1749537767333" alt="Cerno on Product Hunt" style="display:inline-block; vertical-align:middle; height:20px; margin-bottom: 14px;" />
</a>

Cerno is an open-source workspace for conducting **deep**, **multi-step** research and analysis using autonomous AI agents. Designed for developers and researchers who demand **analytical transparency**, Cerno exposes every reasoning step—from prompt decomposition to final synthesis—so you can observe, debug, and steer complex agentic workflows with confidence.

![Cerno](screenshots/browser.png)

## 📚 Table of Contents

1. [Highlights](#-highlights)
2. [Local-First Principles](#-local-first-principles)
3. [Active Development & Community](#️-active-development--community)
4. [Prerequisites](#-prerequisites)
5. [Docker Installation](#-docker-installation)
6. [CLI Reference](#️-cli-reference)
7. [Project Structure](#-project-structure)
8. [Screenshots](#-screenshots)
9. [Use Cases](#-use-cases)
10. [Roadmap](#-roadmap)
11. [Security & Privacy](#-security--privacy)
12. [Contributing](#-contributing)
13. [License](#-license)

---

## 🚀 Highlights

* **Model-Agnostic Core**: Effortlessly switch between premier LLMs (OpenAI, Google Gemini, Anthropic, DeepSeek) or run local models via Ollama.
* **Zero-Config Setup**: One CLI, one command—automatically create a virtual environment, install dependencies, and configure your workspace.
* **Transparent Execution Plan**: Visualize each agent task as it moves through Pending → Running → Success/Error states in real time.
* **Verifiable Artifacts**: Every source, webpage, and generated file (reports, code, data) is tracked and organized for easy auditing.
* **Adaptive Depth**: Simple queries spawn lightweight plans; complex directives trigger multi-agent, multi-tool orchestrations.
* **Token & Cost Optimization**: A manager-worker agent architecture balances quality and cost. Get a complete cost breakdown upon task completion.
* **Local-First Ethos**: Work offline, retain full control of your data, and avoid vendor lock-in. Cerno’s local-first architecture ensures your research stays where you want it: on your machine.

---

## 🌱 Local-First Principles

Cerno embraces a **local-first** philosophy:

1. **Data Sovereignty**: All research artifacts—notes, reports, intermediate files—live on your local drive by default.
2. **Offline Capability**: Core features work without internet. Use local LLMs (via Ollama) for research when connectivity is limited.
3. **Privacy & Security**: Sensitive prompts and outputs never leave your machine unless explicitly configured.
4. **Interoperability**: Write, export, and share results in standard formats (Markdown, Jupyter notebooks, JSON) without proprietary lock-in.

---

## 🛡️ Active Development & Community

Cerno is under **active development**—we’re constantly pushing new features, performance optimizations, and integrations. Your feedback is invaluable:

* **Bug Reports**: Found an issue? Please open an issue on GitHub with detailed steps to reproduce.
* **Feature Requests**: Have a great idea? Share it as an issue or discussion ticket.
* **Contributions**: We welcome pull requests! See our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on setting up your dev environment, coding standards, and how to submit changes.

Let’s build something amazing together! 🚀

## 📦 Prerequisites

* **Python** ≥ 3.10
* **Node.js** ≥ 18.x & **npm**

---

## 🐳 Docker Installation

Docker is the official method of installation for Cerno Deep Research.
To use Cerno, follow the steps below:

1. Clone and set up `.env` using the example `.env.example`.
2. Build and launch with Docker Compose:

   ```bash
   docker-compose up --build
   ```
3. Visit [http://localhost:5173](http://localhost:5173).

---


## 📁 Project Structure

```
├── cerno             # CLI bootstrap scripts
├── cerno_cli.py      # Click-based command definitions
├── api/              # Django backend
│   ├── core/         # Settings, wsgi, asgi
│   ├── api/          # Views, serializers, URLs
│   └── agents/       # Agent definitions & tools
├── frontend/         # React + Vite app
├── agent_outputs/    # Generated reports, code, data
├── knowledge_sources/# Ingested docs for knowledge base
├── pyproject.toml    # Dependencies & CLI entry point
└── docker-compose.yml
```

---

## 📸 Screenshots

<details>
<summary>Expand to view screenshots</summary>

![Cerno Homepage](screenshots/homepage.png)

![File Sources](screenshots/sources.png)

![File Browser](screenshots/browser.png)

</details>

---

## 💼 Use Cases

* **Academic Research**: Automate literature reviews, data extraction, and report generation.
* **Market Analysis**: Compile insights from news sources, financial data, and social media.
* **Competitive Intelligence**: Track competitor tooling and summarize key findings.
* **Product Development**: Prototype multi-agent workflows for user testing and iterative design.

---

## 📈 Roadmap

* **v1.1** (Q3 2025): More integrations, advanced visualization modules, and collaborative workspaces.
* **v1.2** (Q4 2025): Plugin support, permissioned sharing, and audit trails.
* **Future**: Community-driven integrations, mobile-first UI, and expanded local model support.

---

## 🔒 Security & Privacy

* **Encrypted Secrets**: API keys and sensitive data encrypted at rest.
* **Audit Logs**: Full history of agent actions and user interactions.

---


## 🤝 Contributing

Contributions are welcome! Fork, develop, and submit a pull request. For major features, please open an issue first to discuss design and scope.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE.md) for details.
