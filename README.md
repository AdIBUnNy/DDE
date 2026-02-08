# DDE AI Data Pipeline Architect

A front-end application for designing data pipeline architectures. It synthesizes an Airflow DAG, supporting infrastructure files, and monitoring guidance from a prompt, then lets you visualize and interact with the DAG, simulate execution, and download a project bundle.

## What This Project Does

From a single prompt, the app generates:
- A full Airflow DAG (Python) based on your requirements.
- A Dockerfile for a containerized runtime.
- A requirements list for Python dependencies.
- A pipeline topology graph with interactive nodes.
- Operational metrics and validation hints.

You can refine results iteratively, accept a final version, save DAG layouts, and export a ready-to-run project ZIP.

## Key Features

- Prompt-driven pipeline generation.
- Reference file upload to add context.
- Iterative refinement workflow with accept/reject.
- DAG topology visualization with pan/zoom and draggable nodes.
- Saveable layout state for DAG positioning.
- Simulation panel for a live run preview.
- Downloadable project bundle (DAG + Dockerfile + requirements).
- Schedule configuration with deploy feedback.

## Tech Stack

- React 19 + Vite 6 (TypeScript)
- D3 for graph layout and rendering
- Lucide icons for UI
- JSZip for client-side ZIP downloads
- OpenAI-compatible API client (via configured gateway)

## Project Structure

```text
.
├─ App.tsx
├─ index.html
├─ index.tsx
├─ types.ts
├─ components/
│  ├─ CodeBlock.tsx
│  ├─ PipelineGraph.tsx
│  └─ Sidebar.tsx
├─ services/
│  └─ geminiService.ts
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## How It Works

1. The prompt (plus optional reference file and refinement feedback) is sent to the AI model.
2. The model returns a strict JSON payload for the pipeline definition.
3. The UI renders:
   - DAG code
   - Dockerfile
   - Steps + dependencies
   - Validation summary
   - Monitoring KPIs
4. The DAG graph is drawn and can be panned/zoomed. Nodes can be dragged and saved.
5. The Run Panel simulates execution and produces a mock output stream.
6. The Download panel packages a minimal project structure into a ZIP.

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- A compatible AI API endpoint and key

### Install

```bash
npm install
```

### Environment Configuration

Create `.env.local` in the project root:

```bash
VITE_API_KEY=your_api_key_here
VITE_API_BASE=https://your-api-gateway.example.com/v1/
VITE_MODEL=your-model-name
```

Notes:
- `VITE_API_KEY` is required.
- `VITE_API_BASE` is optional if your SDK defaults to the public endpoint.
- `VITE_MODEL` defaults to `gwdg.mistral-large-instruct` if unset.

### Run Locally

```bash
npm run dev
```

Open the app at the URL shown in your terminal (usually http://localhost:5173).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Using the App

### Generate a Pipeline

1. Enter a prompt in the System Requirements box.
2. (Optional) upload a reference file.
3. Click **Synthesize Architecture**.

### Refine or Accept

- **Refine Design** lets you provide feedback for a new iteration.
- **Accept & Store** saves the version to the timeline.

### DAG Schema Interactions

- Drag nodes to rearrange the layout.
- Pan/zoom the canvas.
- Click **Save Layout** to persist node positions for that pipeline.

### Schedule Configuration

- Choose a schedule type.
- For cron, input a valid expression.
- Click **Deploy Timers** to confirm settings.

### Download Project

Under the Run Panel, click **Download** to export a ZIP containing:

```text
project/
  dags/<pipeline_name>.py
  infrastructure/Dockerfile
  requirements.txt
  README.md
```

## Security Notes

This app runs entirely in the browser. Your API key is used client-side, which means:
- Do not expose a production key in a public build.
- Use a gateway proxy or restricted key where possible.

## Troubleshooting

- **Missing API key**: ensure `.env.local` contains `VITE_API_KEY`.
- **Empty or invalid JSON**: confirm the model supports JSON responses.
- **Schedule deploy error**: for cron, provide a valid cron expression.

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - build production bundle
- `npm run preview` - preview production build

## License

Add your license here.
# DDE
