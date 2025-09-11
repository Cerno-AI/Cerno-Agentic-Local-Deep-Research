import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import LeftSideBar from './components/LeftSidebar/LeftSideBar';
import MainChatWindow from './components/MainChatWindow/MainChatWindow';
import RightPanel from './components/RightPanel/RightPanel';
import { AnimatePresence, motion } from "framer-motion";
import type { Session, MessageData, UserMessageData, AgentMessageData, TaskStepData, Artifact } from './types';
import { useEventSourceProcessor } from './hooks/useEventSourceProcessor';
import { type GroupedModels } from './components/MainChatWindow/ModelSelector';

const DEFAULT_RIGHT_PANEL_WIDTH = 500;
const MIN_RIGHT_PANEL_WIDTH = 200;
const MAX_RIGHT_PANEL_WIDTH = 800;

const AiWorkspaceLayout: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([{ id: 's1', name: 'Initial Session', active: true, status: 'pending' }]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>('s1');

  // State for managing the running task
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [activeTaskSessionId, setActiveTaskSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageData[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [fileListRefreshTrigger, setFileListRefreshTrigger] = useState(0);
  const [fileToAutoOpen, setFileToAutoOpen] = useState<string | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_RIGHT_PANEL_WIDTH);
  const [availableModels, setAvailableModels] = useState<GroupedModels>({});
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);
        const response = await fetch('/api/models/');
        if (!response.ok) {
          throw new Error('Failed to fetch models from the server.');
        }
        const data: GroupedModels = await response.json();
        setAvailableModels(data);

        let defaultModelSet = false;

        if (data) {
          // First, check if Ollama models are available and use the first one as default
          if (data['Ollama'] && data['Ollama'].length > 0) {
            setSelectedModelId(data['Ollama'][0].id);
            defaultModelSet = true;
            console.log(`Using first Ollama model as default: ${data['Ollama'][0].id}`);
          } else {
            // Fallback to the preferred cloud model
            const preferredDefaultModel = "gemini-2.5-flash-preview-05-20";
            for (const provider in data) {
              if (data[provider].some(model => model.id === preferredDefaultModel)) {
                setSelectedModelId(preferredDefaultModel);
                defaultModelSet = true;
                break;
              }
            }
          }
        }

        if (!defaultModelSet && data && Object.keys(data).length > 0) {
          const firstProvider = Object.keys(data)[0];
          if (data[firstProvider] && data[firstProvider].length > 0) {
            setSelectedModelId(data[firstProvider][0].id);
            console.warn(`No preferred models found. Falling back to '${data[firstProvider][0].id}'.`);
          }
        }
      } catch (error) {
        console.error("Error fetching available models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);
  const activeTaskSessionIdRef = useRef<string | null>(null);

  const { startStream, stopStream, cleanupEventSource } = useEventSourceProcessor({
    setMessages,
    setSessions,
    setArtifacts,
    setIsTaskRunning,
    onTaskCompleted: (status) => {
      setIsTaskRunning(false);
      activeTaskSessionIdRef.current = null;
      setActiveTaskSessionId(null);
      console.log(`Task completed with status: ${status}. Triggering file list refresh.`);
      setFileListRefreshTrigger(prev => prev + 1);
    },
    onStepCompleted: (completedStepIndex: number) => {
      console.log(`Step ${completedStepIndex} completed. Triggering view refresh.`);
      setFileListRefreshTrigger(prev => prev + 1);
      if (completedStepIndex === 0) {
        const planFileName = "master_plan.md";
        console.log(`Planner step finished. Triggering auto-open for: ${planFileName}`);
        if (!isRightPanelVisible) {
          handleToggleRightPanel();
        }
        setFileToAutoOpen(planFileName);
      }
    },
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'monochrome-focus');
  }, []);

  // This useEffect for example data can be kept for testing or removed.

  const handleToggleSidebar = () => setIsSidebarExpanded(!isSidebarExpanded);
  const handleToggleRightPanel = () => setIsRightPanelVisible(prev => !prev);

  const handleNewTask = useCallback(() => {
    cleanupEventSource("handleNewTask (session change)");
    const newSessionId = `s${Date.now()}`;
    const newSession: Session = { id: newSessionId, name: "New Task...", active: true, status: 'pending' };
    setSessions(prev => [...prev.map(s => ({ ...s, active: false })), newSession]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setArtifacts([]);
  }, [cleanupEventSource]);

  const handleSelectSession = useCallback((sessionId: string) => {
    if (sessionId === currentSessionId) return;
    cleanupEventSource("handleSelectSession (session change)");
    setSessions(prev => prev.map(s => ({ ...s, active: s.id === sessionId })));
    setCurrentSessionId(sessionId);
  }, [currentSessionId, cleanupEventSource]);

  const handleSendMessage = useCallback((inputText: string) => {
    if (inputText.trim() === '' || !currentSessionId || !selectedModelId) {
      if (!selectedModelId) console.error("Cannot send message: No model is selected.");
      return;
    }
    if (isTaskRunning) {
      console.warn("Attempted to send message while a task is already running.");
      return;
    }
    if (messages.length === 0) {
      setIsRightPanelVisible(true);
    }
    const taskSessionId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activeTaskSessionIdRef.current = taskSessionId;

    setActiveTaskSessionId(taskSessionId);

    const userMessage: UserMessageData = { id: `msg-user-${Date.now()}`, sender: 'user', text: inputText, timestamp: new Date() };
    const agentMessageId = `msg-agent-${Date.now()}`;
    const initialAgentMessage: AgentMessageData = {
      id: agentMessageId, sender: 'agent', text: '',
      task: { title: "Processing your request...", statusIcon: 'loader', isCollapsible: true, isCollapsed: false, steps: [] },
      timestamp: new Date(),
    };

    setMessages(prevMessages => [...prevMessages, userMessage, initialAgentMessage]);
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, status: 'active', name: inputText.substring(0, 30) + (inputText.length > 30 ? "..." : "") } : s));

    startStream(inputText, agentMessageId, selectedModelId, taskSessionId);

  }, [currentSessionId, startStream, selectedModelId, isTaskRunning]);

  const handleStopRequest = useCallback(() => {
    // Read the LATEST value directly from the ref.
    if (activeTaskSessionIdRef.current) {
      stopStream(activeTaskSessionIdRef.current);
    } else {
      console.error("Stop requested, but no active task session ID found in ref.");
      setIsTaskRunning(false); // Fallback UI reset
    }
  }, [stopStream]);

  const handleRightPanelResize = useCallback((newWidth: number) => {
    const constrainedWidth = Math.max(MIN_RIGHT_PANEL_WIDTH, Math.min(newWidth, MAX_RIGHT_PANEL_WIDTH));
    setRightPanelWidth(constrainedWidth);
  }, []);

  useEffect(() => {
    return () => {
      cleanupEventSource("AiWorkspaceLayout unmount");
    };
  }, [cleanupEventSource]);

  const rightPanelMotionVariants = {
    hidden: {
      width: 0,
      opacity: 0,
      transition: { duration: 0.25, ease: "easeOut" }
    },
    visible: {
      width: `${rightPanelWidth}px`,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeIn" }
    }
  };
  console.log("[App.tsx] Rendering. fileToAutoOpen is:", fileToAutoOpen, " | refreshKey is:", fileListRefreshTrigger);
  return (
    <div className="app-container">
      <LeftSideBar
        isExpanded={isSidebarExpanded}
        onToggle={handleToggleSidebar}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewTask={handleNewTask}
        onSelectSession={handleSelectSession}
      />
      <MainChatWindow
        messages={messages}
        onSendMessage={handleSendMessage}
        onStopRequest={handleStopRequest}
        isTaskRunning={isTaskRunning}
        currentTaskName={sessions.find(s => s.id === currentSessionId)?.name || "AI Agent Workspace"}
        onToggleRightPanel={handleToggleRightPanel}
        isRightPanelVisible={isRightPanelVisible}
        effectiveRightPanelWidth={rightPanelWidth}
        availableModels={availableModels}
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        isLoadingModels={isLoadingModels}
      />
      <AnimatePresence>
        {isRightPanelVisible && (
          <motion.div
            key="right-panel-wrapper"
            className="right-panel-motion-wrapper-absolute"
            variants={rightPanelMotionVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ width: `${rightPanelWidth}px` }}
          >
            <RightPanel
              onClose={handleToggleRightPanel}
              artifacts={artifacts}
              onResize={handleRightPanelResize}
              initialWidth={rightPanelWidth}
              refreshKey={fileListRefreshTrigger}
              fileToAutoOpen={fileToAutoOpen}
              onAutoOpenDone={() => {
                console.log("[App.tsx] Resetting fileToAutoOpen to null.");
                setFileToAutoOpen(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AiWorkspaceLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
