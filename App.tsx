import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Zap, Loader2, FileCode, Package, Activity, Info, AlertCircle, Workflow, 
  Database, Layers, Clock, ToggleLeft, ToggleRight, CheckCircle2, Server, Trash2, 
  Settings as SettingsIcon, Plus, History as HistoryIcon, GitBranch, Save, 
  ChevronRight, Play, Terminal, ShieldCheck, RefreshCw, XCircle, BarChart3, 
  Cpu, Gauge, Sun, Moon, Upload, FileText, CalendarDays, Rocket, Table, Archive, ExternalLink,
  Filter, PlusCircle, Search, Link2, MoreVertical, Timer, Compass, Download, Folder
} from 'lucide-react';
import JSZip from 'jszip';
import Sidebar, { ViewType } from './components/Sidebar';
import CodeBlock from './components/CodeBlock';
import PipelineGraph from './components/PipelineGraph';
import { generatePipeline } from './services/geminiService';
import { GeneratedPipeline, PipelineStatus, PipelineStep, PipelineSchedule, ScheduleType } from './types';

const DEFAULT_PROMPT = `Create an Airflow DAG that fetches finance api:
1. Read a CSV file containing finance readings from S3,
2. Fill missing values with the median of each column,
3. Fill missing values using forward-fill method,
4. Clean Finance Data,
5. Calculate new financial metrics: daily return and moving average,
6. Aggregate data by sector,
7. Store the results in PostgreSQL,
8. Log completion or errors.`;

