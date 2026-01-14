'use client';

import { useState, useEffect, useRef } from 'react';
/* eslint-disable @next/next/no-img-element */
import { Play, Save, RotateCcw, Copy, Check, MessageSquare, Database, Settings, Loader2, Trash2, History, ChevronDown, Users, Key, AlertCircle, CheckCircle, X, Eye, EyeOff } from 'lucide-react';

// Import types and interfaces
import { ClientInfoForm, DEFAULT_CLIENT_INFO, TeamMember } from './types';

// Import component types and data structures
import { COMPONENT_TYPES, ComponentType, getComponentDataStructure, getComponentSchema } from './componentTypes';

// Import data
import { DEFAULT_TEAM_MEMBERS, DEFAULT_CASE_STUDIES, DEFAULT_AWARDS, DEFAULT_INTRO_CARDS, DEFAULT_SERVICES, TEAM_MEMBER_IMAGES } from './data';

// Import prompts (no longer needed - using component prompts only)

// Import component prompt generators
import { generateComponentSystemPrompt, generateComponentUserPrompt } from './componentPrompts';
// Import client-side OpenAI utility
import { generateWithOpenAI } from './openai-client';

export default function PromptDashboard() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [systemPromptEdited, setSystemPromptEdited] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [userPromptEdited, setUserPromptEdited] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfoForm>(DEFAULT_CLIENT_INFO);
  const [rawData, setRawData] = useState(JSON.stringify(DEFAULT_INTRO_CARDS, null, 2));
  const [componentResponses, setComponentResponses] = useState<Record<string, { content: string } | null>>({});
  const [loadingComponents, setLoadingComponents] = useState<Record<string, boolean>>({});
  const [savingRun, setSavingRun] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedFormatted, setCopiedFormatted] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);
  const apiKeyRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  // Click outside handler for API key popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (apiKeyRef.current && !apiKeyRef.current.contains(event.target as Node)) {
        setShowApiKeyInput(false);
      }
    };

    if (showApiKeyInput) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showApiKeyInput]);
  interface SavedRun {
    id: number;
    timestamp: string;
    mode: 'component';
    systemPrompt: string;
    userPrompt: string;
    clientInfo: ClientInfoForm;
    rawData: string;
    response: { content: string };
    componentType?: ComponentType;
  }
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('hero-banner');
  const isLoadingFromHistory = useRef(false);

  // Helper to update a single field in clientInfo
  const updateClientField = (field: keyof ClientInfoForm, value: string) => {
    setClientInfo(prev => ({ ...prev, [field]: value }));
  };

  // Set mounted to true on client-side and load from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('creds_saved_runs');
    if (saved) {
      try {
        setSavedRuns(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse saved runs", err);
      }
    }
    
    const lastClientInfo = localStorage.getItem('creds_client_info');
    if (lastClientInfo) {
      try {
        const parsed = JSON.parse(lastClientInfo);
        setClientInfo(parsed);
      } catch (err) {
        console.error("Failed to parse client info", err);
      }
    }

    // Load API key from localStorage
    const savedApiKey = localStorage.getItem('creds_openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Save runs to localStorage when updated
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('creds_saved_runs', JSON.stringify(savedRuns));
    }
  }, [savedRuns, mounted]);

  // Save client info to localStorage when updated
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('creds_client_info', JSON.stringify(clientInfo));
    }
  }, [clientInfo, mounted]);

  // Save API key to localStorage when updated
  useEffect(() => {
    if (mounted && apiKey) {
      localStorage.setItem('creds_openai_api_key', apiKey);
    }
  }, [apiKey, mounted]);

  // Track previous component to only initialize rawData when component changes
  const prevComponentRef = useRef<ComponentType | null>(null);
  const prevClientInfoRef = useRef<ClientInfoForm | null>(null);
  const prevRawDataRef = useRef<string | null>(null);

  // Update prompts when component changes
  useEffect(() => {
    // If we're loading from history, don't auto-generate prompts
    if (isLoadingFromHistory.current) {
      isLoadingFromHistory.current = false;
      prevComponentRef.current = selectedComponent;
      prevClientInfoRef.current = clientInfo;
      prevRawDataRef.current = rawData;
      return;
    }

    // Component mode - generate prompts dynamically
    const componentChanged = prevComponentRef.current !== selectedComponent;
    const clientInfoChanged = JSON.stringify(prevClientInfoRef.current) !== JSON.stringify(clientInfo);
    const rawDataChanged = prevRawDataRef.current !== rawData;
    
    // If component changed, reset edited flag and auto-generate new prompt
    if (componentChanged) {
      setSystemPromptEdited(false);
      setUserPromptEdited(false);
      const sysPrompt = generateComponentSystemPrompt(selectedComponent, clientInfo, rawData);
      setSystemPrompt(sysPrompt);
      const uPrompt = generateComponentUserPrompt(selectedComponent, clientInfo, (selectedComponent === 'team-members' || selectedComponent === 'case-studies' || selectedComponent === 'awards' || selectedComponent === 'hero-banner' || selectedComponent === 'services') ? rawData : undefined);
      setUserPrompt(uPrompt);
    } else {
      if (!systemPromptEdited && (clientInfoChanged || rawDataChanged)) {
        // If client info or raw data changed and prompt wasn't edited, auto-update
        const sysPrompt = generateComponentSystemPrompt(selectedComponent, clientInfo, rawData);
        setSystemPrompt(sysPrompt);
      }
      if (!userPromptEdited && (clientInfoChanged || rawDataChanged)) {
        // If client info or raw data changed and prompt wasn't edited, auto-update
        const dataToPass = (selectedComponent === 'team-members' || selectedComponent === 'case-studies' || selectedComponent === 'awards' || selectedComponent === 'hero-banner' || selectedComponent === 'services') ? rawData : undefined;
        const uPrompt = generateComponentUserPrompt(selectedComponent, clientInfo, dataToPass);
        setUserPrompt(uPrompt);
      }
    }
    
    // Only initialize rawData when component type actually changes
    if (componentChanged) {
      if (selectedComponent === 'team-members') {
        setRawData(JSON.stringify(DEFAULT_TEAM_MEMBERS, null, 2));
      } else if (selectedComponent === 'case-studies') {
        setRawData(JSON.stringify(DEFAULT_CASE_STUDIES, null, 2));
      } else if (selectedComponent === 'awards') {
        // Initialize to default awards data when switching TO awards component
        setRawData(JSON.stringify(DEFAULT_AWARDS, null, 2));
      } else if (selectedComponent === 'hero-banner') {
        // Initialize to default intro cards data for hero-banner
        setRawData(JSON.stringify(DEFAULT_INTRO_CARDS, null, 2));
      } else if (selectedComponent === 'services') {
        // Initialize to default services data
        setRawData(JSON.stringify(DEFAULT_SERVICES, null, 2));
      } else {
        // Clear rawData for other components
        setRawData('{}');
      }
      prevComponentRef.current = selectedComponent;
    }
    // Update refs
    prevClientInfoRef.current = clientInfo;
    prevRawDataRef.current = rawData;
    // If component hasn't changed, preserve existing rawData (user's pasted data)
  }, [selectedComponent, clientInfo, rawData, systemPromptEdited, userPromptEdited]);

  const generateUserPrompt = () => {
    if (!mounted) return "";
    
    // Return the state userPrompt which may have been edited
    if (userPrompt) return userPrompt;
    
    // Fallback to auto-generation if state is empty (shouldn't happen with the useEffect above)
    const dataToPass = (selectedComponent === 'team-members' || selectedComponent === 'case-studies' || selectedComponent === 'awards' || selectedComponent === 'hero-banner' || selectedComponent === 'services') ? rawData : undefined;
    return generateComponentUserPrompt(selectedComponent, clientInfo, dataToPass);
  };

  const expandPromptData = (text: string) => {
    let expanded = text;
    try {
      const data = rawData ? JSON.parse(rawData) : null;
      
      if (selectedComponent === 'team-members') {
        const teamData = data || DEFAULT_TEAM_MEMBERS;
        expanded = expanded.replace(/{{TEAM_MEMBERS}}/g, JSON.stringify(teamData, null, 2));
        
        // Find the selected intro card member from hero-banner
        let selectedIntroMemberInfo = "None selected";
        
        // Priority 1: Current active hero-banner response
        // Priority 2: Latest hero-banner run in history
        const currentHeroResponse = componentResponses['hero-banner'];
        const heroBannerRun = [...savedRuns].reverse().find(run => run.componentType === 'hero-banner');
        
        const heroDataToUse = currentHeroResponse || (heroBannerRun ? heroBannerRun.response : null);
        
        if (heroDataToUse) {
          try {
            const content = JSON.parse(heroDataToUse.content);
            const introCardId = content.componentData?.introCardId || content.introCardId;
            if (introCardId) {
              const member = DEFAULT_INTRO_CARDS.find(m => m.id === introCardId);
              if (member) {
                selectedIntroMemberInfo = `ID: ${member.id}, Name: ${member.name}, Position: ${member.position}`;
              }
            }
          } catch (e) {
            console.error("Error parsing hero-banner response for intro card:", e);
          }
        }
        expanded = expanded.replace(/{{SELECTED_INTRO_MEMBER}}/g, selectedIntroMemberInfo);
      } else if (selectedComponent === 'case-studies') {
        const caseData = data || DEFAULT_CASE_STUDIES;
        const caseStudies = Array.isArray(caseData) ? caseData : (caseData?.data && Array.isArray(caseData.data) ? caseData.data : []);
        const studySummaries = Array.isArray(caseStudies) ? caseStudies.slice(0, 50).map((study: { id: number; title?: string; description?: string; categories?: string[] }) => ({
          id: study.id,
          title: study.title || 'Untitled',
          description: (study.description || '').substring(0, 300),
          categories: study.categories || []
        })) : [];
        expanded = expanded.replace(/{{CASE_STUDIES}}/g, JSON.stringify(studySummaries, null, 2));
      } else if (selectedComponent === 'awards') {
        const awardsData = data || DEFAULT_AWARDS;
        const awards = Array.isArray(awardsData) ? awardsData : (awardsData?.data && Array.isArray(awardsData.data) ? awardsData.data : []);
        const awardSummaries = Array.isArray(awards) ? awards.slice(0, 50).map((award: { id: number; name?: string; date?: string; description?: string }) => ({
          id: award.id,
          name: award.name || 'Untitled Award',
          date: award.date || '',
          description: (award.description || '').substring(0, 300)
        })) : [];
        expanded = expanded.replace(/{{AWARDS}}/g, JSON.stringify(awardSummaries, null, 2));
      } else if (selectedComponent === 'services') {
        const servicesData = data || DEFAULT_SERVICES;
        const services = Array.isArray(servicesData) ? servicesData : (servicesData?.data && Array.isArray(servicesData.data) ? servicesData.data : []);
        const serviceSummaries = Array.isArray(services) ? services.slice(0, 100).map((service: { id: number; title?: string; slug?: string; description?: string; categories?: string[] }) => ({
          id: service.id,
          title: service.title || 'Untitled',
          slug: service.slug || '',
          description: (service.description || '').substring(0, 300),
          categories: service.categories || []
        })) : [];
        expanded = expanded.replace(/{{SERVICES}}/g, JSON.stringify(serviceSummaries, null, 2));
      } else if (selectedComponent === 'hero-banner') {
        const introCardsData = data || DEFAULT_INTRO_CARDS;
        const introCards = Array.isArray(introCardsData) ? introCardsData : (introCardsData?.data && Array.isArray(introCardsData.data) ? introCardsData.data : []);
        expanded = expanded.replace(/{{INTRO_CARDS}}/g, JSON.stringify(introCards, null, 2));
      }
    } catch (e) {
      console.error("Error expanding prompt data:", e);
    }

    // Expand context placeholder
    expanded = expanded.replace(/{{context}}/g, clientInfo.context || '');
    
    return expanded;
  };

  const handleRun = async () => {
    if (!apiKey || apiKey.trim() === '') {
      setError('Please enter your OpenAI API key in the settings');
      setShowApiKeyInput(true);
      return;
    }

    const componentToRun = selectedComponent;
    setLoadingComponents(prev => ({ ...prev, [componentToRun]: true }));
    setError(null);
    setComponentResponses(prev => ({ ...prev, [componentToRun]: null }));

    // Scroll to results section with offset for sticky header
    setTimeout(() => {
      if (resultRef.current) {
        const headerHeight = 80; // h-20 = 80px
        const gap = 16;
        const elementPosition = resultRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: elementPosition - headerHeight - gap,
          behavior: 'smooth'
        });
      }
    }, 100);

    try {
      const userPrompt = expandPromptData(generateUserPrompt());
      // Use the systemPrompt state (which may be edited by user)
      const sysPrompt = expandPromptData(systemPrompt || generateComponentSystemPrompt(componentToRun, clientInfo, rawData));
      
      // Use client-side OpenAI function with Structured Output schema
      const result = await generateWithOpenAI(apiKey, {
        systemPrompt: sysPrompt,
        userPrompt,
        model: 'gpt-5.2',
        temperature: 0.7,
        response_format: getComponentSchema(componentToRun)
      });

      if (result.error) {
        setError(result.error);
      } else {
        const newResponse = { content: result.content };
        setComponentResponses(prev => ({ ...prev, [componentToRun]: newResponse }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoadingComponents(prev => ({ ...prev, [componentToRun]: false }));
    }
  };

  const handleSaveRun = async () => {
    const currentResponse = componentResponses[selectedComponent];
    if (!currentResponse || savingRun) return;
    
    setSavingRun(true);
    
    // Artificial small delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const newRun: SavedRun = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      mode: 'component',
      systemPrompt: systemPrompt || generateComponentSystemPrompt(selectedComponent, clientInfo, rawData),
      userPrompt: generateUserPrompt(),
      clientInfo,
      rawData,
      response: currentResponse,
      componentType: selectedComponent
    };
    
    setSavedRuns([newRun, ...savedRuns]);
    setSavingRun(false);
    setSaveSuccess(true);
    
    // Reset success state after 2 seconds
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDeleteRun = (id: number) => {
    setSavedRuns(savedRuns.filter(run => run.id !== id));
  };

  const loadRun = (run: SavedRun) => {
    if (!confirm('Are you sure you want to load this saved run? This will overwrite your current prompts and data.')) {
      return;
    }
    
    isLoadingFromHistory.current = true;
    
    if (run.componentType) {
      setSelectedComponent(run.componentType);
    }
    
    setClientInfo(run.clientInfo);
    setRawData(run.rawData);
    setSystemPrompt(run.systemPrompt);
    setUserPrompt(run.userPrompt || '');
    setComponentResponses(prev => ({ ...prev, [run.componentType || selectedComponent]: run.response }));
    
    // Check if the loaded system prompt is different from auto-generated (meaning it was edited)
    const autoSysPrompt = generateComponentSystemPrompt(run.componentType || selectedComponent, run.clientInfo, run.rawData);
    setSystemPromptEdited(run.systemPrompt !== autoSysPrompt);
    
    // Check if the loaded user prompt is different from auto-generated
    const dataToPass = (run.componentType === 'team-members' || run.componentType === 'case-studies' || run.componentType === 'awards' || run.componentType === 'hero-banner' || run.componentType === 'services') ? run.rawData : undefined;
    const autoUserPrompt = generateComponentUserPrompt(run.componentType || selectedComponent, run.clientInfo, dataToPass);
    setUserPromptEdited((run.userPrompt || '') !== autoUserPrompt);
  };

  const isApiKeyValid = apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;

  const PromptVariables = ({ onSelect }: { onSelect: (v: string) => void }) => {
    const commonVars = [
      { name: 'context', color: 'text-blue-400' }
    ];

    const dataVars = [
      { name: 'TEAM_MEMBERS', color: 'text-green-400', show: selectedComponent === 'team-members' },
      { name: 'SELECTED_INTRO_MEMBER', color: 'text-green-400', show: selectedComponent === 'team-members' },
      { name: 'CASE_STUDIES', color: 'text-purple-400', show: selectedComponent === 'case-studies' },
      { name: 'AWARDS', color: 'text-yellow-400', show: selectedComponent === 'awards' },
      { name: 'SERVICES', color: 'text-cyan-400', show: selectedComponent === 'services' },
      { name: 'INTRO_CARDS', color: 'text-blue-400', show: selectedComponent === 'hero-banner' }
    ].filter(v => v.show);

    return (
      <div className="bg-gray-900/50 border-b border-gray-700 px-4 py-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mr-1">Insert:</span>
        {commonVars.map(v => (
          <button
            key={v.name}
            onClick={() => onSelect(`{{${v.name}}}`)}
            className={`text-[10px] px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500 bg-gray-800 transition-all font-mono ${v.color}`}
          >
            {`{{${v.name}}}`}
          </button>
        ))}
        {dataVars.length > 0 && <div className="w-px h-3 bg-gray-700 mx-1" />}
        {dataVars.map(v => (
          <button
            key={v.name}
            onClick={() => onSelect(`{{${v.name}}}`)}
            className={`text-[10px] px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500 bg-gray-800 transition-all font-mono ${v.color}`}
          >
            {`{{${v.name}}}`}
          </button>
        ))}
      </div>
    );
  };

  // Get current response for active component
  const currentResponse = componentResponses[selectedComponent];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 pt-24">
      <header className="fixed top-0 left-0 right-0 h-20 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-6 flex justify-between items-center z-[100] shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">Creds Builder Prompt Fine-tune</h1>
          <p className="text-xs text-gray-400">Optimize AI prompts for component generation</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* API Key Status Button & Popup Container */}
          <div className="relative" ref={apiKeyRef}>
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                isApiKeyValid 
                  ? 'bg-green-900/30 border border-green-500/50 text-green-400 hover:bg-green-900/50' 
                  : 'bg-red-900/30 border border-red-500/50 text-red-400 hover:bg-red-900/50 animate-pulse'
              }`}
              title={isApiKeyValid ? "API Key configured ✓" : "Click to configure API Key"}
            >
              {isApiKeyValid ? (
                <>
                  <CheckCircle size={18} />
                  <span className="hidden sm:inline">API Connected</span>
                </>
              ) : (
                <>
                  <Key size={18} />
                  <span className="hidden sm:inline">Add API Key</span>
                  <AlertCircle size={16} className="text-red-400" />
                </>
              )}
            </button>

            {/* Floating API Key Popup */}
            {showApiKeyInput && (
              <div className="absolute top-full right-0 mt-2 w-[350px] sm:w-[450px] bg-gray-800 rounded-xl overflow-hidden border border-gray-600 shadow-2xl z-[100] animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-600">
                  <div className="flex items-center gap-3">
                    <Key className="text-blue-400" size={20} />
                    <h3 className="font-semibold text-white text-sm">OpenAI API Key</h3>
                    {isApiKeyValid && (
                      <span className="flex items-center gap-1 text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">
                        <CheckCircle size={10} />
                        Connected
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="p-1 hover:bg-gray-600 rounded transition text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showApiKeyValue ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className={`w-full bg-gray-950 px-3 py-2 pr-10 text-xs text-white border rounded-lg focus:ring-2 outline-none placeholder-gray-600 font-mono ${
                          apiKey 
                            ? isApiKeyValid 
                              ? 'border-green-500/50 focus:ring-green-500/30 focus:border-green-500' 
                              : 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-gray-700 focus:ring-blue-500/30 focus:border-blue-500/50'
                        }`}
                      />
                      <button
                        onClick={() => setShowApiKeyValue(!showApiKeyValue)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                      >
                        {showApiKeyValue ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {apiKey && (
                      <button
                        onClick={() => { setApiKey(''); localStorage.removeItem('creds_openai_api_key'); }}
                        className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 rounded-lg transition"
                        title="Clear API Key"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  {apiKey && (
                    <div className={`flex items-center gap-2 text-[10px] ${isApiKeyValid ? 'text-green-400' : 'text-red-400'}`}>
                      {isApiKeyValid ? (
                        <><CheckCircle size={12} /><span>Format valid</span></>
                      ) : (
                        <><AlertCircle size={12} /><span>Invalid format (must start with sk-)</span></>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400 bg-gray-900/50 p-2 rounded-lg leading-relaxed">
                    Key is stored <strong className="text-white">locally</strong>. 
                    Get it from <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-400 hover:underline">OpenAI Platform →</a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Run Test Button */}
          <div className="relative group">
            <button
              onClick={handleRun}
              disabled={loadingComponents[selectedComponent] || !isApiKeyValid}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition ${
                isApiKeyValid 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              } disabled:opacity-50`}
            >
              {loadingComponents[selectedComponent] ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
              {loadingComponents[selectedComponent] ? 'Running...' : 'Run Test'}
            </button>
            {/* Tooltip for disabled state */}
            {!isApiKeyValid && !loadingComponents[selectedComponent] && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400" />
                  <span>Please add your OpenAI API key first</span>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* API Key Missing Warning Banner */}
      {!isApiKeyValid && !showApiKeyInput && (
        <div 
          onClick={() => setShowApiKeyInput(true)}
          className="mb-6 bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-xl p-4 cursor-pointer hover:border-red-500/50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Key size={24} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                OpenAI API Key Required
                <AlertCircle size={14} className="text-red-400" />
              </h3>
              <p className="text-xs text-gray-400">Click here to add your API key and start testing prompts</p>
            </div>
            <div className="text-gray-500 group-hover:text-white transition">
              <Settings size={18} />
            </div>
          </div>
        </div>
      )}

      {/* Global Context - Modern Card Design */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="text-blue-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Context</h2>
          <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">Use {'{{context}}'} in prompts</span>
        </div>
        
        <div className={`transition-all duration-300 ${showClientInfo ? 'opacity-100' : 'opacity-60'}`}>
          {/* Global Context Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
              Context <span className="text-gray-500">(any information needed for your prompts)</span>
            </label>
            <textarea
              value={clientInfo.context}
              onChange={(e) => updateClientField('context', e.target.value)}
              placeholder="Enter any context, information, or details that the AI should know. This can be structured however you want - client info, project details, constraints, goals, etc. Use {{context}} in your prompts to include this content."
              rows={8}
              className="w-full bg-gray-800/50 backdrop-blur-sm px-4 py-2.5 text-sm text-white border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 outline-none placeholder-gray-600 resize-y transition-all hover:border-gray-600 font-mono"
            />
          </div>
        </div>

        <button
          onClick={() => setShowClientInfo(!showClientInfo)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <div className={`transition-transform duration-200 ${showClientInfo ? 'rotate-180' : ''}`}>
            <ChevronDown size={14} />
          </div>
          <span>{showClientInfo ? 'Hide' : 'View'} Client Context as JSON</span>
        </button>

        {showClientInfo && (
          <pre className="mt-2 p-3 bg-gray-900/30 rounded-lg text-[10px] text-blue-400/60 font-mono overflow-auto max-h-[120px] border border-gray-800/50 animate-in fade-in slide-in-from-top-1 duration-200">
            {JSON.stringify(clientInfo, null, 2)}
          </pre>
        )}
      </div>

      {/* Component Selection - Modern Pill Design */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="text-green-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Component Type</h2>
          <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">Select what to generate</span>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {COMPONENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedComponent(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedComponent === type
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-gray-700/50'
              }`}
            >
              {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        <details className="group">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition flex items-center gap-1">
            <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
            View Technical Data Structure for AI
          </summary>
          <pre className="mt-2 p-3 bg-gray-900/30 rounded-lg text-[10px] text-green-400/60 font-mono overflow-auto max-h-[120px] border border-gray-800/50">
            {getComponentDataStructure(selectedComponent)}
          </pre>
        </details>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Prompts and Data */}
        <div className="space-y-8">
          <section className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Settings className="text-purple-400" size={20} />
                System Prompt
                {systemPromptEdited ? (
                  <span className="text-xs font-normal text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">Edited</span>
                ) : (
                  <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded">Auto-generated</span>
                )}
              </div>
              {systemPromptEdited && (
                <button
                  onClick={() => {
                    const autoPrompt = generateComponentSystemPrompt(selectedComponent, clientInfo, rawData);
                    setSystemPrompt(autoPrompt);
                    setSystemPromptEdited(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
                  title="Reset to auto-generated prompt"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              )}
            </div>
            <PromptVariables 
              onSelect={(v) => {
                setSystemPrompt(prev => prev + v);
                setSystemPromptEdited(true);
              }} 
            />
            <textarea
              className="w-full bg-gray-900 p-4 text-sm font-mono text-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[250px] resize-y"
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                setSystemPromptEdited(true);
              }}
              placeholder="System prompt will be auto-generated..."
            />
          </section>

          <section className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Settings className="text-blue-400" size={20} />
                User Message Template
                {userPromptEdited ? (
                  <span className="text-xs font-normal text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">Edited</span>
                ) : (
                  <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded">Auto-generated</span>
                )}
              </div>
              {userPromptEdited && (
                <button
                  onClick={() => {
                    const dataToPass = (selectedComponent === 'team-members' || selectedComponent === 'case-studies' || selectedComponent === 'awards' || selectedComponent === 'hero-banner' || selectedComponent === 'services') ? rawData : undefined;
                    const autoPrompt = generateComponentUserPrompt(selectedComponent, clientInfo, dataToPass);
                    setUserPrompt(autoPrompt);
                    setUserPromptEdited(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
                  title="Reset to auto-generated prompt"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              )}
            </div>
            <PromptVariables 
              onSelect={(v) => {
                setUserPrompt(prev => prev + v);
                setUserPromptEdited(true);
              }} 
            />
            <textarea
              className="w-full bg-gray-900 p-4 text-sm font-mono text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[250px] resize-y"
              value={userPrompt}
              onChange={(e) => {
                setUserPrompt(e.target.value);
                setUserPromptEdited(true);
              }}
              placeholder="User prompt template will be auto-generated..."
            />
          </section>

          {/* Structured Output Schema Preview */}
          <section className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Database className="text-cyan-400" size={20} />
                Target JSON Schema
                <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded">Structured Output Binding</span>
              </div>
            </div>
            <div className="bg-gray-900 p-4">
              <details className="group">
                <summary className="text-xs text-cyan-400 cursor-pointer hover:text-cyan-300 transition flex items-center gap-1">
                  <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                  View Schema Constraints
                </summary>
                <div className="mt-3">
                  <pre className="text-[10px] text-cyan-200/60 font-mono bg-gray-950 p-3 rounded-lg border border-gray-800 overflow-auto max-h-[300px]">
                    {JSON.stringify(getComponentSchema(selectedComponent), null, 2)}
                  </pre>
                </div>
              </details>
              <div className="mt-3 flex items-start gap-2 bg-cyan-900/10 border border-cyan-500/20 p-3 rounded-lg">
                <AlertCircle className="text-cyan-400 shrink-0 mt-0.5" size={14} />
                <p className="text-[10px] text-cyan-300/80 leading-relaxed">
                  The AI is strictly bound to this JSON schema using OpenAI&apos;s Structured Outputs feature. It will not generate any text outside of these fields.
                </p>
              </div>
            </div>
          </section>

          {/* Show available data for components that need it */}
          {(selectedComponent === 'team-members' || selectedComponent === 'case-studies' || selectedComponent === 'awards' || selectedComponent === 'hero-banner' || selectedComponent === 'services') && (
            <section className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
              <div className="bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-600">
                <div className="flex items-center gap-2 font-semibold text-white">
                  {selectedComponent === 'team-members' ? <Users className="text-green-400" size={20} /> : 
                   selectedComponent === 'case-studies' ? <Database className="text-green-400" size={20} /> :
                   selectedComponent === 'awards' ? <Database className="text-yellow-400" size={20} /> :
                   selectedComponent === 'services' ? <Database className="text-cyan-400" size={20} /> :
                   <Users className="text-blue-400" size={20} />}
                  {selectedComponent === 'team-members' ? 'Available Team Members' : 
                   selectedComponent === 'case-studies' ? 'Available Case Studies' :
                   selectedComponent === 'awards' ? 'Available Awards' :
                   selectedComponent === 'services' ? 'Available Services' :
                   'Available Intro Cards'}
                  <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded">
                    {selectedComponent === 'team-members' ? `${DEFAULT_TEAM_MEMBERS.length} members` : 
                     selectedComponent === 'case-studies' ? `${DEFAULT_CASE_STUDIES.length} studies` :
                     selectedComponent === 'awards' ? `${DEFAULT_AWARDS.length} awards` :
                     selectedComponent === 'services' ? `${DEFAULT_SERVICES.length} services` :
                     selectedComponent === 'hero-banner' ? `${DEFAULT_INTRO_CARDS.length} cards` : 'JSON data'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-900 p-4">
                {selectedComponent === 'team-members' ? (
                  <>
                    {/* Visual Team Member Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 max-h-[450px] overflow-auto">
                      {(() => {
                        try {
                          const members = JSON.parse(rawData) as TeamMember[];
                          return members.map((member) => (
                            <div key={member.id} className="bg-gray-800 rounded-lg p-2 border border-gray-700 hover:border-gray-500 transition group">
                              <div className="flex gap-2">
                                <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-700">
                                  <img
                                    src={TEAM_MEMBER_IMAGES[member.id] || 'https://placehold.co/200x200?text=No+Image'}
                                    alt={member.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-semibold text-white truncate" title={member.name}>{member.name}</h4>
                                  <p className="text-[10px] text-blue-400 truncate" title={member.role}>{member.role}</p>
                                  <p className="text-[9px] text-gray-500 font-mono">ID: {member.id}</p>
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-2 line-clamp-2" title={member.description}>{member.description}</p>
                            </div>
                          ));
                        } catch {
                          return <p className="text-red-400 text-sm">Invalid JSON format</p>;
                        }
                      })()}
                    </div>
                    
                    {/* JSON Dropdown */}
                    <details className="group">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition flex items-center gap-1 py-2 border-t border-gray-700">
                        <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                        View / Edit JSON
                      </summary>
                      <textarea
                        className="w-full bg-gray-950 p-3 text-xs font-mono text-green-100 border border-gray-800 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none min-h-[200px] resize-y mt-2"
                        value={rawData}
                        onChange={(e) => setRawData(e.target.value)}
                      />
                    </details>
                  </>
                ) : selectedComponent === 'hero-banner' ? (
                  <>
                    {/* Visual Intro Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 max-h-[450px] overflow-auto">
                      {(() => {
                        try {
                          const introCardsData = rawData ? JSON.parse(rawData) : DEFAULT_INTRO_CARDS;
                          const parsed = Array.isArray(introCardsData) ? introCardsData : (introCardsData?.data || introCardsData);
                          const introCards = Array.isArray(parsed) ? parsed : (Array.isArray(DEFAULT_INTRO_CARDS) ? DEFAULT_INTRO_CARDS : []);
                          if (!Array.isArray(introCards) || introCards.length === 0) {
                            return (
                              <div className="col-span-3 p-4 text-center text-gray-500 text-sm">
                                No intro cards data. Please provide intro cards JSON data below.
                              </div>
                            );
                          }
                          return introCards.map((card: { id: number; imageUrl?: string; name?: string; title?: string; position?: string; email?: string }) => (
                            <div key={card.id} className="bg-gray-800 rounded-lg p-3 border border-blue-500/30">
                              <div className="flex gap-2 mb-2">
                                <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-700">
                                  <img
                                    src={card.imageUrl || 'https://placehold.co/200x200?text=No+Image'}
                                    alt={card.name || card.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-semibold text-white truncate" title={card.name || card.title}>{card.name || card.title || 'Untitled'}</h4>
                                  <p className="text-[10px] text-blue-400 truncate" title={card.position}>{card.position || ''}</p>
                                </div>
                              </div>
                              {card.email && (
                                <p className="text-[9px] text-gray-400 truncate" title={card.email}>{card.email}</p>
                              )}
                              <p className="text-[9px] text-gray-500 font-mono mt-1">ID: {card.id}</p>
                            </div>
                          ));
                        } catch {
                          return <p className="text-red-400 text-sm">Invalid JSON format. Please provide valid intro cards data.</p>;
                        }
                      })()}
                    </div>
                    
                    {/* JSON Editor */}
                    <details className="group">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition flex items-center gap-1 py-2 border-t border-gray-700">
                        <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                        View / Edit JSON
                      </summary>
                      <textarea
                        className="w-full bg-gray-950 p-3 text-xs font-mono text-blue-100 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none min-h-[200px] resize-y mt-2"
                        value={rawData}
                        onChange={(e) => setRawData(e.target.value)}
                        placeholder='Paste your intro cards JSON here. Format: [{"id": 1, "name": "...", "position": "...", "imageUrl": "..."}] or {"data": [...]}'
                      />
                    </details>
                  </>
                ) : selectedComponent === 'awards' ? (
                  <>
                    {/* Visual Awards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-h-[450px] overflow-auto">
                      {(() => {
                        try {
                          const awardsData = rawData ? JSON.parse(rawData) : [];
                          const awards = Array.isArray(awardsData) ? awardsData : (awardsData.data || []);
                          if (awards.length === 0) {
                            return (
                              <div className="col-span-2 p-4 text-center text-gray-500 text-sm">
                                No awards data. Please provide awards JSON data below.
                              </div>
                            );
                          }
                          return awards.map((award: { id: number; name?: string; date?: string; description?: string }) => (
                            <div key={award.id} className="bg-gray-800 rounded-lg p-3 border border-yellow-500/30">
                              <h4 className="text-sm font-semibold text-white mb-1" title={award.name}>{award.name || 'Untitled Award'}</h4>
                              {award.date && (
                                <p className="text-xs text-yellow-400 mb-1">{award.date}</p>
                              )}
                              {award.description && (
                                <p className="text-[10px] text-gray-400 mt-2 line-clamp-2" title={award.description}>{award.description}</p>
                              )}
                              <p className="text-[9px] text-gray-500 font-mono mt-1">ID: {award.id}</p>
                            </div>
                          ));
                        } catch {
                          return <p className="text-red-400 text-sm">Invalid JSON format. Please provide valid awards data.</p>;
                        }
                      })()}
                    </div>
                    
                    {/* JSON Editor */}
                    <details className="group" open>
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition flex items-center gap-1 py-2 border-t border-gray-700">
                        <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                        View / Edit Awards JSON
                      </summary>
                      <textarea
                        className="w-full bg-gray-950 p-3 text-xs font-mono text-yellow-100 border border-gray-800 rounded-lg focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500/50 outline-none min-h-[200px] resize-y mt-2"
                        value={rawData}
                        onChange={(e) => setRawData(e.target.value)}
                        placeholder='Paste your awards JSON here. Format: [{"id": 1, "name": "...", "date": "...", "description": "..."}] or {"data": [...]}'
                      />
                    </details>
                  </>
                ) : selectedComponent === 'case-studies' ? (
                  <>
                    {/* Visual Case Studies Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-h-[450px] overflow-auto">
                      {(() => {
                        try {
                          const caseData = rawData ? JSON.parse(rawData) : DEFAULT_CASE_STUDIES;
                          const caseStudies = Array.isArray(caseData) ? caseData : (caseData.data || caseData);
                          if (!Array.isArray(caseStudies) || caseStudies.length === 0) {
                            return (
                              <div className="col-span-2 p-4 text-center text-gray-500 text-sm">
                                No case studies data. Please provide case studies JSON data below.
                              </div>
                            );
                          }
                          return caseStudies.map((study: { id: number; imageUrl?: string; title?: string; name?: string; year?: string; description?: string; categories?: string[] }) => (
                            <div key={study.id} className="bg-gray-800 rounded-lg p-3 border border-purple-500/30">
                              {study.imageUrl && (
                                <div className="mb-2 rounded overflow-hidden">
                                  <img src={study.imageUrl} alt={study.title || 'Case Study'} className="w-full h-24 object-cover" />
                                </div>
                              )}
                              <h4 className="text-sm font-semibold text-white mb-1" title={study.title || study.name}>{study.title || study.name || 'Untitled Case Study'}</h4>
                              {study.year && (
                                <p className="text-xs text-purple-400 mb-1">{study.year}</p>
                              )}
                              {study.description && (
                                <p className="text-xs text-gray-400 mt-2 line-clamp-3" title={study.description}>{study.description}</p>
                              )}
                              {study.categories && Array.isArray(study.categories) && study.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {study.categories.map((cat: string, idx: number) => (
                                    <span key={idx} className="text-[10px] bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">
                                      {cat}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-[9px] text-gray-500 font-mono mt-2">ID: {study.id}</p>
                            </div>
                          ));
                        } catch {
                          return <p className="text-red-400 text-sm">Invalid JSON format. Please provide valid case studies data.</p>;
                        }
                      })()}
                    </div>
                    
                    {/* JSON Editor */}
                    <details className="group">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition flex items-center gap-1 py-2 border-t border-gray-700">
                        <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                        View / Edit JSON
                      </summary>
                      <textarea
                        className="w-full bg-gray-950 p-3 text-xs font-mono text-purple-100 border border-gray-800 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none min-h-[200px] resize-y mt-2"
                        value={rawData}
                        onChange={(e) => setRawData(e.target.value)}
                        placeholder='Paste your case studies JSON here. Format: [{"id": 1, "title": "...", "description": "...", "year": "...", "imageUrl": "...", "categories": []}] or {"data": [...]}'
                      />
                    </details>
                  </>
                ) : selectedComponent === 'services' ? (
                  <>
                    {/* Visual Services Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-h-[450px] overflow-auto">
                      {(() => {
                        try {
                          const servicesData = rawData ? JSON.parse(rawData) : DEFAULT_SERVICES;
                          const services = Array.isArray(servicesData) ? servicesData : (servicesData.data || servicesData);
                          if (!Array.isArray(services) || services.length === 0) {
                            return (
                              <div className="col-span-2 p-4 text-center text-gray-500 text-sm">
                                No services data. Please provide services JSON data below.
                              </div>
                            );
                          }
                          return services.map((service: { id: number; title?: string; description?: string; slug?: string }) => (
                            <div key={service.id} className="bg-gray-800 rounded-lg p-3 border border-cyan-500/30">
                              <h4 className="text-sm font-semibold text-white mb-1" title={service.title}>{service.title || 'Untitled Service'}</h4>
                              {service.description && (
                                <p className="text-xs text-gray-400 mt-2 line-clamp-3" title={service.description}>{service.description}</p>
                              )}
                              {service.slug && (
                                <p className="text-[10px] text-cyan-400 mt-1 font-mono">/{service.slug}</p>
                              )}
                              <p className="text-[9px] text-gray-500 font-mono mt-2">ID: {service.id}</p>
                            </div>
                          ));
                        } catch {
                          return <p className="text-red-400 text-sm">Invalid JSON format. Please provide valid services data.</p>;
                        }
                      })()}
                    </div>
                    
                    {/* JSON Editor */}
                    <details className="group" open>
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition flex items-center gap-1 py-2 border-t border-gray-700">
                        <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                        View / Edit Services JSON
                      </summary>
                      <textarea
                        className="w-full bg-gray-950 p-3 text-xs font-mono text-cyan-100 border border-gray-800 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none min-h-[200px] resize-y mt-2"
                        value={rawData}
                        onChange={(e) => setRawData(e.target.value)}
                        placeholder='Paste your services JSON here. Format: [{"id": 1, "title": "...", "slug": "...", "description": "..."}] or {"data": [...]}'
                      />
                    </details>
                  </>
                ) : (
                  <textarea
                    className="w-full bg-gray-950 p-3 text-sm font-mono text-green-50 border border-gray-800 rounded-lg focus:outline-none min-h-[250px] resize-y"
                    value={rawData}
                    onChange={(e) => setRawData(e.target.value)}
                  />
                )}
              </div>
            </section>
          )}


          <section className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-2 font-semibold text-white">
                <MessageSquare className="text-orange-400" size={20} />
                Complete AI Prompt (Preview)
                <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded">Live Preview</span>
              </div>
            </div>
            <div className="w-full bg-gray-950 p-4 text-xs font-mono min-h-[200px] max-h-[500px] overflow-auto space-y-4">
              {/* System Prompt Section */}
              <div className="border-l-2 border-purple-500 pl-3">
                <p className="text-purple-400 font-bold mb-2 text-[10px] uppercase tracking-wider">System Prompt</p>
                <pre className="text-purple-200/70 whitespace-pre-wrap">
                  {expandPromptData(systemPrompt || generateComponentSystemPrompt(selectedComponent, clientInfo, rawData))}
                </pre>
              </div>
              
              {/* User Message Section */}
              <div className="border-l-2 border-blue-500 pl-3">
                <p className="text-blue-400 font-bold mb-2 text-[10px] uppercase tracking-wider">User Message</p>
                <pre className="text-blue-200/70 whitespace-pre-wrap">{expandPromptData(generateUserPrompt())}</pre>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Results and History */}
        <div className="space-y-8">
          <section 
            ref={resultRef}
            className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg flex flex-col min-h-[500px]"
          >
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-2 font-semibold text-white">
                <MessageSquare className="text-pink-400" size={20} />
                Current Result
              </div>
              <div className="flex gap-2">
                {currentResponse && (
                  <>
                    <button 
                      onClick={handleSaveRun}
                      disabled={savingRun || saveSuccess}
                      className={`flex items-center gap-1.5 text-white text-xs px-3 py-1.5 rounded-md transition-all font-medium ${
                        saveSuccess 
                          ? 'bg-green-600 shadow-lg shadow-green-900/20' 
                          : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-70'
                      }`}
                    >
                      {savingRun ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : saveSuccess ? (
                        <Check size={14} />
                      ) : (
                        <Save size={14} />
                      )}
                      {savingRun ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Run'}
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(currentResponse, null, 2));
                        setCopiedRaw(true);
                        setTimeout(() => setCopiedRaw(false), 2000);
                      }}
                      className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                        copiedRaw 
                          ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' 
                          : 'bg-gray-600 hover:bg-gray-500 text-white'
                      }`}
                      title="Copy raw response"
                    >
                      {copiedRaw ? <Check size={14} /> : <Copy size={14} />}
                      {copiedRaw ? 'Copied!' : 'Raw'}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 bg-gray-900 p-6 overflow-auto">
              {loadingComponents[selectedComponent] ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                  <Loader2 className="animate-spin" size={48} />
                  <p className="text-lg">AI is thinking...</p>
                  <p className="text-xs text-gray-600">Generating {selectedComponent}...</p>
                </div>
              ) : error ? (
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg text-red-400">
                  <h3 className="font-bold mb-2">Error</h3>
                  <p>{error}</p>
                </div>
              ) : currentResponse ? (
                <div className="space-y-4">
                  <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-lg">
                    <h3 className="text-blue-400 font-semibold mb-3">
                      Component Generation Result
                    </h3>
                    {(() => {
                      try {
                        // Handle markdown code blocks in response
                        let responseText = currentResponse.content.trim();
                        // Remove markdown code blocks if present
                        if (responseText.startsWith('```')) {
                          const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                          if (match) {
                            responseText = match[1].trim();
                          }
                        }
                        const content = JSON.parse(responseText);
                        const teamMembers = (() => {
                          try { 
                            const parsed = JSON.parse(rawData);
                            return Array.isArray(parsed) ? parsed : (parsed?.data && Array.isArray(parsed.data) ? parsed.data : []);
                          } catch { 
                            return [] as TeamMember[]; 
                          }
                        })();
                        
                        // Component mode response
                        if (content.componentData) {
                          const componentData = content.componentData;
                          
                          // Special handling for team-members and case-studies
                          if (selectedComponent === 'team-members' && componentData.selectedMemberIds) {
                            return (
                              <div className="space-y-4">
                                {/* Selected Team Members */}
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                                    Selected Team Members ({componentData.selectedMemberIds.length})
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(componentData.priorityOrder || componentData.selectedMemberIds).map((id: number, index: number) => {
                                      const member = teamMembers.find((m: { id: number }) => m.id === id);
                                      // Only show if ID is in selectedMemberIds
                                      if (!componentData.selectedMemberIds.includes(id)) return null;
                                      
                                      return member ? (
                                        <div key={id} className="bg-gray-800 rounded-lg p-3 border border-green-500/30 relative">
                                          <div className="absolute -top-2 -left-2 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                                            {index + 1}
                                          </div>
                                          <div className="flex gap-3">
                                            <div className="relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-gray-700">
                                              <img
                                                src={TEAM_MEMBER_IMAGES[member.id] || 'https://placehold.co/200x200?text=No+Image'}
                                                alt={member.name}
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <h4 className="text-sm font-semibold text-white truncate" title={member.name}>{member.name}</h4>
                                              <p className="text-xs text-green-400 truncate" title={member.role}>{member.role}</p>
                                              <p className="text-[9px] text-gray-500 font-mono">ID: {member.id}</p>
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-gray-400 mt-2 line-clamp-2" title={member.description}>{member.description}</p>
                                        </div>
                                      ) : (
                                        <div key={id} className="bg-gray-800 rounded-lg p-3 border border-yellow-500/30">
                                          <p className="text-xs text-yellow-400">Member ID: {id}</p>
                                          <p className="text-[10px] text-gray-500">Not found in data</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          if (selectedComponent === 'case-studies' && componentData.selectedStudyIds) {
                            // Parse case studies data from rawData
                            const caseStudies = (() => {
                              try {
                                const caseData = rawData ? JSON.parse(rawData) : DEFAULT_CASE_STUDIES;
                                if (Array.isArray(caseData)) return caseData;
                                if (caseData?.data && Array.isArray(caseData.data)) return caseData.data;
                                return [];
                              } catch {
                                return [];
                              }
                            })();
                            
                            return (
                              <div className="space-y-4">
                                
                                {/* Selected Case Studies */}
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                                    Selected Case Studies ({componentData.selectedStudyIds.length})
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(componentData.priorityOrder || componentData.selectedStudyIds).map((id: number, index: number) => {
                                      const study = caseStudies.find((s: { id: number }) => s.id === id);
                                      // Only show if ID is in selectedStudyIds
                                      if (!componentData.selectedStudyIds.includes(id)) return null;

                                      return study ? (
                                        <div key={id} className="bg-gray-800 rounded-lg p-3 border border-purple-500/30 relative">
                                          <div className="absolute -top-2 -left-2 bg-purple-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                                            {index + 1}
                                          </div>
                                          {study.imageUrl && (
                                            <div className="mb-2 rounded overflow-hidden">
                                              <img src={study.imageUrl} alt={study.title || 'Case Study'} className="w-full h-24 object-cover" />
                                            </div>
                                          )}
                                          <h4 className="text-sm font-semibold text-white mb-1" title={study.title || study.name}>{study.title || study.name || 'Untitled Case Study'}</h4>
                                          {study.year && (
                                            <p className="text-xs text-purple-400 mb-1">{study.year}</p>
                                          )}
                                          {study.description && (
                                            <p className="text-xs text-gray-400 mt-2 line-clamp-3" title={study.description}>{study.description}</p>
                                          )}
                                          {study.categories && Array.isArray(study.categories) && study.categories.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {study.categories.map((cat: string, idx: number) => (
                                                <span key={idx} className="text-[10px] bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">
                                                  {cat}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-[9px] text-gray-500 font-mono mt-2">ID: {study.id}</p>
                                        </div>
                                      ) : (
                                        <div key={id} className="bg-gray-800 rounded-lg p-3 border border-yellow-500/30">
                                          <p className="text-xs text-yellow-400">Case Study ID: {id}</p>
                                          <p className="text-[10px] text-gray-500">Not found in data</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          if (selectedComponent === 'awards' && componentData.selectedAwardIds) {
                            // Parse awards data from rawData
                            const awards = (() => {
                              try {
                                const awardsData = rawData ? JSON.parse(rawData) : DEFAULT_AWARDS;
                                if (Array.isArray(awardsData)) return awardsData;
                                if (awardsData?.data && Array.isArray(awardsData.data)) return awardsData.data;
                                return [];
                              } catch {
                                return [];
                              }
                            })();
                            
                            return (
                              <div className="space-y-4">
                                {/* Selected Awards */}
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                                    Selected Awards ({componentData.selectedAwardIds.length})
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(componentData.priorityOrder || componentData.selectedAwardIds).map((id: number, index: number) => {
                                      const award = awards.find((a: { id: number }) => a.id === id);
                                      // Only show if ID is in selectedAwardIds
                                      if (!componentData.selectedAwardIds.includes(id)) return null;
                                      
                                      return award ? (
                                        <div key={id} className="bg-gray-800 rounded-lg p-3 border border-yellow-500/30 relative">
                                          <div className="absolute -top-2 -left-2 bg-yellow-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                                            {index + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-white mb-1" title={award.name}>{award.name || 'Untitled Award'}</h4>
                                            {award.date && (
                                              <p className="text-xs text-yellow-400 mb-1">{award.date}</p>
                                            )}
                                            {award.description && (
                                              <p className="text-[10px] text-gray-400 mt-2 line-clamp-2" title={award.description}>{award.description}</p>
                                            )}
                                            <p className="text-[9px] text-gray-500 font-mono mt-1">ID: {award.id}</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div key={id} className="bg-gray-800 rounded-lg p-3 border border-yellow-500/30">
                                          <p className="text-xs text-yellow-400">Award ID: {id}</p>
                                          <p className="text-[10px] text-gray-500">Not found in data</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          if (selectedComponent === 'hero-banner') {
                            // Parse intro cards data from rawData
                            const introCards = (() => {
                              try {
                                const introCardsData = rawData ? JSON.parse(rawData) : DEFAULT_INTRO_CARDS;
                                const parsed = Array.isArray(introCardsData) ? introCardsData : (introCardsData?.data || introCardsData);
                                // Ensure we always return an array
                                return Array.isArray(parsed) ? parsed : (Array.isArray(DEFAULT_INTRO_CARDS) ? DEFAULT_INTRO_CARDS : []);
                              } catch {
                                return Array.isArray(DEFAULT_INTRO_CARDS) ? DEFAULT_INTRO_CARDS : [];
                              }
                            })();
                            
                            // Find intro card if introCardId is provided
                            // Convert to number for comparison to handle string/number type mismatches
                            const introCard = componentData.introCardId && Array.isArray(introCards)
                              ? introCards.find((card: { id: number }) => {
                                  const cardId = typeof card.id === 'number' ? card.id : Number(card.id);
                                  const searchId = typeof componentData.introCardId === 'number' 
                                    ? componentData.introCardId 
                                    : Number(componentData.introCardId);
                                  return cardId === searchId;
                                })
                              : null;
                            
                            return (
                              <div className="space-y-4">
                                {/* Hero Banner Content */}
                                <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-lg">
                                  <p className="text-xs text-blue-400 uppercase tracking-wider mb-3">Hero Banner Content</p>
                                  
                                  {/* Title */}
                                  {componentData.title && (
                                    <div className="mb-3">
                                      <p className="text-xs text-gray-400 mb-1">Title (max 3 words)</p>
                                      <h2 className="text-2xl font-bold text-white">{componentData.title}</h2>
                                    </div>
                                  )}
                                  
                                  {/* Subtitle */}
                                  {componentData.subtitle && (
                                    <div className="mb-3">
                                      <p className="text-xs text-gray-400 mb-1">Subtitle</p>
                                      <p className="text-lg text-gray-200">{componentData.subtitle}</p>
                                    </div>
                                  )}
                                  
                                  {/* Intro Card */}
                                  {componentData.introCardId && (
                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Selected Intro Card</p>
                                      {introCard ? (
                                        <div className="bg-gray-800 rounded-lg p-3 border border-blue-500/30">
                                          <div className="flex gap-3">
                                            <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-700">
                                              <img
                                                src={introCard.imageUrl || 'https://placehold.co/200x200?text=No+Image'}
                                                alt={introCard.name || introCard.title}
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <h4 className="text-sm font-semibold text-white truncate" title={introCard.name || introCard.title}>
                                                {introCard.name || introCard.title || 'Untitled'}
                                              </h4>
                                              <p className="text-xs text-blue-400 truncate" title={introCard.position}>
                                                {introCard.position || ''}
                                              </p>
                                              {introCard.email && (
                                                <p className="text-[10px] text-gray-400 truncate mt-1" title={introCard.email}>
                                                  {introCard.email}
                                                </p>
                                              )}
                                              {introCard.phone && (
                                                <p className="text-[10px] text-gray-400 truncate" title={introCard.phone}>
                                                  {introCard.phone}
                                                </p>
                                              )}
                                              <p className="text-[9px] text-gray-500 font-mono mt-1">ID: {introCard.id}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="bg-gray-800 rounded-lg p-3 border border-yellow-500/30">
                                          <p className="text-xs text-yellow-400">Intro Card ID: {componentData.introCardId} (type: {typeof componentData.introCardId})</p>
                                          <p className="text-[10px] text-gray-500">Not found in data</p>
                                          <p className="text-[9px] text-gray-600 mt-1">
                                            Available IDs: {Array.isArray(introCards) ? introCards.map((c: { id: number }) => c.id).join(', ') : 'No intro cards available'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {!componentData.introCardId && (
                                    <p className="text-xs text-gray-500 italic mt-2">No intro card selected</p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          if (selectedComponent === 'services' && componentData.selectedServiceIds) {
                            // Parse services data from rawData
                            const services = (() => {
                              try {
                                const servicesData = rawData ? JSON.parse(rawData) : DEFAULT_SERVICES;
                                if (Array.isArray(servicesData)) return servicesData;
                                if (servicesData?.data && Array.isArray(servicesData.data)) return servicesData.data;
                                return [];
                              } catch {
                                return [];
                              }
                            })();
                            
                            return (
                              <div className="space-y-4">
                                {/* Selected Services */}
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                                    Selected Services ({componentData.selectedServiceIds.length})
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(componentData.priorityOrder || componentData.selectedServiceIds).map((id: number, index: number) => {
                                      const service = services.find((s: { id: number }) => s.id === id);
                                      // Only show if ID is in selectedServiceIds
                                      if (!componentData.selectedServiceIds.includes(id)) return null;
                                      
                                      return service ? (
                                        <div key={id} className="bg-gray-800 rounded-lg p-3 border border-cyan-500/30 relative">
                                          <div className="absolute -top-2 -left-2 bg-cyan-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                                            {index + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-white mb-1" title={service.title}>{service.title || 'Untitled Service'}</h4>
                                            {service.description && (
                                              <p className="text-xs text-gray-400 mt-2 line-clamp-3" title={service.description}>{service.description}</p>
                                            )}
                                            {service.slug && (
                                              <p className="text-[10px] text-cyan-400 mt-1 font-mono">/{service.slug}</p>
                                            )}
                                            <p className="text-[9px] text-gray-500 font-mono mt-2">ID: {service.id}</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div key={id} className="bg-gray-800 rounded-lg p-3 border border-yellow-500/30">
                                          <p className="text-xs text-yellow-400">Service ID: {id}</p>
                                          <p className="text-[10px] text-gray-500">Not found in data</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (selectedComponent === 'background') {
                            return (
                              <div className="space-y-4">
                                <div className="bg-indigo-900/10 border border-indigo-500/30 p-4 rounded-lg">
                                  <p className="text-xs text-indigo-400 uppercase tracking-wider mb-3">Background Section Content</p>
                                  
                                  {/* Heading */}
                                  {componentData.heading && (
                                    <div className="mb-3">
                                      <p className="text-xs text-gray-400 mb-1">Heading</p>
                                      <h2 className="text-xl font-bold text-white">{componentData.heading}</h2>
                                    </div>
                                  )}
                                  
                                  {/* Text */}
                                  {componentData.text && (
                                    <div>
                                      <p className="text-xs text-gray-400 mb-1">Description</p>
                                      <p className="text-base text-gray-200 leading-relaxed">{componentData.text}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          // Default component data display
                          return (
                            <div className="space-y-4">
                              {/* Component Data */}
                              <div className="bg-green-900/10 border border-green-500/30 p-3 rounded-lg">
                                <p className="text-xs text-green-400 uppercase tracking-wider mb-2">Generated Component Data</p>
                                <pre className="text-xs text-green-200/80 overflow-auto max-h-[400px] whitespace-pre-wrap">
                                  {JSON.stringify(content.componentData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          );
                        }
                        
                        // Fallback if no componentData
                        return (
                          <div className="space-y-4">
                            <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg text-yellow-400">
                              <h3 className="font-bold mb-2">⚠️ Unexpected Response Format</h3>
                              <p className="text-sm">The response does not match the expected component data structure.</p>
                            </div>
                          </div>
                        );
                      } catch (parseError) {
                        // If parsing fails, try to extract JSON from markdown or show raw response
                        console.error('Failed to parse response:', parseError);
                        return (
                          <div className="space-y-4">
                            <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg text-yellow-400">
                              <h3 className="font-bold mb-2">⚠️ Response Parsing Error</h3>
                              <p className="text-sm mb-2">Could not parse the AI response as JSON. Showing raw response:</p>
                              <pre className="text-xs text-yellow-200/80 whitespace-pre-wrap overflow-auto max-h-[400px] bg-gray-900/50 p-3 rounded">
                                {currentResponse.content}
                              </pre>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-gray-400 font-semibold mb-0">Raw JSON Response</h3>
                      <button 
                        onClick={() => {
                          try {
                            // Extract JSON from markdown if present
                            let text = currentResponse.content.trim();
                            if (text.startsWith('```')) {
                              const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                              if (match) text = match[1].trim();
                            }
                            const parsed = JSON.parse(text);
                            navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
                          } catch {
                            navigator.clipboard.writeText(currentResponse.content);
                          }
                          setCopiedFormatted(true);
                          setTimeout(() => setCopiedFormatted(false), 2000);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium border rounded transition-all ${
                          copiedFormatted
                            ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20'
                            : 'text-gray-400 bg-gray-900/50 hover:bg-gray-700 hover:text-white border-gray-700'
                        }`}
                        title="Copy formatted JSON"
                      >
                        {copiedFormatted ? <Check size={12} /> : <Copy size={12} />}
                        {copiedFormatted ? 'Copied!' : 'Copy Formatted'}
                      </button>
                    </div>
                    <pre className="text-[11px] text-gray-300 overflow-auto max-h-[400px] whitespace-pre-wrap font-mono bg-gray-950/50 p-3 rounded border border-gray-800 shadow-inner">
                      {(() => {
                        try {
                          let text = currentResponse.content.trim();
                          if (text.startsWith('```')) {
                            const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                            if (match) text = match[1].trim();
                          }
                          const parsed = JSON.parse(text);
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return currentResponse.content;
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 text-gray-500">
                  <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center">
                    <MessageSquare size={32} className="text-gray-600 opacity-20" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">No result yet</h3>
                    <p className="text-xs max-w-[250px] mx-auto mt-1">
                      Configure your client info and click &quot;Run Test&quot; to generate content for this component.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* History Section */}
          <section className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg flex flex-col">
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-2 font-semibold text-white">
                <History className="text-blue-400" size={20} />
                Saved History
                <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded">{savedRuns.length} runs</span>
              </div>
              {savedRuns.length > 0 && (
                <button 
                  onClick={() => { if(confirm('Clear all history?')) setSavedRuns([]); }}
                  className="text-xs text-red-400 hover:text-red-300 font-medium transition"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="bg-gray-900 p-2 max-h-[600px] overflow-auto">
              {savedRuns.length === 0 ? (
                <div className="p-8 text-center text-gray-600 italic">
                  No saved runs yet. Save a result to see it here.
                </div>
              ) : (
                <div className="space-y-2">
                  {savedRuns.map((run) => (
                    <div 
                      key={run.id} 
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-gray-500 transition cursor-default group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-green-900/40 text-green-300">
                            {run.componentType ? `${run.componentType}` : 'component'}
                          </span>
                          <span className="ml-2 text-[10px] text-gray-500">{run.timestamp}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button 
                            onClick={() => loadRun(run)}
                            className="p-1 hover:bg-gray-700 rounded text-blue-400"
                            title="Load this run"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRun(run.id)}
                            className="p-1 hover:bg-gray-700 rounded text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-300 line-clamp-2 italic mb-2">
                        {(() => {
                          try {
                            const content = JSON.parse(run.response.content);
                            if (content.componentData?.title) return content.componentData.title;
                            if (content.componentData?.heading) return content.componentData.heading;
                            // If no title/heading, show component type
                            return `${run.componentType || 'Component'} Selection`;
                          } catch {
                            return run.response.content.substring(0, 100) + "...";
                          }
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

