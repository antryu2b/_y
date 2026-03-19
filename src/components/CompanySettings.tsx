'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { AGENT_ROSTER } from '@/data/agent-config';
import { 
  X, Settings, Building2, Users, Globe, Shield, Zap, 
  Link2, GitBranch, Loader2, CheckCircle2, AlertTriangle, 
  TrendingUp, Search, Trash2, RotateCcw, ChevronDown, 
  ChevronUp, Activity, Clock, Target, MessageSquare, Plus, Save,
  CheckCircle, LayoutDashboard, Plug
} from 'lucide-react';
import Image from 'next/image';
import { CONFIG, CompanyConfig } from '@/data/company-config';
import { AgentSelectionGrid } from './AgentSelectionGrid';

interface Props {
  open: boolean;
  onClose: () => void;
  lang: 'ko' | 'en';
}

interface DiagnosisResult {
  agent: string;
  name: string;
  analysis: string;
  score: number;
  recommendations: string[];
}

interface GitHubData {
  repo_info?: any;
  package_json?: any;
  commits?: any[];
  languages?: any;
  error?: string;
}

interface DiagnosisResponse {
  url: string;
  github_url?: string;
  title?: string;
  meta_description?: string;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  links_count: number;
  images_count: number;
  load_time: number;
  github_data?: GitHubData;
  site_type: string;
  site_type_label: string;
  total_agents: number;
  agents_selected: string[];
  phase1_summary: string;
  analysis: DiagnosisResult[];
  overall_score: number;
}

interface ConnectedCompany {
  url: string;
  site_type: string;
  site_type_label: string;
  agents: string[];
  activeAgents?: string[];
  score: number | null;
  connected_at: string;
  github_url?: string;
  title?: string;
  company_name?: string;
  industry?: string;
  team_size?: string;
  description?: string;
  mode?: 'scan' | 'manual' | 'mcp';
  mcp_endpoint?: string;
}

interface AgentAssignment {
  agent: string;
  name: string;
  role: string;
  why: string;
  priority: 'high' | 'medium' | 'low';
  image: string;
  active: boolean;
}

// Agent metadata from URLDiagnosis component
const AGENT_META: Record<string, { icon: React.ReactNode; color: string; borderColor: string; label: string; image: string }> = {
  searchy: { icon: <Search className="w-5 h-5" />, color: 'text-cyan-400', borderColor: 'border-cyan-500/30', label: 'SEO & Structure Analysis', image: '/agents/searchy.png' },
  skepty: { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-400', borderColor: 'border-amber-500/30', label: 'Risk & Security Review', image: '/agents/skepty.png' },
  buzzy: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-400', borderColor: 'border-emerald-500/30', label: 'Marketing & Branding', image: '/agents/buzzy.png' },
  counsely: { icon: <Shield className="w-5 h-5" />, color: 'text-purple-400', borderColor: 'border-purple-500/30', label: 'Strategic Assessment', image: '/agents/counsely.png' },
  stacky: { icon: <Zap className="w-5 h-5" />, color: 'text-blue-400', borderColor: 'border-blue-500/30', label: 'Tech Stack & Dependencies', image: '/agents/stacky.png' },
  guardy: { icon: <Shield className="w-5 h-5" />, color: 'text-red-400', borderColor: 'border-red-500/30', label: 'Security & Vulnerabilities', image: '/agents/guardy.png' },
  selly: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-pink-400', borderColor: 'border-pink-500/30', label: 'E-commerce Analysis', image: '/agents/selly.png' },
  quanty: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-blue-400', borderColor: 'border-blue-500/30', label: 'Data & Metrics Analysis', image: '/agents/quanty.png' },
  pixely: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-violet-400', borderColor: 'border-violet-500/30', label: 'Design & UX Analysis', image: '/agents/pixely.png' },
  wordy: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-orange-400', borderColor: 'border-orange-500/30', label: 'Content Analysis', image: '/agents/wordy.png' },
  buildy: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-cyan-400', borderColor: 'border-cyan-500/30', label: 'Build System Analysis', image: '/agents/buildy.png' },
  testy: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-yellow-400', borderColor: 'border-yellow-500/30', label: 'QA & Testing Analysis', image: '/agents/testy.png' },
  opsy: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-400', borderColor: 'border-green-500/30', label: 'Infrastructure Analysis', image: '/agents/opsy.png' },
  growthy: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-400', borderColor: 'border-emerald-500/30', label: 'Growth & SEO Analysis', image: '/agents/growthy.png' },
  hiry: { icon: <Users className="w-5 h-5" />, color: 'text-indigo-400', borderColor: 'border-indigo-500/30', label: 'HR & Recruitment Analysis', image: '/agents/hiry.png' },
  tradey: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-teal-400', borderColor: 'border-teal-500/30', label: 'Trading & Market Analysis', image: '/agents/tradey.png' },
  logoy: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-rose-400', borderColor: 'border-rose-500/30', label: 'Brand & Logo Analysis', image: '/agents/logoy.png' },
  globy: { icon: <Globe className="w-5 h-5" />, color: 'text-sky-400', borderColor: 'border-sky-500/30', label: 'Global Reach Analysis', image: '/agents/globy.png' },
  evaly: { icon: <Users className="w-5 h-5" />, color: 'text-purple-400', borderColor: 'border-purple-500/30', label: 'Evaluation Analysis', image: '/agents/evaly.png' },
  hedgy: { icon: <Shield className="w-5 h-5" />, color: 'text-red-400', borderColor: 'border-red-500/30', label: 'Risk Management Analysis', image: '/agents/hedgy.png' },
  valuey: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-400', borderColor: 'border-green-500/30', label: 'Value Proposition Analysis', image: '/agents/valuey.png' },
  finy: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-blue-400', borderColor: 'border-blue-500/30', label: 'Fintech Analysis', image: '/agents/finy.png' },
};

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= 60) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-red-500/20 border-red-500/30';
}

function generateAgentPlan(result: DiagnosisResponse): AgentAssignment[] {
  const plan: AgentAssignment[] = [];
  const score = result.overall_score;
  const hasWebsite = result.url !== 'GitHub Only Analysis';
  const hasGitHub = !!result.github_url;
  
  // Always recommend core agents
  if (hasWebsite) {
    plan.push({
      agent: 'watchy', name: 'Watchy', role: 'Site Monitoring',
      why: '24/7 site monitoring — real-time detection of downtime, performance issues, errors',
      priority: 'high', image: '/agents/watchy.png', active: true
    });
  }
  
  if (hasWebsite && (score < 70 || result.links_count < 10)) {
    plan.push({
      agent: 'searchy', name: 'Searchy', role: 'SEO Optimization',
      why: 'SEO score needs improvement — meta tags, structured data, internal link optimization',
      priority: 'high', image: '/agents/searchy.png', active: true
    });
  }
  
  if (hasWebsite) {
    plan.push({
      agent: 'buzzy', name: 'Buzzy', role: 'Content Marketing',
      why: 'Blog, social media, newsletter — automated traffic generation',
      priority: score < 60 ? 'high' : 'medium', image: '/agents/buzzy.png', active: true
    });
  }
  
  // GitHub-specific agents
  if (hasGitHub) {
    plan.push({
      agent: 'stacky', name: 'Stacky', role: 'Tech Stack Management',
      why: 'Dependency management, package updates, tech debt monitoring — dev productivity',
      priority: result.github_data?.package_json ? 'high' : 'medium', image: '/agents/stacky.png', active: true
    });
    
    plan.push({
      agent: 'guardy', name: 'Guardy', role: 'Code Security Audit',
      why: 'Vulnerability scanning, code quality checks, security patches — safe deployments',
      priority: 'high', image: '/agents/guardy.png', active: true
    });
  }
  
  // Additional agents based on site type
  result.agents_selected.forEach(agentId => {
    const meta = AGENT_META[agentId];
    if (meta && !plan.some(p => p.agent === agentId)) {
      plan.push({
        agent: agentId,
        name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
        role: meta.label,
        why: `Specialized analysis for ${result.site_type_label.toLowerCase()} optimization`,
        priority: 'medium',
        image: meta.image,
        active: true
      });
    }
  });
  
  return plan;
}