const STAGES = [
  "Parsing requirements data...",
  "Contextualizing MBSE artifacts...",
  "Computing architecture DAG...",
  "Generating Python Airflow definitions...",
  "Performing logic validation...",
  "Finalizing container config..."
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [result, setResult] = useState<GeneratedPipeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<{ name: string; content: string } | null>(null);
  const [schedule, setSchedule] = useState<PipelineSchedule>({ type: 'once' });
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'deployed' | 'error'>('idle');
  const [dagPositions, setDagPositions] = useState<Record<string, Record<string, { x: number; y: number }>>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [outputPreview, setOutputPreview] = useState<any[] | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState("");
  const progressIntervalRef = useRef<number | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [liveMetrics, setLiveMetrics] = useState({ cpu: 0, ram: 0, tps: 0 });

  const [versions, setVersions] = useState<GeneratedPipeline[]>([]);
  const [history, setHistory] = useState<GeneratedPipeline[]>([]);
  
  const [dataSources, setDataSources] = useState([
    { id: 'ds-1', name: 'Finance S3 Bucket', type: 'AWS S3', status: 'connected', region: 'us-east-1', lastCheck: '2m ago' },
    { id: 'ds-2', name: 'Market Data PostgreSQL', type: 'PostgreSQL', status: 'connected', region: 'eu-central-1', lastCheck: '14m ago' },
    { id: 'ds-3', name: 'AlphaVantage API', type: 'REST API', status: 'error', region: 'global', lastCheck: '1h ago' },
  ]);
  const [openDataSourceMenuId, setOpenDataSourceMenuId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReferenceFile({
          name: file.name,
          content: ev.target?.result as string
        });
      };
      reader.readAsText(file);
    }
  };

  const startSimulatedProgress = () => {
    setProgress(0);
    setCurrentStage(STAGES[0]);
    let currentIdx = 0;
    progressIntervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev < 95) {
          const next = prev + Math.random() * 5;
          const stageIdx = Math.min(Math.floor((next / 100) * STAGES.length), STAGES.length - 1);
          if (stageIdx !== currentIdx) {
            currentIdx = stageIdx;
            setCurrentStage(STAGES[currentIdx]);
          }
          return next;
        }
        return prev;
      });
    }, 450);
  };

  const stopSimulatedProgress = (success: boolean) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (success) {
      setProgress(100);
      setCurrentStage("Synthesis Complete!");
      setTimeout(() => {
        setProgress(0);
        setCurrentStage("");
      }, 2500);
    } else {
      setProgress(0);
      setCurrentStage("");
    }
  };

  const generatePipelineId = () => {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }

    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  };

  const handleGenerate = async (suggestion?: string) => {
    if (!prompt.trim()) return;
    setStatus('generating');
    setError(null);
    setIsSimulating(false);
    setActiveStepId(null);
    setSimulationLogs([]);
    setOutputPreview(null);
    startSimulatedProgress();
    
    try {
      const pipeline = await generatePipeline(
        prompt, 
        referenceFile || undefined, 
        suggestion, 
        result?.airflowCode
      );
      const newPipeline = { 
        ...pipeline, 
        id: generatePipelineId(), 
        timestamp: Date.now(),
        version: `v1.0.${history.length + 1}`
      };
      setResult(newPipeline);
      setHistory(prev => [newPipeline, ...prev]);
      setStatus('completed');
      stopSimulatedProgress(true);
    } catch (err: any) {
      setError(err.message || 'Architecture computation failed.');
      setStatus('error');
      stopSimulatedProgress(false);
    }
  };

  const runSimulation = () => {
    if (!result) return;
    setIsSimulating(true);
    setSimulationLogs(["[SYSTEM] Initializing Runtime...", "[INFO] Validating logic paths..."]);
    setSimulationProgress(0);
    
    let stepIdx = 0;
    const interval = window.setInterval(() => {
      if (stepIdx < result.steps.length) {
        const step = result.steps[stepIdx];
        setActiveStepId(step.id);
        setLiveMetrics({
            cpu: Math.floor(15 + Math.random() * 25),
            ram: Math.floor(30 + Math.random() * 20),
            tps: Math.floor(400 + Math.random() * 400)
        });
        setSimulationLogs((prev) => [...prev, `[RUNNING] Task Execution: ${step.name}`]);
        setSimulationProgress(((stepIdx + 1) / result.steps.length) * 100);
        stepIdx++;
      } else {
        setSimulationLogs((prev) => [...prev, "[SUCCESS] Architecture Verified.", "[INFO] Ready for deployment."]);
        setActiveStepId(null);
        setLiveMetrics({ cpu: 1, ram: 8, tps: 0 });
        setOutputPreview([
          { id: 'TX-01', metric: 'Daily ROI', val: '$14.2B', delta: '+2.4%', status: 'Finalized' },
          { id: 'TX-02', metric: 'Risk Ratio', val: '0.42', delta: '-0.1%', status: 'Stored' },
          { id: 'TX-03', metric: 'Latent Vol', val: '1.24', delta: '+0.8%', status: 'Finalized' }
        ]);
        window.clearInterval(interval);
        setTimeout(() => setIsSimulating(false), 2000);
      }
    }, 700);
  };

  const handleAcceptArchitecture = () => {
    if (!result) return;
    const acceptedPipeline = { ...result, isAccepted: true };
    setResult(acceptedPipeline);
    setVersions((prev) => [acceptedPipeline, ...prev]);
  };

  const handleProvisionNode = () => {
    const name = window.prompt('Data source name:', 'New Data Source');
    if (!name) return;
    const type = window.prompt('Type (e.g., AWS S3, PostgreSQL, REST API):', 'REST API') || 'Unknown';
    const region = window.prompt('Region (e.g., us-east-1, global):', 'global') || 'global';
    const id = `ds-${Date.now().toString(36)}`;

    setDataSources((prev) => [
      {
        id,
        name,
        type,
        status: 'connected',
        region,
        lastCheck: 'just now'
      },
      ...prev
    ]);
  };

  const handleLinkSettings = (id: string) => {
    const target = dataSources.find((ds) => ds.id === id);
    if (!target) return;
    const name = window.prompt('Update name:', target.name) || target.name;
    const type = window.prompt('Update type:', target.type) || target.type;
    const region = window.prompt('Update region:', target.region) || target.region;
    const statusInput = window.prompt('Status (connected|error):', target.status) || target.status;
    const status = statusInput === 'error' ? 'error' : 'connected';

    setDataSources((prev) =>
      prev.map((ds) =>
        ds.id === id
          ? {
              ...ds,
              name,
              type,
              region,
              status,
              lastCheck: 'just now'
            }
          : ds
      )
    );
  };

  const handleDeleteDataSource = (id: string) => {
    setDataSources((prev) => prev.filter((ds) => ds.id !== id));
    setOpenDataSourceMenuId((prev) => (prev === id ? null : prev));
  };

  const buildProjectZipName = (pipelineName: string) =>
    `${pipelineName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_project.zip`;

  const handleDownloadProject = async () => {
    if (!result) return;
    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const safeName = result.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

      zip.file(`dags/${safeName}.py`, result.airflowCode || '# No DAG code generated');
      zip.file('infrastructure/Dockerfile', result.dockerConfig || '# No Dockerfile generated');
      zip.file('requirements.txt', (result.requirements || []).join('\n'));
      zip.file(
        'README.md',
        `# ${result.name}\n\n${result.description}\n\n## Files\n- dags/${safeName}.py\n- infrastructure/Dockerfile\n- requirements.txt\n`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = buildProjectZipName(result.name || 'pipeline');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeployTimers = () => {
    if (schedule.type === 'cron' && !schedule.cronValue?.trim()) {
      setDeployStatus('error');
      return;
    }

    setDeployStatus('deploying');
    window.setTimeout(() => {
      setDeployStatus('deployed');
    }, 800);
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <Zap className="text-blue-500 w-5 h-5" />
                <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>System Requirements</h3>
            </div>
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-[10px] text-blue-500 hover:text-blue-400 cursor-pointer uppercase tracking-widest font-black transition-colors">
                    <Upload size={14} /> 
                    {referenceFile ? `Using: ${referenceFile.name}` : 'Reference File'}
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
                <div className="w-px h-3 bg-gray-800"></div>
                <button onClick={() => setPrompt(DEFAULT_PROMPT)} className="text-[10px] text-gray-500 hover:text-blue-500 uppercase tracking-widest font-black">Reset</button>
            </div>
        </div>
        <div className="relative group">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={`w-full h-40 border rounded-3xl p-8 focus:outline-none focus:ring-2 focus:ring-blue-600/40 transition-all resize-none shadow-2xl text-sm leading-relaxed font-medium ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800 text-white shadow-black/50' : 'bg-white border-gray-200 text-gray-900 shadow-gray-200'}`}
            placeholder="Describe the desired pipeline logic..."
          />
          <button
            onClick={() => handleGenerate()}
            disabled={status === 'generating'}
            className={`absolute bottom-6 right-6 flex items-center gap-2 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
              status === 'generating' ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {status === 'generating' ? <><Loader2 className="w-4 h-4 animate-spin" /> Synthesizing...</> : <><Send className="w-4 h-4" /> Synthesize Architecture</>}
          </button>
        </div>
      </section>

      {error && (
        <div className="p-4 bg-red-900/10 border border-red-900/20 rounded-xl flex items-center gap-3 text-red-500 animate-in slide-in-from-top-2">
          <AlertCircle size={20} />
          <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col md:flex-row items-stretch gap-8">
            <div className="flex-1 flex flex-col gap-8">
                {result.isAccepted && (
                  <div className="flex items-center justify-between p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 rounded-lg shadow-[0_0_15px_#10b981]">
                        <CheckCircle2 size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">Architecture Accepted</p>
                        <p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-widest">Version {result.version} Locked into Timeline</p>
                      </div>
                    </div>
                    <button onClick={() => setView('versionControl')} className="text-[10px] font-black uppercase text-emerald-500 hover:underline px-4">View History</button>
                  </div>
                )}

                <div className={`p-8 rounded-2xl border shadow-2xl ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                          <ShieldCheck className="text-emerald-500 w-5 h-5" />
                          <h4 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Validation Summary</h4>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.validationSummary?.map((v, i) => (
                            <div key={i} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.01] ${
                                v.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' :
                                v.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/10 text-yellow-500' :
                                'bg-blue-500/5 border-blue-500/10 text-blue-400'
                            }`}>
                                <div className="mt-1">{v.type === 'success' ? <CheckCircle2 size={16} /> : v.type === 'warning' ? <AlertCircle size={16} /> : <Info size={16} />}</div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{v.type} alert</span>
                                  <span className="text-[12px] font-bold leading-relaxed">{v.message}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <PipelineGraph
                  steps={result.steps}
                  activeStepId={activeStepId}
                  theme={theme}
                  savedPositions={dagPositions[result.id || result.name || 'default']}
                  onSavePositions={(positions) =>
                    setDagPositions((prev) => ({
                      ...prev,
                      [result.id || result.name || 'default']: positions
                    }))
                  }
                />
            </div>

            <div className={`w-full md:w-60 border rounded-2xl p-4 flex flex-col shadow-2xl ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Rocket className="text-blue-500" size={18} />
                        <h4 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Run Panel</h4>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div className={`p-2 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div>
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Load</p>
                            <p className={`text-[14px] font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{liveMetrics.cpu}%</p>
                        </div>
                        <Cpu size={24} className="text-blue-500 opacity-20" />
                    </div>
                          <div className={`p-2 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div>
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Throughput</p>
                          <p className={`text-[14px] font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{liveMetrics.tps} tx/s</p>
                        </div>
                        <Layers size={24} className="text-purple-500 opacity-20" />
                    </div>
                </div>

                <div className={`flex-1 rounded-xl p-3 font-mono text-[10px] overflow-y-auto max-h-48 border mb-4 scrollbar-hide ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    {simulationLogs.map((log, i) => (
                      <div key={i} className={`mb-2 flex gap-2 ${log.includes('[SUCCESS]') ? 'text-emerald-500 font-bold' : 'text-gray-500'}`}>
                        <span className="opacity-30">❯</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    {isSimulating && <div className="h-4 w-1 bg-blue-500 animate-pulse ml-4 mt-1"></div>}
                </div>

                <button 
                  onClick={runSimulation}
                  disabled={isSimulating}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
                >
                    {isSimulating ? <Loader2 size={16} className="animate-spin" /> : <><Play size={16} /> Execute Logic</>}
                </button>

                <div className={`mt-4 rounded-xl border p-3 ${theme === 'dark' ? 'bg-black/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Folder size={14} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Download Project</span>
                    </div>
                    <button
                      onClick={handleDownloadProject}
                      disabled={!result || isDownloading}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        isDownloading
                          ? 'bg-gray-700 text-gray-300 cursor-wait'
                          : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      <Download size={12} /> {isDownloading ? 'Preparing...' : 'Download'}
                    </button>
                  </div>
                  <div className={`text-[10px] font-mono leading-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    <div className="flex items-center gap-2">
                      <span>project/</span>
                    </div>
                    <div className="pl-3">dags/</div>
                    <div className="pl-6">{result ? `${result.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.py` : 'pipeline.py'}</div>
                    <div className="pl-3">infrastructure/</div>
                    <div className="pl-6">Dockerfile</div>
                    <div className="pl-3">requirements.txt</div>
                    <div className="pl-3">README.md</div>
                  </div>
                </div>
            </div>
          </div>

          {outputPreview && (
              <div className={`p-8 rounded-3xl border animate-in fade-in slide-in-from-top-4 shadow-2xl ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-8">
                      <Table className="text-blue-500" size={20} />
                      <h4 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Output Data Stream</h4>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                          <thead>
                              <tr className={`border-b ${theme === 'dark' ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                  <th className="py-4 px-6 uppercase tracking-widest text-[9px] font-black">Node Index</th>
                                  <th className="py-4 px-6 uppercase tracking-widest text-[9px] font-black">Data Point</th>
                                  <th className="py-4 px-6 uppercase tracking-widest text-[9px] font-black">Value</th>
                                  <th className="py-4 px-6 uppercase tracking-widest text-[9px] font-black">Variance</th>
                                  <th className="py-4 px-6 uppercase tracking-widest text-[9px] font-black">Status</th>
                              </tr>
                          </thead>
                          <tbody>
                              {outputPreview.map((row, idx) => (
                                  <tr key={idx} className={`border-b transition-all ${theme === 'dark' ? 'border-gray-800/50 hover:bg-blue-500/5' : 'border-gray-100 hover:bg-blue-500/5'}`}>
                                      <td className="py-5 px-6 font-mono text-gray-500 font-bold">ARC-00{idx + 1}</td>
                                      <td className={`py-5 px-6 font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{row.metric}</td>
                                      <td className="py-5 px-6 font-black text-blue-500 text-sm">{row.val}</td>
                                      <td className={`py-5 px-6 font-black ${row.delta.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{row.delta}</td>
                                      <td className="py-5 px-6">
                                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                          row.status === 'Finalized' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                        }`}>{row.status}</span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <CodeBlock 
                title={`${result.name.toLowerCase().replace(/\s+/g, '_')}.py`}
                code={result.airflowCode} 
                theme={theme} 
                onAccept={handleAcceptArchitecture}
                onReject={(suggestion) => handleGenerate(suggestion)}
            />
            <div className="space-y-8">
              <CodeBlock title="infrastructure/Dockerfile" code={result.dockerConfig} language="dockerfile" theme={theme} codeHeightClass="h-[280px]" />
              <div className={`p-8 rounded-2xl border shadow-2xl ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
                <h5 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Activity size={16} className="text-emerald-500" /> Operational KPIs
                </h5>
                <div className="space-y-4">
                    {result.monitoringMetrics.map((m, i) => (
                        <div key={i} className={`flex items-center gap-3 p-4 rounded-xl transition-all border ${theme === 'dark' ? 'bg-black/50 border-gray-800 hover:border-blue-500/30' : 'bg-gray-50 border-gray-100 hover:border-blue-500/20'}`}>
                            <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{m}</span>
                        </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDataSources = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-2xl font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Resource Topology</h3>
          <p className="text-sm text-gray-500 font-medium">Manage input streams and MBSE artifact repositories.</p>
        </div>
        <button
          onClick={handleProvisionNode}
          className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all"
        >
          <PlusCircle size={18} /> Provision Node
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {dataSources.map(ds => (
          <div key={ds.id} className={`p-10 rounded-3xl border shadow-2xl transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-8">
              <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-black border-gray-800 text-blue-500' : 'bg-gray-50 border-gray-100 text-blue-600'}`}>
                <Database size={32} />
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                ds.status === 'connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}>
                {ds.status}
              </div>
            </div>
            <h4 className={`text-xl font-black tracking-tight mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ds.name}</h4>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest font-black mb-8">{ds.type}</p>
            <div className={`space-y-4 pt-8 border-t ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between text-[11px] text-gray-500 uppercase font-black">
                <span>Region</span>
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{ds.region}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 uppercase font-black">
                <span>Last Scan</span>
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{ds.lastCheck}</span>
              </div>
            </div>
            <div className="mt-10 flex gap-4 relative">
              <button
                onClick={() => handleLinkSettings(ds.id)}
                className={`flex-1 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-400 hover:text-white hover:border-gray-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900'}`}
              >
                Link Settings
              </button>
              <button
                onClick={() => setOpenDataSourceMenuId((prev) => (prev === ds.id ? null : ds.id))}
                className={`p-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-500 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-900'}`}
                aria-label="Open data source menu"
              >
                <MoreVertical size={20} />
              </button>
              {openDataSourceMenuId === ds.id && (
                <div
                  className={`absolute right-0 top-14 w-40 rounded-xl border shadow-xl z-20 ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}
                >
                  <button
                    onClick={() => handleDeleteDataSource(ds.id)}
                    className={`w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                  >
                    Delete Node
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPipelines = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-2xl font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Logic Library</h3>
          <p className="text-sm text-gray-500 font-medium">Repository of formally accepted and versioned DAGs.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border ${theme === 'dark' ? 'bg-black border-gray-800 focus-within:border-blue-500' : 'bg-white border-gray-200 focus-within:border-blue-500'}`}>
            <Search size={16} className="text-gray-500" />
            <input type="text" placeholder="Search version logs..." className="bg-transparent border-none text-[11px] uppercase font-black tracking-widest outline-none text-gray-400 min-w-[200px]" />
          </div>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="py-48 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-gray-800 rounded-[3rem]">
          <Workflow size={80} className="text-gray-600 mb-8" />
          <p className="text-2xl font-black uppercase tracking-[0.3em] text-gray-500">Library Vault Empty</p>
          <p className="text-sm text-gray-600 mt-4 font-bold uppercase tracking-widest">Accept architectures in the Dashboard to populate the library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {versions.map((p) => (
            <div key={p.id} className={`p-12 rounded-3xl border shadow-3xl flex flex-col min-h-[360px] ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-600/20 text-blue-500 shadow-lg shadow-blue-600/10">
                    <Layers size={32} />
                  </div>
                  <div>
                    <h4 className={`text-xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{p.name}</h4>
                    <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest">{p.version}</span>
                  </div>
                </div>
                <div className="px-5 py-2 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Production Root</div>
              </div>
              <p className="text-sm text-gray-500 mb-10 line-clamp-2 leading-relaxed font-medium">{p.description}</p>
              <div className={`flex items-center gap-6 pt-8 border-t mt-auto ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-gray-600" />
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Modified {new Date(p.timestamp || 0).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-10">
                <button 
                  onClick={() => { setResult(p); setView('dashboard'); }}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all active:scale-95"
                >
                  Recall to Workspace
                </button>
                <button className={`p-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-500 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-900'}`}>
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-600/20">
            <HistoryIcon size={24} className="text-blue-500" />
          </div>
          <div>
            <h3 className={`text-2xl font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Synthesis Log</h3>
            <p className="text-sm text-gray-500 font-medium mt-1">Global audit trail of architectural generation attempts.</p>
          </div>
        </div>
        <button className={`p-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-500 hover:text-white' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900'}`}>
          <Filter size={20} />
        </button>
      </div>

      {history.length === 0 ? (
        <div className="py-48 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-gray-800 rounded-[3rem]">
          <Terminal size={80} className="text-gray-600 mb-8" />
          <p className="text-2xl font-black uppercase tracking-[0.3em] text-gray-500">Audit Vault Empty</p>
          <p className="text-sm text-gray-600 mt-4 font-bold uppercase tracking-[0.2em]">Start a new synthesis to begin logging metadata snapshots.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((h, i) => (
            <div key={h.id || i} className={`p-8 rounded-3xl border flex items-center justify-between group transition-all hover:scale-[1.01] hover:shadow-2xl ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800 hover:border-blue-500/40' : 'bg-white border-gray-200 hover:border-blue-500/20'}`}>
              <div className="flex items-center gap-8">
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-500 group-hover:text-blue-500 group-hover:border-blue-500/30' : 'bg-gray-50 border-gray-100 text-gray-400 group-hover:text-blue-600 group-hover:border-blue-500/20'}`}>
                  <Terminal size={24} />
                </div>
                <div>
                  <h4 className={`text-lg font-black tracking-tight flex items-center gap-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {h.name} Synthesis Sequence
                    {h.isAccepted && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </h4>
                  <div className="flex items-center gap-8 mt-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" /> {new Date(h.timestamp || 0).toLocaleString()}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${h.isAccepted ? 'text-emerald-500' : 'text-gray-600'}`}>
                      <Server size={14} /> {h.isAccepted ? 'Provisioned' : 'Draft Model'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setResult(h); setView('dashboard'); }}
                  className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-500 hover:text-blue-400 hover:border-blue-500/40' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-500/20'}`}
                >
                  <ExternalLink size={24} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderVersionControl = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600/10 rounded-2xl border border-emerald-600/20">
                <GitBranch size={24} className="text-emerald-500" />
              </div>
              <div>
                <h3 className={`text-2xl font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Decision Timeline</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Archive of formally accepted architectural synthesis versions.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-emerald-600/10 rounded-2xl border border-emerald-600/20 text-[11px] font-black text-emerald-500 uppercase tracking-widest shadow-xl shadow-emerald-600/5">
              Current Head: v1.0.{versions.length}
            </div>
        </div>

        {versions.length === 0 ? (
          <div className="py-48 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-gray-800 rounded-[3rem]">
            <Archive size={80} className="text-gray-600 mb-8" />
            <p className="text-2xl font-black uppercase tracking-[0.3em] text-gray-500">Timeline Empty</p>
            <p className="text-sm text-gray-600 mt-4 font-bold uppercase tracking-[0.2em]">Generate and accept a design to start logging history.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {versions.map((v, i) => (
              <div key={v.id || i} className={`p-10 rounded-[2.5rem] border flex items-center justify-between group transition-all hover:border-emerald-500/40 hover:scale-[1.01] hover:shadow-3xl ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-10">
                  <div className="w-24 h-24 bg-emerald-600/10 rounded-[1.8rem] border border-emerald-600/20 flex items-center justify-center text-emerald-500 font-black text-3xl shadow-lg shadow-emerald-600/5 transition-all group-hover:bg-emerald-600 group-hover:text-white">
                    {v.version || 'v1'}
                  </div>
                  <div>
                    <h4 className={`text-2xl font-black tracking-tight group-hover:text-emerald-500 transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{v.name}</h4>
                    <div className="flex items-center gap-10 mt-3">
                      <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-3">
                        <Clock size={16} className="text-emerald-500" /> {new Date(v.timestamp || 0).toLocaleString()}
                      </span>
                      <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-3">
                        <ShieldCheck size={16} /> Formal Consensus Logged
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                        setResult(v);
                        setView('dashboard');
                    }} 
                    className="p-6 bg-gray-800/40 rounded-3xl hover:bg-emerald-600 hover:text-white transition-all text-gray-500 group-hover:shadow-xl active:scale-95"
                  >
                    <ExternalLink size={28} />
                  </button>
                  <button 
                    onClick={() => setVersions((prev) => prev.filter((p) => p.id !== v.id))} 
                    className="p-6 bg-red-600/5 rounded-3xl hover:bg-red-600 hover:text-white transition-all text-red-500 active:scale-95"
                  >
                    <Trash2 size={28} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );

    const renderSchedule = () => (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto">
        <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-blue-600/10 rounded-[2rem] text-blue-500 border border-blue-600/20 mb-4">
              <Timer size={48} />
            </div>
        <h3 className={`text-3xl font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Precision Scheduler</h3>
        <p className="text-base text-gray-500 font-medium max-w-2xl mx-auto">Configure the temporal execution triggers for production-ready DAG deployments.</p>
        </div>

        <div className={`p-8 rounded-[2.25rem] border shadow-3xl ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800 shadow-black/80' : 'bg-white border-gray-200 shadow-gray-100'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {(['once', 'hourly', 'weekly', 'monthly', 'cron'] as ScheduleType[]).map((type) => (
                    <button 
                        key={type}
                        onClick={() => setSchedule({ type })}
            className={`flex flex-col items-center gap-3 p-6 rounded-[1.6rem] border transition-all group ${
                            schedule.type === type 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_35px_rgba(59,130,246,0.5)] scale-105' 
                            : theme === 'dark' ? 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-600 hover:bg-black/60' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
            <CalendarDays size={30} className={schedule.type === type ? 'text-white' : 'text-gray-600 group-hover:text-blue-500 transition-colors'} />
                <span className="text-[11px] font-black uppercase tracking-[0.18em]">{type}</span>
                    </button>
                ))}
            </div>
            
        <div className="mt-12 flex flex-col lg:flex-row items-stretch gap-10 animate-in slide-in-from-top-4">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Compass size={18} className="text-blue-500" />
                    <p className={`text-[12px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Deployment Logic Configuration</p>
                  </div>
                  
                  {schedule.type === 'cron' ? (
                      <div className="space-y-4">
                          <input 
                              type="text" 
                              placeholder="Standard Cron Pattern (e.g. * * * * *)"
                              className={`w-full px-6 py-4 rounded-2xl border font-mono text-sm outline-none transition-all shadow-inner ${theme === 'dark' ? 'bg-black border-gray-800 text-white focus:border-blue-600' : 'bg-gray-100 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                              onChange={(e) => setSchedule({ ...schedule, cronValue: e.target.value })}
                          />
                      </div>
                  ) : (
                      <div className={`p-6 rounded-2xl border border-dashed flex items-center gap-4 ${theme === 'dark' ? 'border-gray-800 bg-black/20' : 'border-gray-200 bg-gray-50/50'}`}>
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                          <Clock size={24} />
                        </div>
                        <div>
                          <p className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{schedule.type.toUpperCase()} EXECUTION</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Managed automatically via Orchestrator Hooks.</p>
                        </div>
                      </div>
                  )}
                </div>

                <div className={`w-px hidden lg:block ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}></div>

                <div className="w-full lg:w-80 flex flex-col justify-end gap-3">
                  <button 
                    onClick={handleDeployTimers}
                    disabled={deployStatus === 'deploying'}
                    className={`w-full px-8 py-5 rounded-[1.6rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${deployStatus === 'deploying' ? 'bg-gray-700 text-gray-300 cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                  >
                        <CheckCircle2 size={20} /> {deployStatus === 'deploying' ? 'Deploying...' : 'Deploy Timers'}
                  </button>
                  {deployStatus === 'deployed' && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Timers deployed successfully.</p>
                  )}
                  {deployStatus === 'error' && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Enter a cron value to deploy.</p>
                  )}
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className={`flex min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-[#050505]' : 'bg-gray-50'}`}>
      <Sidebar currentView={view} onNavigate={setView} theme={theme} />
      <main className="flex-1 flex flex-col overflow-y-auto relative scroll-smooth">
        <header className={`px-10 py-8 border-b flex items-center justify-between backdrop-blur-3xl sticky top-0 z-50 transition-all ${theme === 'dark' ? 'bg-[#050505]/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
          <div className="flex flex-col">
            <h2 className={`text-xl font-black capitalize tracking-tighter flex items-center gap-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {view === 'dashboard' ? <Zap className="text-blue-500" /> : 
                 view === 'versionControl' ? <GitBranch className="text-blue-500" /> : 
                 view === 'pipelines' ? <Workflow className="text-blue-500" /> :
                 view === 'datasources' ? <Database className="text-blue-500" /> :
                 view === 'history' ? <HistoryIcon className="text-blue-500" /> :
                 <CalendarDays className="text-blue-500" />}
                <span className="uppercase tracking-[0.2em]">{
                  view === 'datasources' ? 'Data Nodes' : 
                  view === 'versionControl' ? 'Decision Timeline' :
                  view === 'pipelines' ? 'Logic Library' :
                  view === 'history' ? 'Synthesis Audit' :
                  view.replace('datasources', 'Data Sources')
                }</span>
            </h2>
          </div>
          <div className="flex items-center gap-10">
              {(status === 'generating' || progress > 0) && (
                <div className="flex flex-col items-end gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{currentStage}</span>
                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                  </div>
                  <div className={`w-56 h-2 rounded-full overflow-hidden border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-200 border-gray-300'}`}>
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_15px_#3b82f6]" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-6">
                <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-black border-gray-800 hover:bg-gray-900 text-yellow-400 shadow-xl' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600 shadow-sm'}`}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <div className={`flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-4 rounded-xl border shadow-2xl transition-all ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6] ${status === 'generating' ? 'animate-ping' : ''}`}></div>
                  <span>DAG PRO</span>
                </div>
              </div>
          </div>
          
          {status === 'generating' && (
             <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-transparent via-blue-500 to-transparent w-full shadow-[0_0_20px_#3b82f6] animate-pulse"></div>
          )}
        </header>

        <div className="p-14 max-w-7xl mx-auto w-full pb-60">
          {view === 'dashboard' && renderDashboard()}
          {view === 'schedule' && renderSchedule()}
          {view === 'versionControl' && renderVersionControl()}
          {view === 'pipelines' && renderPipelines()}
          {view === 'datasources' && renderDataSources()}
          {view === 'history' && renderHistory()}
          {view === 'settings' && (
            <div className="p-20 border-2 border-dashed border-gray-800 rounded-3xl opacity-30 text-center">
              <SettingsIcon size={64} className="mx-auto mb-6 text-gray-600" />
              <p className="font-black uppercase tracking-[0.3em] text-xl">Core Restricted</p>
              <p className="text-xs font-bold uppercase tracking-widest mt-2">Administrative credentials required.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;