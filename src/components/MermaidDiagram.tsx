import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Move } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
  title?: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id = 'mermaid-chart', title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Interactive Zoom & Pan State
  const [scale, setScale] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'JetBrains Mono, monospace',
      themeVariables: {
        darkMode: true,
        background: '#161b22',
        primaryColor: '#00d4ff',
        secondaryColor: '#bd93f9',
        tertiaryColor: '#00ff41',
        lineColor: '#00d4ff',
        textColor: '#c9d1d9',
        mainBkg: '#21262d',
        nodeBorder: '#30363d',
      },
    });

    let isMounted = true;

    const renderChart = async () => {
      if (!containerRef.current) return;
      try {
        containerRef.current.innerHTML = '';
        const uniqueId = `${id}-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart);
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Mermaid rendering error:', err);
          setError(err.message || 'Failed to render Mermaid diagram');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  // Zoom Control Handlers
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.4));
  const handleReset = () => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Drag & Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.15 : -0.15;
    setScale((prev) => Math.min(Math.max(prev + zoomFactor, 0.4), 3.5));
  };

  if (error) {
    return (
      <div className="p-4 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono">
        <p className="font-bold mb-1">Diagram Rendering Note:</p>
        <p>{error}</p>
        <pre className="mt-2 p-2 bg-slate-900 rounded overflow-x-auto text-[11px] text-slate-300">
          {chart}
        </pre>
      </div>
    );
  }

  const DiagramContent = () => (
    <div className="relative w-full overflow-hidden bg-[#161b22] border border-[#30363d] rounded-lg shadow-inner group">
      {/* Interactive Control Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-[#0F172A]/90 backdrop-blur-md p-1.5 rounded-lg border border-[#334155] shadow-lg font-mono text-xs">
        <button
          onClick={handleZoomIn}
          className="p-1.5 text-[#94A3B8] hover:text-[#38BDF8] hover:bg-[#1E293B] rounded transition-all cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-[#94A3B8] hover:text-[#38BDF8] hover:bg-[#1E293B] rounded transition-all cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="px-2 py-1 text-[11px] text-[#94A3B8] hover:text-white hover:bg-[#1E293B] rounded transition-all cursor-pointer flex items-center gap-1"
          title="Reset View (100%)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{Math.round(scale * 100)}%</span>
        </button>
        <div className="w-px h-4 bg-[#334155] mx-0.5" />
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 text-[#94A3B8] hover:text-[#4ADE80] hover:bg-[#1E293B] rounded transition-all cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Interactive Canvas'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Pan & Drag Tip Banner */}
      <div className="absolute bottom-3 left-3 z-20 hidden group-hover:flex items-center gap-2 bg-[#0F172A]/80 backdrop-blur-sm px-2.5 py-1 rounded border border-[#334155] text-[10px] text-[#94A3B8] font-mono pointer-events-none">
        <Move className="w-3 h-3 text-[#38BDF8]" />
        <span>Click & drag to pan • Scroll to zoom</span>
      </div>

      {/* Diagram Canvas Container */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full min-h-[420px] flex items-center justify-center p-6 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          ref={containerRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="w-full flex justify-center py-2"
        />
      </div>
    </div>
  );

  return (
    <>
      <DiagramContent />

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/95 backdrop-blur-md flex flex-col p-6 font-mono">
          <div className="flex items-center justify-between pb-4 border-b border-[#334155] mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-[#38BDF8]" />
                <span>Interactive Architecture Topology Canvas</span>
              </h3>
              <p className="text-xs text-[#94A3B8]">{title || 'Full High-Resolution Diagram'}</p>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Close Canvas</span>
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden bg-[#161b22] border border-[#30363d] rounded-lg">
            <DiagramContent />
          </div>
        </div>
      )}
    </>
  );
};