// Manual mode industry-based agent recommendations
function getIndustryAgents(industry: string): string[] {
  const commonAgents = ['counsely', 'skepty', 'opsy'];
  
  switch (industry) {
    case 'manufacturing':
      return [...commonAgents, 'quanty', 'selly', 'logoy', 'buildy', 'guardy'];
    case 'import_export':
      return [...commonAgents, 'quanty', 'selly', 'globy', 'logoy', 'buzzy'];
    case 'retail':
      return [...commonAgents, 'selly', 'buzzy', 'quanty', 'pixely', 'growthy'];
    case 'construction':
      return [...commonAgents, 'quanty', 'stacky', 'opsy', 'guardy', 'buildy'];
    case 'consulting':
      return [...commonAgents, 'wordy', 'buzzy', 'quanty', 'hiry', 'growthy'];
    case 'food_beverage':
      return [...commonAgents, 'selly', 'buzzy', 'quanty', 'pixely', 'growthy'];
    case 'logistics':
      return [...commonAgents, 'opsy', 'quanty', 'stacky', 'guardy', 'globy'];
    // Existing industries
    case 'saas':
      return [...commonAgents, 'stacky', 'buildy', 'guardy', 'testy', 'opsy'];
    case 'ecommerce':
      return [...commonAgents, 'selly', 'quanty', 'buzzy', 'pixely', 'logoy'];
    case 'finance':
      return [...commonAgents, 'quanty', 'tradey', 'hedgy', 'valuey', 'finy'];
    case 'media':
      return [...commonAgents, 'wordy', 'buzzy', 'pixely', 'globy'];
    case 'healthcare':
      return [...commonAgents, 'guardy', 'wordy', 'quanty', 'buildy'];
    case 'education':
      return [...commonAgents, 'wordy', 'buzzy', 'quanty', 'growthy'];
    case 'marketplace':
      return [...commonAgents, 'selly', 'quanty', 'buzzy', 'guardy'];
    case 'enterprise':
      return [...commonAgents, 'stacky', 'guardy', 'quanty', 'hiry'];
    case 'gaming':
      return [...commonAgents, 'stacky', 'pixely', 'buzzy', 'quanty'];
    default: // other
      return [...commonAgents, 'buzzy', 'stacky', 'guardy', 'quanty'];
  }
}

// Get industry-specific agent descriptions
function getAgentDescription(agent: string, industry: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    counsely: { default: 'Strategic assessment and overall guidance' },
    skepty: { default: 'Risk assessment and security review' },
    opsy: { 
      manufacturing: 'Monitor repair schedules and operational efficiency',
      logistics: 'Track delivery routes and warehouse operations',
      default: 'Infrastructure monitoring and operations'
    },
    quanty: { 
      manufacturing: 'Track import costs, margins, and financial health',
      import_export: 'Analyze trade volumes, profit margins, and costs',
      retail: 'Sales analytics and inventory optimization',
      default: 'Financial analysis and data insights'
    },
    selly: { 
      manufacturing: 'Manage client relationships and sales pipeline',
      import_export: 'Handle supplier and buyer relationships',
      retail: 'Customer engagement and sales optimization',
      default: 'Sales and customer relationship management'
    },
    logoy: { 
      manufacturing: 'Brand positioning in industrial markets',
      import_export: 'Brand trust for international partnerships',
      default: 'Brand development and visual identity'
    },
    buildy: { 
      manufacturing: 'Technical documentation and process optimization',
      construction: 'Project management and build processes',
      default: 'Technical infrastructure and build systems'
    },
    guardy: { 
      manufacturing: 'Safety compliance and security protocols',
      construction: 'Workplace safety and compliance monitoring',
      default: 'Security and compliance management'
    },
    globy: {
      import_export: 'International market expansion and partnerships',
      logistics: 'Global supply chain coordination',
      default: 'Global reach and international expansion'
    },
    buzzy: {
      retail: 'Local marketing and customer acquisition',
      food_beverage: 'Brand marketing and social media presence',
      consulting: 'Thought leadership and content marketing',
      default: 'Marketing and brand development'
    },
    pixely: {
      retail: 'Visual merchandising and store presentation',
      food_beverage: 'Food photography and visual branding',
      default: 'Design and visual experience'
    },
    growthy: {
      retail: 'Local SEO and customer acquisition',
      food_beverage: 'Local market growth and visibility',
      consulting: 'Authority building and lead generation',
      default: 'Growth strategy and optimization'
    },
    stacky: {
      construction: 'Digital tools and project management systems',
      logistics: 'Fleet management and tracking systems',
      default: 'Technology stack optimization'
    },
    wordy: {
      consulting: 'Proposal writing and content strategy',
      default: 'Content creation and communication'
    },
    hiry: {
      consulting: 'Team building and talent acquisition',
      default: 'HR and recruitment strategy'
    }
  };
  
  return descriptions[agent]?.[industry] || descriptions[agent]?.default || 'Specialized analysis and optimization';
}

type AnalysisPhase = 'idle' | 'phase1' | 'phase2' | 'complete';
type AgentStatus = 'waiting' | 'analyzing' | 'complete';
type Tab = 'connect' | 'about';

export function CompanySettings({ open, onClose, lang }: Props) {
  if (!open) return null;

  const ko = lang === 'ko';
  
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('connect');
  
  // Profile configuration state
  const [config, setConfig] = useState<CompanyConfig>(JSON.parse(JSON.stringify(CONFIG)));
  const [saved, setSaved] = useState(false);
  
  // Connection state
  const [connectedCompanies, setConnectedCompanies] = useState<ConnectedCompany[]>([]);
  const [showChangeCompany, setShowChangeCompany] = useState(false);
  
  // Connection mode state
  const [connectionMode, setConnectionMode] = useState<'scan' | 'manual' | 'mcp'>('scan');
  
  // MCP state
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpResult, setMcpResult] = useState<any>(null);
  const [mcpError, setMcpError] = useState<string | null>(null);

  // URL diagnosis state
  const [url, setUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time UX state
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>('idle');
  const [detectedType, setDetectedType] = useState<string>('');
  const [selectedAgentsList, setSelectedAgentsList] = useState<string[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [completedAgents, setCompletedAgents] = useState<number>(0);
  const [justConnected, setJustConnected] = useState<ConnectedCompany | null>(null);
  
  // Agent selection step state
  const [showAgentSelection, setShowAgentSelection] = useState(false);
  const [selectedActiveAgents, setSelectedActiveAgents] = useState<string[]>([]);
  const [recommendedAgentIds, setRecommendedAgentIds] = useState<string[]>([]);

  // Load connection data on mount
  useEffect(() => {
    try {
      // Check new format first
      const connectionsData = localStorage.getItem('y-company-connections');
      if (connectionsData) {
        const parsed = JSON.parse(connectionsData);
        if (Array.isArray(parsed)) {
          setConnectedCompanies(parsed);
          return;
        }
      }
      
      // Migration: check old format
      const connectionData = localStorage.getItem('y-company-connection');
      if (connectionData) {
        const parsed = JSON.parse(connectionData);
        setConnectedCompanies([parsed]);
      }
    } catch (error) {
      console.error('Error loading connection data:', error);
    }
  }, []);

  // Profile configuration helpers
  const updateConfig = (path: string, value: any) => {
    const next = JSON.parse(JSON.stringify(config));
    const keys = path.split('.');
    let obj: any = next;
    for (let i = 0; i < keys.length - 1; i++) {
      if (keys[i].match(/^\d+$/)) obj = obj[parseInt(keys[i])];
      else obj = obj[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey.match(/^\d+$/)) obj[parseInt(lastKey)] = value;
    else obj[lastKey] = value;
    setConfig(next);
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Save failed');
    }
  };

  const handleMcpConnect = async () => {
    if (!mcpUrl.trim()) return;
    setMcpLoading(true);
    setMcpError(null);
    setMcpResult(null);
    try {
      const res = await fetch('/api/companies/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mcpUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      setMcpResult(data);
    } catch (err: any) {
      setMcpError(err.message || 'Could not connect to MCP server');
    } finally {
      setMcpLoading(false);
    }
  };

  const handleMcpSave = async () => {
    if (!mcpResult) return;
    const newCompany = {
      id: crypto.randomUUID(),
      url: mcpResult.mcp_endpoint || mcpUrl,
      site_type: mcpResult.industry || 'other',
      site_type_label: mcpResult.industry || 'MCP Connected',
      agents: mcpResult.agents || [],
      title: mcpResult.company_name,
      company_name: mcpResult.company_name,
      industry: mcpResult.industry,
      team_size: mcpResult.team_size,
      description: mcpResult.description,
      connectedAt: new Date().toISOString(),
    };
    const stored = JSON.parse(localStorage.getItem('y-company-connections') || '[]');
    stored.push(newCompany);
    localStorage.setItem('y-company-connections', JSON.stringify(stored));
    try {
      await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCompany) });
    } catch {}
    setJustConnected(newCompany as any);
    setMcpResult(null);
    setMcpUrl('');
  };

  const handleDiagnose = async () => {
    // Validate inputs based on mode
    if (connectionMode === 'scan' && !url.trim() && !githubUrl.trim()) {
      setError('Please enter a URL or GitHub repository');
      return;
    }
    if (connectionMode === 'manual' && (!companyName.trim() || !industry)) {
      setError('Please enter company name and select industry');
      return;
    }
    
    // Reset state
    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysisPhase('idle');
    setDetectedType('');
    setSelectedAgentsList([]);
    setAgentStatuses({});
    setCompletedAgents(0);
    
    try {
      if (connectionMode === 'manual') {
        // Manual mode: generate recommendations without API call
        setAnalysisPhase('phase1');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get industry-specific agents
        const industryAgents = getIndustryAgents(industry);
        
        // Get industry label
        const industryLabels: Record<string, string> = {
          manufacturing: 'Manufacturing / Industrial',
          import_export: 'Import / Export / Trade',
          retail: 'Retail / Offline Store',
          construction: 'Construction / Engineering',
          consulting: 'Consulting / Professional Services',
          food_beverage: 'Food & Beverage',
          logistics: 'Logistics / Transportation',
          saas: 'SaaS',
          ecommerce: 'E-commerce',
          finance: 'Finance / Fintech',
          media: 'Media / Content',
          healthcare: 'Healthcare',
          education: 'Education',
          marketplace: 'Marketplace',
          enterprise: 'Enterprise / B2B',
          gaming: 'Gaming',
          other: 'Other'
        };
        
        const industryLabel = industryLabels[industry] || 'Other';
        
        setDetectedType(industryLabel);
        setSelectedAgentsList(industryAgents);
        setAnalysisPhase('phase2');
        
        // Simulate agent analysis
        const initialStatuses: Record<string, AgentStatus> = {};
        industryAgents.forEach((agent: string) => {
          initialStatuses[agent] = 'waiting';
        });
        setAgentStatuses(initialStatuses);
        
        for (let i = 0; i < industryAgents.length; i++) {
          const agentId = industryAgents[i];
          setAgentStatuses(prev => ({ ...prev, [agentId]: 'analyzing' }));
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
          setAgentStatuses(prev => ({ ...prev, [agentId]: 'complete' }));
          setCompletedAgents(i + 1);
        }
        
        // Create manual analysis result
        const manualResult: DiagnosisResponse = {
          url: url.trim() || '',
          github_url: githubUrl.trim() || undefined,
          title: companyName,
          meta_description: companyDescription || `${companyName} - ${industryLabel} company`,
          headings: { h1: [companyName], h2: [], h3: [] },
          links_count: 0,
          images_count: 0,
          load_time: 0,
          site_type: industry,
          site_type_label: industryLabel,
          total_agents: industryAgents.length,
          agents_selected: industryAgents,
          phase1_summary: `Based on your industry: ${industryLabel}`,
          analysis: [], // Empty for manual mode
          overall_score: 0 // N/A for manual mode
        };
        
        setResult(manualResult);
        setAnalysisPhase('complete');
      } else {
        // Scan mode: existing API logic
        setAnalysisPhase('phase1');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const requestBody: any = {};
        if (url.trim()) requestBody.url = url.trim();
        if (githubUrl.trim()) requestBody.github_url = githubUrl.trim();
        
        const response = await fetch('/api/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to analyze');
        
        setDetectedType(data.site_type_label);
        setSelectedAgentsList(data.agents_selected);
        
        const initialStatuses: Record<string, AgentStatus> = {};
        data.agents_selected.forEach((agent: string) => {
          initialStatuses[agent] = 'waiting';
        });
        setAgentStatuses(initialStatuses);
        
        setAnalysisPhase('phase2');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        for (let i = 0; i < data.agents_selected.length; i++) {
          const agentId = data.agents_selected[i];
          setAgentStatuses(prev => ({ ...prev, [agentId]: 'analyzing' }));
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 800));
          setAgentStatuses(prev => ({ ...prev, [agentId]: 'complete' }));
          setCompletedAgents(i + 1);
        }
        
        setResult(data);
        setAnalysisPhase('complete');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAnalysisPhase('idle');
    } finally {
      setLoading(false);
    }
  };

  // Enter agent selection step (called when user clicks "Connect")
  const handleEnterAgentSelection = () => {
    if (!result) return;
    const recommended = result.agents_selected || [];
    setRecommendedAgentIds(recommended);
    setSelectedActiveAgents([...recommended]);
    setShowAgentSelection(true);
  };

  const handleToggleAgent = (agentId: string) => {
    setSelectedActiveAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleConnect = async () => {
    if (!result) return;
    
    // Use agent selection if available, otherwise fall back to recommended
    const activeAgents = showAgentSelection && selectedActiveAgents.length > 0
      ? selectedActiveAgents
      : result.agents_selected;

    // Create new company data
    const connectionData: ConnectedCompany = {
      url: result.url,
      site_type: result.site_type,
      site_type_label: result.site_type_label,
      agents: result.agents_selected,
      activeAgents: activeAgents,
      score: connectionMode === 'manual' ? null : result.overall_score,
      connected_at: new Date().toISOString(),
      github_url: result.github_url,
      title: result.title,
      company_name: companyName || undefined,
      industry: industry || undefined,
      team_size: teamSize || undefined,
      description: companyDescription || undefined,
      mode: connectionMode,
    };
    
    // Add to existing connections array
    const currentConnections = [...connectedCompanies, connectionData];
    localStorage.setItem('y-company-connections', JSON.stringify(currentConnections));
    localStorage.setItem('y-company-connected', 'true');
    
    // Remove old format if it exists
    localStorage.removeItem('y-company-connection');
    
    // Save to DB for server-side access (directives, agents)
    try {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: connectionData.company_name || connectionData.title || connectionData.url,
          industry: connectionData.industry || connectionData.site_type,
          description: connectionData.description || '',
          url: connectionData.url || '',
          agents: connectionData.agents || [],
          activeAgents: connectionData.activeAgents || [],
        }),
      });
    } catch {} // Non-blocking

    // Notify company registry to refresh
    window.dispatchEvent(new Event('y-company-updated'));
    
    // Trigger onboarding: first analysis report from Counsely
    triggerOnboarding(connectionData);
    
    setConnectedCompanies(currentConnections);
    setJustConnected(connectionData);
    setResult(null);
    setUrl('');
    setGithubUrl('');
    setCompanyName('');
    setIndustry('');
    setTeamSize('');
    setCompanyDescription('');
    setAnalysisPhase('idle');
    setShowChangeCompany(false);
    setShowAgentSelection(false);
    setSelectedActiveAgents([]);
    setRecommendedAgentIds([]);
  };

  const triggerOnboarding = async (company: ConnectedCompany) => {
    const companyName = company.company_name || company.title || company.url;
    const agentList = company.agents.slice(0, 5).join(', ');
    
    // Counsely writes the onboarding report
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'counsely',
          message: `A new portfolio company "${companyName}" (${company.site_type_label}) has been connected to _y Holdings. Assigned agents: ${agentList}. Write a brief welcome onboarding report: 1) Company overview based on available info, 2) What each assigned agent will do, 3) Recommended first actions. Keep it under 200 words.`,
          lang: 'ko',
        }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            // Save as a report
            await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  agent_id: 'counsely',
                  title: `[Onboarding] ${companyName}`,
                  content: data.reply,
                  report_type: 'onboarding',
                }),
              });
          }
        }
      });
    } catch {
      // Non-blocking — onboarding report is best-effort
    }
  };

  const handleDisconnectAll = () => {
    localStorage.removeItem('y-company-connections');
    localStorage.removeItem('y-company-connection');
    localStorage.removeItem('y-company-connected');
    window.dispatchEvent(new Event('y-company-updated'));
    setConnectedCompanies([]);
    setShowChangeCompany(false);
    setResult(null);
    setUrl('');
    setGithubUrl('');
    setAnalysisPhase('idle');
    
    // Refresh the page to go back to hero state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleDisconnectCompany = (index: number) => {
    const newConnections = connectedCompanies.filter((_, i) => i !== index);
    
    if (newConnections.length === 0) {
      localStorage.removeItem('y-company-connections');
      localStorage.removeItem('y-company-connected');
    } else {
      localStorage.setItem('y-company-connections', JSON.stringify(newConnections));
    }
    
    window.dispatchEvent(new Event('y-company-updated'));
    setConnectedCompanies(newConnections);
    
    // If no companies left, refresh to go back to hero state
    if (newConnections.length === 0) {
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const handleRescanCompany = (company: ConnectedCompany) => {
    setUrl(company.url);
    if (company.github_url) {
      setGithubUrl(company.github_url);
    }
    if (company.company_name) {
      setCompanyName(company.company_name);
    }
    if (company.industry) {
      setIndustry(company.industry);
    }
    if (company.team_size) {
      setTeamSize(company.team_size);
    }
    if (company.description) {
      setCompanyDescription(company.description);
    }
    if (company.mode) {
      setConnectionMode(company.mode);
    }
    setResult(null);
    setAnalysisPhase('idle');
    setError(null);
    setShowChangeCompany(true);
  };

  // Derive userCompanies from connectedCompanies for the About tab
  const userCompanies = connectedCompanies.map((c, i) => ({
    id: `user-${i}`,
    company_name: c.company_name || c.title || c.url,
    title: c.title,
    industry: c.industry || c.site_type_label,
    agents: c.agents,
    mcp_endpoint: c.mcp_endpoint,
  }));

  const agentPlan = result ? generateAgentPlan(result) : [];

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-400/40 focus:outline-none transition";
  const labelClass = "text-xs text-gray-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0f1a] border border-white/10 rounded-2xl w-[96vw] max-w-[1200px] h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span className="text-lg font-medium text-white">
              {ko ? '회사 설정' : 'Company Settings'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-4 gap-1 overflow-x-auto shrink-0">
          {[
            { id: 'connect', icon: Globe, label: '연결', labelEn: 'Connect' },
            { id: 'about', icon: Building2, label: '_y Holdings', labelEn: '_y Holdings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition border-b-2 shrink-0 ${
                activeTab === tab.id ? 'text-amber-400 border-amber-400' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {ko ? tab.label : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'connect' ? (
            justConnected ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Connection Success */}
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {ko ? '연결 완료!' : 'Connected!'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {ko 
                      ? `${justConnected.company_name || justConnected.title || 'Company'}이(가) _y Holdings 계열사로 등록되었습니다`
                      : `${justConnected.company_name || justConnected.title || 'Company'} is now a _y Holdings subsidiary`}
                  </p>
                </div>

                {/* Assigned Agents */}
                {justConnected.agents && justConnected.agents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-400" />
                      {ko ? '배정된 에이전트' : 'Assigned Agents'}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {justConnected.agents.map(agentId => {
                        const agent = AGENT_ROSTER.find(a => a.id === agentId);
                        if (!agent) return null;
                        return (
                          <div key={agentId} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-800">
                              <img src={`/agents/${agentId}.png`} alt={agent.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-white truncate">{agent.name}</div>
                              <div className="text-[10px] text-gray-500 truncate">{agent.role}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Go to Dashboard Button */}
                <button
                  onClick={() => {
                    // Find the index of this company in connections
                    const connections = JSON.parse(localStorage.getItem('y-company-connections') || '[]');
                    const idx = connections.length - 1; // just-added is last
                    const companySlug = justConnected ? (justConnected.company_name || justConnected.title || 'company').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : '';
                    const newCompanyId = companySlug ? `user-${companySlug}-${idx}` : '';
                    if (newCompanyId) sessionStorage.setItem('y-active-company', newCompanyId);
                    setJustConnected(null);
                    onClose?.();
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('y-navigate', { detail: { view: 'dashboard' } }));
                    }, 300);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {ko ? '대시보드로 이동' : 'Go to Dashboard'}
                </button>

                <button
                  onClick={() => setJustConnected(null)}
                  className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {ko ? '다른 회사 추가 연결' : 'Connect another company'}
                </button>
              </div>
            ) : connectedCompanies.length > 0 ? (
              <>
                {/* Connected Companies */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      {ko ? '연결된 회사들' : 'Connected Companies'}
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">
                        {connectedCompanies.length}
                      </Badge>
                    </h3>
                    {connectedCompanies.length > 1 && (
                      <button 
                        onClick={handleDisconnectAll}
                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        {ko ? '전체 해제' : 'Disconnect All'}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {connectedCompanies.map((company, index) => (
                      <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold mb-1">
                              {company.company_name || company.title || company.url}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                {company.site_type_label}
                              </Badge>
                              {company.industry && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                  {company.industry}
                                </Badge>
                              )}
                              {company.team_size && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                  {company.team_size} people
                                </Badge>
                              )}
                              {company.mode === 'manual' && (
                                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                                  Manual
                                </Badge>
                              )}
                              {company.mode === 'mcp' && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                  MCP
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              {company.url && (
                                <p className="text-gray-500 text-xs">{company.url}</p>
                              )}
                              {company.github_url && (
                                <p className="text-gray-500 text-xs flex items-center gap-1">
                                  <GitBranch className="w-3 h-3" /> GitHub
                                </p>
                              )}
                              <p className="text-gray-400 text-xs">
                                {ko ? '연결' : 'Connected'}: {new Date(company.connected_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {company.score !== null && (
                              <div className={`flex flex-col items-center px-2 py-1 rounded-lg border text-xs ${getScoreBg(company.score)}`}>
                                <span className={`font-bold ${getScoreColor(company.score)}`}>
                                  {company.score}
                                </span>
                                <span className="text-gray-400 text-xs">/100</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {ko ? `에이전트 ${company.agents.length}명 배치` : `${company.agents.length} agents deployed`}
                          </div>
                          <button 
                            onClick={() => handleDisconnectCompany(index)}
                            className="px-2.5 py-1 text-red-400 hover:text-red-300 text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            {ko ? '해제' : 'Remove'}
                          </button>
                        </div>

                        {/* Inline action buttons */}
                        <div className="flex gap-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => {
                              onClose();
                              window.dispatchEvent(new CustomEvent('y-navigate', { detail: { view: 'dashboard' } }));
                            }}
                            className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-400/20 rounded-lg text-xs font-medium transition inline-flex items-center justify-center gap-1.5"
                          >
                            <Building2 className="w-3 h-3" />
                            {ko ? '대시보드' : 'Dashboard'}
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              window.dispatchEvent(new CustomEvent('y-navigate', { detail: { view: 'floor', floor: 10, agent: 'counsely' } }));
                            }}
                            className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-400/20 rounded-lg text-xs font-medium transition inline-flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare className="w-3 h-3" />
                            {ko ? 'Counsely' : 'Talk to Counsely'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add another — simple link */}
                  <button
                    onClick={() => {
                      setShowChangeCompany(true);
                      setTimeout(() => {
                        document.getElementById('new-company-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 150);
                    }}
                    className="w-full py-2.5 text-sm text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center justify-center gap-1.5 border border-dashed border-blue-400/20 hover:border-blue-400/40 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {ko ? '다른 회사 추가 연결' : 'Connect Another Company'}
                  </button>
                </div>

                {/* Add New Company Form */}
                {showChangeCompany && (
                  <div id="new-company-form" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Globe className="w-5 h-5 text-emerald-400" />
                        {ko ? '새 회사 연결' : 'Connect New Company'}
                      </h3>
                      <button
                        onClick={() => setShowChangeCompany(false)}
                        className="text-gray-400 hover:text-white transition text-sm"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <div className="space-y-4">
                        {/* Scan / Manual / MCP Toggle */}
                        <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
                          <button
                            onClick={() => setConnectionMode('scan')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 justify-center ${
                              connectionMode === 'scan' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <Search className="w-4 h-4" />
                            {ko ? '스캔' : 'Scan'}
                          </button>
                          <button
                            onClick={() => setConnectionMode('manual')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 justify-center ${
                              connectionMode === 'manual' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            {ko ? '수동' : 'Manual'}
                          </button>
                          <button
                            onClick={() => setConnectionMode('mcp')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 justify-center ${
                              connectionMode === 'mcp' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <Plug className="w-4 h-4" />
                            {ko ? 'MCP' : 'MCP'}
                          </button>
                        </div>

                        {connectionMode === 'scan' && (
                        <div className="space-y-3">
                          <div className="relative">
                            <div className="flex gap-2 bg-white/5 border border-white/10 rounded-lg p-2">
                              <Link2 className="w-5 h-5 text-gray-500 mt-2.5" />
                              <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
                                placeholder="https://your-company.com"
                                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-2"
                                disabled={loading}
                              />
                            </div>
                          </div>
                          
                          <div className="relative">
                            <div className="flex gap-2 bg-white/5 border border-white/10 rounded-lg p-2">
                              <GitBranch className="w-5 h-5 text-gray-500 mt-2.5" />
                              <input
                                type="url"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
                                placeholder="https://github.com/username/repo (optional)"
                                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-2"
                                disabled={loading}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-center">
                            <button 
                              onClick={handleDiagnose} 
                              disabled={loading || (!url.trim() && !githubUrl.trim())}
                              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                              {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> 
                                  {analysisPhase === 'phase1' ? (ko ? 'Counsely 스캔 중...' : 'Counsely is scanning...') :
                                   analysisPhase === 'phase2' ? `${ko ? '분석 중' : 'Analyzing'} (${completedAgents}/${selectedAgentsList.length})...` :
                                   (ko ? '분석 중...' : 'Analyzing...')}
                                </>
                              ) : (
                                <><Search className="w-4 h-4" /> {ko ? 'AI 에이전트 분석' : 'Analyze with AI Agents'}</>
                              )}
                            </button>
                          </div>
                        </div>
                        )}
                        {connectionMode === 'manual' && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder={ko ? '회사명' : 'Company Name'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none text-sm"
                          />
                          <select
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none text-sm [&>option]:bg-gray-900"
                          >
                            <option value="">{ko ? '업종 선택' : 'Select Industry'}</option>
                            <option value="saas">SaaS / Software</option>
                            <option value="ecommerce">E-commerce</option>
                            <option value="finance">Finance / Fintech</option>
                            <option value="media">Media / Content</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="education">Education</option>
                            <option value="marketplace">Marketplace</option>
                            <option value="enterprise">Enterprise</option>
                            <option value="manufacturing">Manufacturing / Industrial</option>
                            <option value="import_export">Import / Export / Trade</option>
                            <option value="retail">Retail / Offline Store</option>
                            <option value="construction">Construction / Engineering</option>
                            <option value="consulting">Consulting / Professional Services</option>
                            <option value="food_beverage">Food &amp; Beverage</option>
                            <option value="logistics">Logistics / Transportation</option>
                            <option value="other">Other</option>
                          </select>
                          <select
                            value={teamSize}
                            onChange={(e) => setTeamSize(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none text-sm [&>option]:bg-gray-900"
                          >
                            <option value="1-10">1-10 people</option>
                            <option value="11-50">11-50 people</option>
                            <option value="51-200">51-200 people</option>
                            <option value="201-1000">201-1000 people</option>
                            <option value="1000+">1000+ people</option>
                          </select>
                          <textarea
                            value={manualDescription}
                            onChange={(e) => setManualDescription(e.target.value)}
                            placeholder={ko ? '회사 설명 (선택)' : 'Company description (optional)'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none text-sm h-20 resize-none"
                          />
                          <div className="flex justify-center">
                            <button
                              onClick={handleDiagnose}
                              disabled={!companyName.trim() || !industry}
                              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              {ko ? '회사 연결' : 'Connect Company'}
                            </button>
                          </div>
                        </div>
                        )}
                        {connectionMode === 'mcp' && (
                        <div className="space-y-3">
                          <div className="flex gap-2 bg-white/5 border border-white/10 rounded-lg p-2">
                            <Plug className="w-5 h-5 text-blue-400 mt-2.5" />
                            <input
                              type="url"
                              value={mcpUrl}
                              onChange={(e) => setMcpUrl(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleMcpConnect()}
                              placeholder={ko ? 'MCP 서버 URL (예: http://localhost:3001/mcp)' : 'MCP Server URL (e.g. http://localhost:3001/mcp)'}
                              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-2"
                              disabled={mcpLoading}
                            />
                          </div>
                          <div className="flex justify-center">
                            <button
                              onClick={handleMcpConnect}
                              disabled={mcpLoading || !mcpUrl.trim()}
                              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                              {mcpLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> {ko ? '연결 중...' : 'Connecting...'}</>
                              ) : (
                                <><Plug className="w-4 h-4" /> {ko ? '연결' : 'Connect'}</>
                              )}
                            </button>
                          </div>
                          {mcpError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                              <p className="text-red-400 text-sm">{mcpError}</p>
                            </div>
                          )}
                          {mcpResult && (
                            <div className="bg-white/5 border border-blue-500/20 rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400 font-medium text-sm">
                                  {ko ? 'MCP 연결 성공' : 'MCP Connected'}
                                </span>
                              </div>
                              <h4 className="text-white font-semibold">{mcpResult.company_name}</h4>
                              {mcpResult.description && <p className="text-gray-400 text-sm">{mcpResult.description}</p>}
                              <div className="flex justify-center">
                                <button
                                  onClick={handleMcpSave}
                                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                                >
                                  <Building2 className="w-4 h-4" />
                                  {ko ? '연결 저장' : 'Save Connection'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        )}

                        {/* Error */}
                        {error && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <p className="text-red-400 text-sm">{error}</p>
                          </div>
                        )}

                        {/* Analysis Progress and Results */}
                        {(analysisPhase === 'phase1' || analysisPhase === 'phase2') && (
                          <div className="space-y-4">
                            {/* Phase 1 */}
                            {analysisPhase === 'phase1' && (
                              <div className="bg-white/5 border border-purple-500/30 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                                    <Image src="/agents/counsely.png" alt="Counsely" width={40} height={40} className="object-cover" />
                                  </div>
                                  <div>
                                    <div className="text-purple-400 font-medium flex items-center gap-2">
                                      Counsely <Activity className="w-4 h-4 animate-pulse" />
                                    </div>
                                    <div className="text-gray-400 text-sm">{ko ? '사이트 구조 분석 중...' : 'Analyzing site structure...'}</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Phase 2 */}
                            {analysisPhase === 'phase2' && detectedType && (
                              <div className="space-y-3">
                                <div className="bg-white/5 border border-emerald-500/30 rounded-lg p-4">
                                  <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    <div>
                                      <div className="text-emerald-400 font-medium">
                                        {ko ? '감지됨' : 'Detected'}: {detectedType}
                                      </div>
                                      <div className="text-gray-400 text-sm">
                                        {completedAgents}/{selectedAgentsList.length} {ko ? '완료' : 'completed'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Analysis Results */}
                        {result && analysisPhase === 'complete' && !showAgentSelection && (
                          <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="text-white font-semibold mb-1">
                                    {result.title || result.url}
                                  </h4>
                                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-2">
                                    {result.site_type_label}
                                  </Badge>
                                </div>
                                <div className={`flex flex-col items-center p-3 rounded-lg border ${getScoreBg(result.overall_score)}`}>
                                  <span className={`text-2xl font-bold ${getScoreColor(result.overall_score)}`}>
                                    {result.overall_score}
                                  </span>
                                  <span className="text-gray-400 text-xs">/100</span>
                                </div>
                              </div>
                              
                              <div className="flex justify-center">
                                <button 
                                  onClick={handleEnterAgentSelection}
                                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                                >
                                  <Building2 className="w-4 h-4" />
                                  {ko ? '에이전트 선택하기' : 'Select Agents'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Agent Selection Step (showChangeCompany) */}
                        {result && analysisPhase === 'complete' && showAgentSelection && (
                          <AgentSelectionGrid
                            recommendedAgentIds={recommendedAgentIds}
                            selectedAgentIds={selectedActiveAgents}
                            onToggle={handleToggleAgent}
                            onConfirm={handleConnect}
                            lang={lang}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                {/* Not Connected State */}
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Globe className="w-8 h-8 text-emerald-400" />
                    <h2 className="text-2xl font-bold text-white">
                      {ko ? '_y에 회사 연결' : 'Connect Your Company to _y'}
                    </h2>
                  </div>
                  
                  {/* Mode Toggle */}
                  <div className="flex justify-center mb-4">
                    <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => setConnectionMode('scan')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                          connectionMode === 'scan' 
                            ? 'bg-emerald-600 text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Search className="w-4 h-4" />
                        {ko ? '웹사이트 스캔' : 'Scan Website'}
                      </button>
                      <button
                        onClick={() => setConnectionMode('manual')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                          connectionMode === 'manual' 
                            ? 'bg-emerald-600 text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        {ko ? '수동 설정' : 'Manual Setup'}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm max-w-lg mx-auto">
                    {connectionMode === 'scan' 
                      ? (ko ? '웹사이트 URL과 GitHub 저장소를 입력하세요. AI 에이전트가 포괄적으로 분석하여 최적화된 에이전트 팀을 구성합니다.' 
                           : 'Enter your website URL and GitHub repository. AI agents will analyze comprehensively and build an optimized agent team for your company.')
                      : (ko ? 'URL 없는 회사도 연결할 수 있습니다. 회사 정보를 직접 입력하면 업종에 맞는 에이전트 팀을 추천해드립니다.'
                           : 'Connect companies without websites. Enter your company details manually and get industry-specific agent team recommendations.')
                    }
                  </p>
                </div>

                <div className="max-w-4xl mx-auto space-y-4">
                  {/* Input Section */}
                  {connectionMode === 'scan' && (
                    <div className="space-y-4">
                      {/* Scan Website Mode */}
                      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                        <Link2 className="w-5 h-5 text-gray-500 mt-2" />
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
                          placeholder="https://your-company.com"
                          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-1"
                          disabled={loading}
                        />
                      </div>
                      
                      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                        <GitBranch className="w-5 h-5 text-gray-500 mt-2" />
                        <input
                          type="url"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
                          placeholder="https://github.com/username/repo (optional)"
                          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-1"
                          disabled={loading}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                          <Building2 className="w-5 h-5 text-gray-500 mt-1 shrink-0" />
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder={ko ? '회사명 (선택)' : 'Company name (optional)'}
                            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-1 min-w-0"
                            disabled={loading}
                          />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                          <select
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="w-full bg-transparent text-white text-sm outline-none cursor-pointer [&>option]:bg-[#0a0f1a] [&>option]:text-white"
                            disabled={loading}
                          >
                            <option value="">{ko ? '산업/업종 (선택)' : 'Industry (optional)'}</option>
                            <option value="saas">SaaS</option>
                            <option value="ecommerce">E-commerce</option>
                            <option value="finance">Finance / Fintech</option>
                            <option value="media">Media / Content</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="education">Education</option>
                            <option value="marketplace">Marketplace</option>
                            <option value="enterprise">Enterprise / B2B</option>
                            <option value="gaming">Gaming</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                          <select
                            value={teamSize}
                            onChange={(e) => setTeamSize(e.target.value)}
                            className="w-full bg-transparent text-white text-sm outline-none cursor-pointer [&>option]:bg-[#0a0f1a] [&>option]:text-white"
                            disabled={loading}
                          >
                            <option value="">{ko ? '팀 규모 (선택)' : 'Team size (optional)'}</option>
                            <option value="1-10">1–10</option>
                            <option value="11-50">11–50</option>
                            <option value="51-200">51–200</option>
                            <option value="200+">200+</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  {connectionMode === 'manual' && (
                    <div className="space-y-4">
                      {/* Manual Setup Mode */}
                      {/* Company Name (Required) */}
                      <div className="flex gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                        <Building2 className="w-6 h-6 text-emerald-400 mt-1 shrink-0" />
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder={ko ? '회사명을 입력하세요' : 'Enter company name'}
                          className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 outline-none font-medium"
                          disabled={loading}
                          required
                        />
                      </div>
                      
                      {/* Industry and Team Size */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-gray-500 uppercase tracking-wider">
                            {ko ? '산업/업종' : 'Industry'} <span className="text-red-400">*</span>
                          </label>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                            <select
                              value={industry}
                              onChange={(e) => setIndustry(e.target.value)}
                              className="w-full bg-transparent text-white text-sm outline-none cursor-pointer [&>option]:bg-[#0a0f1a] [&>option]:text-white"
                              disabled={loading}
                              required
                            >
                              <option value="">{ko ? '선택하세요' : 'Select industry'}</option>
                              <option value="saas">SaaS</option>
                              <option value="ecommerce">E-commerce</option>
                              <option value="finance">Finance / Fintech</option>
                              <option value="media">Media / Content</option>
                              <option value="healthcare">Healthcare</option>
                              <option value="education">Education</option>
                              <option value="marketplace">Marketplace</option>
                              <option value="enterprise">Enterprise / B2B</option>
                              <option value="gaming">Gaming</option>
                              <option value="manufacturing">Manufacturing / Industrial</option>
                              <option value="import_export">Import / Export / Trade</option>
                              <option value="retail">Retail / Offline Store</option>
                              <option value="construction">Construction / Engineering</option>
                              <option value="consulting">Consulting / Professional Services</option>
                              <option value="food_beverage">Food & Beverage</option>
                              <option value="logistics">Logistics / Transportation</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-gray-500 uppercase tracking-wider">
                            {ko ? '팀 규모' : 'Team Size'} <span className="text-gray-600">(optional)</span>
                          </label>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                            <select
                              value={teamSize}
                              onChange={(e) => setTeamSize(e.target.value)}
                              className="w-full bg-transparent text-white text-sm outline-none cursor-pointer [&>option]:bg-[#0a0f1a] [&>option]:text-white"
                              disabled={loading}
                            >
                              <option value="">{ko ? '선택하세요' : 'Select size'}</option>
                              <option value="1-10">1–10</option>
                              <option value="11-50">11–50</option>
                              <option value="51-200">51–200</option>
                              <option value="200+">200+</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      {/* Company Description */}
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase tracking-wider">
                          {ko ? '회사 설명' : 'Company Description'} <span className="text-gray-600">(optional)</span>
                        </label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                          <textarea
                            value={companyDescription}
                            onChange={(e) => setCompanyDescription(e.target.value)}
                            placeholder={ko ? "회사가 하는 일을 간단히 설명하세요. 예: 산업용 부품 수입 및 기계 수리 서비스 제공" : "What does your company do? e.g., Import industrial parts and provide machine repair services"}
                            className="w-full bg-transparent text-white text-sm placeholder-gray-500 outline-none resize-none h-16"
                            disabled={loading}
                          />
                        </div>
                      </div>
                      
                      {/* Optional Website/GitHub */}
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowOptionalFields(!showOptionalFields)}
                          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
                        >
                          {showOptionalFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {ko ? '웹사이트가 있으신가요?' : 'Have a website?'} <span className="text-gray-600">(optional)</span>
                        </button>
                        
                        {showOptionalFields && (
                          <div className="space-y-3 pl-6">
                            <div className="flex gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
                              <Link2 className="w-4 h-4 text-gray-500 mt-2" />
                              <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://your-company.com (optional)"
                                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-1"
                                disabled={loading}
                              />
                            </div>
                            
                            <div className="flex gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
                              <GitBranch className="w-4 h-4 text-gray-500 mt-2" />
                              <input
                                type="url"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                placeholder="https://github.com/username/repo (optional)"
                                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-1"
                                disabled={loading}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {connectionMode === 'mcp' && (
                    <div className="space-y-4">
                      {/* MCP Connection Mode */}
                      <div className="flex gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                        <Plug className="w-6 h-6 text-blue-400 mt-1 shrink-0" />
                        <input
                          type="url"
                          value={mcpUrl}
                          onChange={(e) => setMcpUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleMcpConnect()}
                          placeholder={ko ? 'MCP 서버 URL' : 'MCP Server URL'}
                          className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 outline-none font-medium"
                          disabled={mcpLoading}
                        />
                      </div>
                      <p className="text-gray-600 text-xs px-1">
                        {ko ? '예: http://localhost:3001/mcp 또는 https://company.example.com/mcp' : 'e.g. http://localhost:3001/mcp or https://company.example.com/mcp'}
                      </p>
                      
                      <div className="flex justify-center">
                        <button
                          onClick={handleMcpConnect}
                          disabled={mcpLoading || !mcpUrl.trim()}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          {mcpLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> {ko ? 'MCP 서버 연결 중...' : 'Connecting to MCP server...'}</>
                          ) : (
                            <><Plug className="w-4 h-4" /> {ko ? '연결' : 'Connect'}</>
                          )}
                        </button>
                      </div>

                      {/* MCP Error */}
                      {mcpError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                          <p className="text-red-400 text-sm">{mcpError}</p>
                        </div>
                      )}

                      {/* MCP Result */}
                      {mcpResult && (
                        <div className="bg-white/5 border border-blue-500/20 rounded-xl p-6 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                            <span className="text-emerald-400 font-medium text-sm">
                              {ko ? 'MCP 서버 연결 성공' : 'MCP Server Connected'}
                            </span>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                              {mcpResult.source === 'mcp' ? 'MCP Protocol' : 'JSON API'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="text-white font-semibold text-lg">{mcpResult.company_name}</h4>
                            {mcpResult.industry && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                {mcpResult.industry}
                              </Badge>
                            )}
                            {mcpResult.description && (
                              <p className="text-gray-400 text-sm">{mcpResult.description}</p>
                            )}
                            {mcpResult.team_size && (
                              <p className="text-gray-500 text-xs">{ko ? '팀 규모' : 'Team size'}: {mcpResult.team_size}</p>
                            )}
                            {mcpResult.resources && mcpResult.resources.length > 0 && (
                              <div className="mt-2">
                                <p className="text-gray-500 text-xs mb-1">{ko ? 'MCP 리소스' : 'MCP Resources'}:</p>
                                <div className="flex flex-wrap gap-1">
                                  {mcpResult.resources.map((r: string, i: number) => (
                                    <Badge key={i} className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs font-mono">
                                      {r}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Recommended Agents */}
                          {mcpResult.agents && mcpResult.agents.length > 0 && (
                            <div>
                              <p className="text-gray-500 text-xs mb-2">{ko ? '추천 에이전트' : 'Recommended Agents'}:</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {mcpResult.agents.map((agentId: string) => {
                                  const meta = AGENT_META[agentId];
                                  if (!meta) return null;
                                  return (
                                    <div key={agentId} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                                      <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-800">
                                        <Image src={meta.image} alt={agentId} width={28} height={28} className="object-cover" />
                                      </div>
                                      <span className="text-xs text-white capitalize">{agentId}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-center pt-2">
                            <button
                              onClick={handleMcpSave}
                              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                            >
                              <Building2 className="w-5 h-5" />
                              {ko ? '_y 타워에 연결' : 'Connect to _y Tower'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Analyze button — only for scan/manual modes */}
                  {connectionMode !== 'mcp' && (
                  <div className="flex justify-center">
                    <button 
                      onClick={handleDiagnose} 
                      disabled={loading || (connectionMode === 'scan' ? (!url.trim() && !githubUrl.trim()) : (!companyName.trim() || !industry))}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> 
                          {analysisPhase === 'phase1' 
                            ? (connectionMode === 'manual' 
                               ? (ko ? '산업 분석 중...' : 'Analyzing industry...') 
                               : (ko ? 'Counsely 스캔 중...' : 'Counsely is scanning...'))
                            : analysisPhase === 'phase2' 
                              ? `${ko ? '팀 구성 중' : 'Building team'} (${completedAgents}/${selectedAgentsList.length})...`
                              : (ko ? '분석 중...' : 'Analyzing...')}
                        </>
                      ) : (
                        <>
                          {connectionMode === 'scan' ? (
                            <><Zap className="w-4 h-4" /> {ko ? 'AI 에이전트로 분석' : 'Analyze with AI Agents'}</>
                          ) : (
                            <><Users className="w-4 h-4" /> {ko ? 'AI 팀 구성하기' : 'Build Your AI Team'}</>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                  )}
                </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Analysis Progress */}
                  {analysisPhase === 'phase1' && (
                    <div className="bg-white/5 border border-purple-500/30 rounded-xl p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10">
                          <Image src="/agents/counsely.png" alt="Counsely" width={48} height={48} className="object-cover" />
                        </div>
                        <div>
                          <div className="text-purple-400 font-medium flex items-center gap-2">
                            Counsely <Activity className="w-4 h-4 animate-pulse" />
                          </div>
                          <div className="text-gray-400 text-sm">
                            {connectionMode === 'manual' 
                              ? (ko ? '업종별 에이전트 매칭 중...' : 'Matching agents for your industry...')
                              : (ko ? '사이트 구조 분석 중...' : 'Analyzing site structure...')
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {analysisPhase === 'phase2' && detectedType && (
                    <div className="space-y-3">
                      <div className="bg-white/5 border border-emerald-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          <div>
                            <div className="text-emerald-400 font-medium">
                              {connectionMode === 'manual' 
                                ? (ko ? '업종 확인' : 'Industry Confirmed') 
                                : (ko ? '감지됨' : 'Detected')
                              }: {detectedType}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {connectionMode === 'manual' 
                                ? `${ko ? '팀 구성 중' : 'Building team'} ${completedAgents}/${selectedAgentsList.length}`
                                : `${completedAgents}/${selectedAgentsList.length} ${ko ? '완료' : 'completed'}`
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analysis Results — show summary before agent selection */}
                  {result && analysisPhase === 'complete' && !showAgentSelection && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg mb-2">
                            {connectionMode === 'manual' ? companyName : (result.title || result.url)}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {result.site_type_label}
                            </Badge>
                            {connectionMode === 'manual' && teamSize && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                {teamSize} people
                              </Badge>
                            )}
                            {result.github_url && (
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                <GitBranch className="w-3 h-3 mr-1" /> GitHub
                              </Badge>
                            )}
                            {connectionMode === 'manual' && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                Manual Setup
                              </Badge>
                            )}
                          </div>
                          {connectionMode === 'manual' && companyDescription && (
                            <p className="text-gray-400 text-sm">{companyDescription}</p>
                          )}
                          {connectionMode === 'scan' && result.meta_description && (
                            <p className="text-gray-400 text-sm">{result.meta_description}</p>
                          )}
                        </div>
                        {connectionMode === 'scan' && (
                          <div className={`flex flex-col items-center p-3 rounded-xl border ${getScoreBg(result.overall_score)}`}>
                            <span className={`text-3xl font-bold ${getScoreColor(result.overall_score)}`}>
                              {result.overall_score}
                            </span>
                            <span className="text-gray-400 text-xs">/100</span>
                          </div>
                        )}
                      </div>

                      {connectionMode === 'manual' ? (
                        <div className="space-y-4 mb-6">
                          {/* Manual Mode Results */}
                          <div className="text-center py-3">
                            <p className="text-emerald-400 font-medium">
                              {ko ? `${result.site_type_label} 업종 기반 추천` : `Based on your industry: ${result.site_type_label}`}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              {ko ? `${result.agents_selected.length}명의 전문 에이전트를 추천합니다` : `We recommend ${result.agents_selected.length} agents for your company:`}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.agents_selected.map((agentId) => {
                              const meta = AGENT_META[agentId];
                              if (!meta) return null;
                              
                              const description = getAgentDescription(agentId, industry);
                              
                              return (
                                <div key={agentId} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0">
                                    <Image src={meta.image} alt={agentId} width={40} height={40} className="object-cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium mb-1 capitalize">
                                      {agentId.charAt(0).toUpperCase() + agentId.slice(1)}
                                    </div>
                                    <p className="text-gray-400 text-xs leading-relaxed">
                                      {description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        agentPlan.length > 0 && (
                          <div className="mb-6">
                            {/* Scan Mode Results */}
                            <div className="flex items-center gap-2 mb-3">
                              <Zap className="w-5 h-5 text-emerald-400" />
                              <h4 className="text-white font-semibold">
                                {ko ? '추천 에이전트 팀' : 'Recommended Agent Team'}
                              </h4>
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                {ko ? 'AI 추천' : 'AI Recommended'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                              {agentPlan.slice(0, 6).map((agent, i) => (
                                <div key={agent.agent} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                                    <Image src={agent.image} alt={agent.name} width={32} height={32} className="object-cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium text-sm">{agent.name}</div>
                                    <div className="text-gray-400 text-xs truncate">{agent.role}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}

                      <div className="text-center">
                        <button 
                          onClick={handleEnterAgentSelection}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                        >
                          <Users className="w-5 h-5" />
                          {ko ? '에이전트 선택하기' : 'Select Agents & Deploy'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Agent Selection Step (main view) */}
                  {result && analysisPhase === 'complete' && showAgentSelection && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <AgentSelectionGrid
                        recommendedAgentIds={recommendedAgentIds}
                        selectedAgentIds={selectedActiveAgents}
                        onToggle={handleToggleAgent}
                        onConfirm={handleConnect}
                        lang={lang}
                      />
                    </div>
                  )}

                  {/* Empty State */}
                  {!result && !loading && !error && analysisPhase === 'idle' && (
                    <div className="text-center py-12 space-y-4">
                      <div className="flex justify-center gap-2 flex-wrap max-w-md mx-auto">
                        {Object.keys(AGENT_META).slice(0, 12).map(agent => (
                          <div key={agent} className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10">
                            <Image src={`/agents/${agent}.png`} alt={agent} width={32} height={32} className="object-cover" />
                          </div>
                        ))}
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 text-xs">
                          +{Object.keys(AGENT_META).length - 12}
                        </div>
                      </div>
                      <p className="text-gray-500 text-sm">
                        {Object.keys(AGENT_META).length} {ko ? '전문 에이전트 대기 중' : 'specialized agents ready'}
                      </p>
                    </div>
                  )}
                </div>
            )
          ) : activeTab === 'about' ? (
            // About _y Holdings — read-only overview
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl"></span>
                <div>
                  <h3 className="text-xl font-bold text-white">_y Holdings</h3>
                  <p className="text-gray-500 text-sm">
                    {ko ? 'AI 에이전트 30명이 운영하는 가상 기업 시뮬레이터' : 'Virtual company simulator powered by 30 AI agents'}
                  </p>
                </div>
              </div>

              {/* Architecture */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <h4 className="text-sm text-amber-400 font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {ko ? '조직 구조' : 'Organization'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* HQ - always present */}
                  <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3">
                    <Building2 className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium">_y Holdings</div>
                      <div className="text-gray-500 text-xs">{ko ? '본사 — 전략, 인사, 보안, 마케팅' : 'HQ — Strategy, HR, Security, Marketing'}</div>
                      <div className="text-gray-600 text-xs mt-0.5">10F-5F</div>
                    </div>
                  </div>
                  {/* Connected companies (all deletable) */}
                  {userCompanies.map((uc: any) => (
                    <div key={uc.id} className="group/sub flex items-start gap-3 bg-black/20 rounded-lg p-3 relative">
                      <Globe className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-sm font-medium">{uc.company_name || uc.title}</div>
                        <div className="text-gray-500 text-xs">{uc.industry || ''}</div>
                        <div className="text-gray-600 text-xs mt-0.5">{uc.agents?.length || 0} {ko ? '에이전트' : 'agents'}</div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm(ko ? `${uc.company_name || uc.title} 계열사를 삭제하시겠습니까?` : `Remove ${uc.company_name || uc.title}?`)) return;
                          try {
                            await fetch('/api/companies', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uc.id }) });
                            const stored = JSON.parse(localStorage.getItem('y-company-connections') || '[]');
                            localStorage.setItem('y-company-connections', JSON.stringify(stored.filter((c: any) => c.id !== uc.id)));
                            window.location.reload();
                          } catch {}
                        }}
                        className="absolute top-2 right-2 sm:opacity-0 sm:group-hover/sub:opacity-100 transition-opacity text-gray-500 hover:text-red-400 text-xs"
                        title={ko ? '삭제' : 'Remove'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {/* Add company prompt */}
                  {userCompanies.length === 0 && (
                    <div className="flex items-start gap-3 bg-black/10 rounded-lg p-3 border border-dashed border-white/10">
                      <Plus className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-gray-500 text-sm font-medium">{ko ? '회사 연결' : 'Your Company'}</div>
                        <div className="text-gray-600 text-xs">{ko ? 'Connect 탭에서 연결' : 'Connect via the Connect tab'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 30 Agents */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <h4 className="text-sm text-amber-400 font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {ko ? '에이전트 30명' : '30 AI Agents'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'counsely', role: ko ? '참모실장' : 'Chief of Staff' },
                    { id: 'tasky', role: ko ? '업무 배분' : 'Task Router' },
                    { id: 'skepty', role: ko ? '비판적 검증' : 'Critical Review' },
                    { id: 'audity', role: ko ? '감사' : 'Audit' },
                    { id: 'buzzy', role: ko ? 'SNS 마케팅' : 'Social Marketing' },
                    { id: 'wordy', role: ko ? '콘텐츠' : 'Content' },
                    { id: 'pixely', role: ko ? '디자인' : 'Design' },
                    { id: 'edity', role: ko ? '편집' : 'Editing' },
                    { id: 'buildy', role: ko ? '개발' : 'Development' },
                    { id: 'stacky', role: ko ? '인프라' : 'Infrastructure' },
                    { id: 'testy', role: ko ? 'QA' : 'QA Testing' },
                    { id: 'guardy', role: ko ? '보안' : 'Security' },
                    { id: 'searchy', role: ko ? '리서치' : 'Research' },
                    { id: 'hiry', role: ko ? '인사' : 'HR' },
                    { id: 'legaly', role: ko ? '법무' : 'Legal' },
                    { id: 'opsy', role: ko ? '운영' : 'Operations' },
                    { id: 'helpy', role: ko ? 'CS' : 'Support' },
                    { id: 'selly', role: ko ? '영업' : 'Sales' },
                    { id: 'globy', role: ko ? '글로벌' : 'Global' },
                    { id: 'growthy', role: ko ? '그로스' : 'Growth' },
                    { id: 'evaly', role: ko ? '평가' : 'Evaluation' },
                    { id: 'valuey', role: ko ? '기업가치' : 'Valuation' },
                    { id: 'hedgy', role: ko ? '리스크' : 'Risk Mgmt' },
                    { id: 'finy', role: ko ? '재무' : 'Finance' },
                    { id: 'logoy', role: ko ? '브랜딩' : 'Branding' },
                    { id: 'clicky', role: ko ? 'UX' : 'UX' },
                    { id: 'fieldy', role: ko ? '현장' : 'Field Ops' },
                    { id: 'tradey', role: ko ? '트레이딩' : 'Trading' },
                    { id: 'quanty', role: ko ? '퀀트' : 'Quant' },
                    { id: 'watchy', role: ko ? '모니터링' : 'Monitoring' },
                  ].map(a => (
                    <div key={a.id} className="flex items-center gap-2 bg-black/20 rounded-lg px-2.5 py-2">
                      <span className="text-gray-400 font-mono">{a.id}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-500 truncate">{a.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Principles */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                <h4 className="text-sm text-amber-400 font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {ko ? '운영 원칙' : 'Operating Principles'}
                </h4>
                <div className="space-y-2 text-sm">
                  {[
                    { emoji: '', text: ko ? '"No Consensus, Just Counsel" — 투표 금지, 각자 분석 → 회장 결재' : '"No Consensus, Just Counsel" — No voting, independent analysis → Chairman decides' },
                    { emoji: '', text: ko ? '위계 기반 의사결정 — 민주적 합의가 아닌 구조적 판단' : 'Hierarchy-based decisions — Structured judgment, not democratic consensus' },
                    { emoji: '', text: ko ? '모든 감지에 Skepty 2차 검증 — 오탐 방지' : 'All detections verified by Skepty — False positive prevention' },
                    { emoji: '', text: ko ? 'Counsely가 정보 필터링 + 전략 판단 + 준비도 평가' : 'Counsely filters info + strategic judgment + readiness assessment' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-black/20 rounded-lg p-3">
                      <span>{p.emoji}</span>
                      <span className="text-gray-400">{p.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                <h4 className="text-sm text-amber-400 font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {ko ? '작동 방식' : 'How It Works'}
                </h4>
                <div className="text-sm text-gray-400 space-y-2">
                  <p>{ko 
                    ? '1. Connect 탭에서 회사를 연결하면, _y Holdings가 AI 에이전트를 배치합니다.'
                    : '1. Connect your company in the Connect tab, and _y Holdings deploys AI agents.'
                  }</p>
                  <p>{ko
                    ? '2. 에이전트들이 회사를 분석하고, 첫 온보딩 리포트를 작성합니다.'
                    : '2. Agents analyze your company and generate an initial onboarding report.'
                  }</p>
                  <p>{ko
                    ? '3. 회장(당신)이 지시를 내리면, 에이전트들이 실행하고 보고합니다.'
                    : '3. The Chairman (you) issues directives. Agents execute and report back.'
                  }</p>
                  <p>{ko
                    ? '4. 의사결정 파이프라인을 통해 중요 결정은 회장 승인을 거칩니다.'
                    : '4. Critical decisions go through the decision pipeline for Chairman approval.'
                  }</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}