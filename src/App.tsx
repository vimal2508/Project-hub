import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Download, 
  RefreshCw, 
  MessageSquare, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  Send,
  User,
  Bot,
  Sparkles,
  FileText,
  FileCode,
  Table,
  Presentation,
  FileDown,
  CheckCircle2,
  X
} from 'lucide-react';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import * as docx from 'docx';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import { TOPICS, ProjectTopic } from './topics';
import { generateSolution, chatWithAssistant, generateTopicImage } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EmbeddedImage = ({ prompt, topicTitle }: { prompt: string, topicTitle: string }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const result = await generateTopicImage(topicTitle, prompt);
        setImage(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchImage();
  }, [prompt, topicTitle]);

  if (loading) {
    return (
      <div className="w-full h-48 bg-emerald-50 rounded-xl flex items-center justify-center my-6 border border-emerald-100 animate-pulse">
        <Loader2 className="animate-spin text-emerald-600/30" size={24} />
      </div>
    );
  }

  if (!image) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-8 rounded-2xl overflow-hidden border border-[#141414]/5 shadow-md"
    >
      <img src={image} alt="Generated illustration" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
    </motion.div>
  );
};

export default function App() {
  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [topicImage, setTopicImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [homeInstructions, setHomeInstructions] = useState('');
  const [recreateInstructions, setRecreateInstructions] = useState('');
  const [targetPages, setTargetPages] = useState<number>(2);
  const [generationDepth, setGenerationDepth] = useState<'minimal' | 'detailed'>('detailed');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSelectTopic = (topic: ProjectTopic) => {
    setSelectedTopic(topic);
    setSolution(null);
    setTopicImage(null);
    setRecreateInstructions('');
  };

  const handleGenerate = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    try {
      const [solutionResult, imageResult] = await Promise.all([
        generateSolution(selectedTopic.title, selectedTopic.description, homeInstructions, targetPages, generationDepth), 
        generateTopicImage(selectedTopic.title, `${selectedTopic.description}. ${homeInstructions}`)
      ]);
      setSolution(solutionResult || "Failed to generate solution.");
      setTopicImage(imageResult);
    } catch (error) {
      setSolution("An error occurred while generating the solution. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    try {
      const [solutionResult, imageResult] = await Promise.all([
        generateSolution(selectedTopic.title, selectedTopic.description, recreateInstructions, targetPages, generationDepth),
        generateTopicImage(selectedTopic.title, `${selectedTopic.description}. ${recreateInstructions}`)
      ]);
      setSolution(solutionResult || "Failed to generate solution.");
      setTopicImage(imageResult);
    } catch (error) {
      setSolution("An error occurred while regenerating the solution.");
    } finally {
      setLoading(false);
    }
  };

  const getBase64Image = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDownloadPDF = async () => {
    if (!solution || !selectedTopic) return;
    setDownloading("PDF");
    setShowDownloadMenu(false);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxLineWidth = pageWidth - margin * 2;
      
      // Add Header Background
      doc.setFillColor(245, 245, 240); // Warm off-white
      doc.rect(0, 0, pageWidth, 100, 'F');
      
      // Add Page Border
      const addBorder = () => {
        doc.setDrawColor(20, 120, 80);
        doc.setLineWidth(0.5);
        doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'D');
      };
      addBorder();

      // Helper for footer
      const addFooter = (pageNum: number, total: number) => {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${pageNum} of ${total}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
      };

      // Add Header Image
      if (topicImage) {
        doc.addImage(topicImage, 'PNG', margin, margin + 15, maxLineWidth, 55);
      } else {
        try {
          const imageUrl = `https://picsum.photos/seed/${selectedTopic.title.replace(/\s+/g, '')}/800/400`;
          const base64Img = await getBase64Image(imageUrl);
          doc.addImage(base64Img, 'JPEG', margin, margin + 15, maxLineWidth, 55);
        } catch (e) {
          console.error("Failed to add image to PDF", e);
        }
      }

      const cleanText = solution
        .replace(/:::image.*?:::/g, '') // Remove image placeholders
        .trim();

      // Split text into sections based on markdown headers
      const sections = cleanText.split(/(?=^#+ )/m);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(20, 120, 80); // Emerald green
      doc.text(selectedTopic.title, margin, margin + 5);
      
      let cursorY = margin + 80; // Start after image
      let lineHeight = 7;
      let pageCount = 1;

      // Calculate total lines to see if we need to compress
      let totalLinesNeeded = 0;
      sections.forEach(section => {
        section.split('\n').forEach(line => {
          if (!line.trim()) return;
          const splitLines = doc.splitTextToSize(line.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\*/g, ''), maxLineWidth);
          totalLinesNeeded += splitLines.length;
        });
      });

      // Simple compression: if too many lines, reduce line height slightly
      const estimatedLinesPerPage = 34;
      const firstPageLines = 24;
      const totalAvailableLines = firstPageLines + (targetPages - 1) * estimatedLinesPerPage;
      
      if (totalLinesNeeded > totalAvailableLines) {
        lineHeight = Math.max(5.5, lineHeight * (totalAvailableLines / totalLinesNeeded));
      }

      sections.forEach((section) => {
        const lines = section.split('\n');
        lines.forEach((line) => {
          const isHeader = line.startsWith('#');
          const cleanLine = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '');
          
          if (!cleanLine.trim()) {
            cursorY += lineHeight / 2;
            return;
          }

          if (isHeader) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(20, 120, 80);
            cursorY += lineHeight * 0.8;
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
          }

          const splitLines = doc.splitTextToSize(cleanLine, maxLineWidth);
          
          splitLines.forEach((textLine: string) => {
            if (cursorY > pageHeight - margin - 15) {
              if (pageCount >= targetPages) return; // Strict limit
              addFooter(pageCount, targetPages); 
              doc.addPage();
              addBorder();
              cursorY = margin + 10;
              pageCount++;
            }
            if (pageCount <= targetPages) {
              doc.text(textLine, margin, cursorY);
              cursorY += lineHeight;
            }
          });

          if (isHeader) cursorY += lineHeight * 0.3;
        });
      });

      // Final pass to add accurate footers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }
      
      doc.save(`${selectedTopic.title.replace(/\s+/g, '_')}_Solution.pdf`);
      setDownloadSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setDownloading(null);
        setDownloadSuccess(false);
      }, 2000);
    }
  };

  const handleDownloadWord = async () => {
    if (!solution || !selectedTopic) return;
    setDownloading("Word");
    setShowDownloadMenu(false);

    try {
      const docObj = new docx.Document({
        sections: [{
          properties: {},
          children: [
            new docx.Paragraph({
              children: [new docx.TextRun({ text: selectedTopic.title, bold: true, size: 32 })],
              spacing: { after: 400 },
            }),
            ...solution.split('\n').map(line => {
              const cleanLine = line.replace(/:::image.*?:::/g, '').replace(/[#*]/g, '').trim();
              if (!cleanLine) return null;
              return new docx.Paragraph({
                children: [new docx.TextRun({ text: cleanLine, size: 24 })],
                spacing: { after: 200 },
              });
            }).filter(p => p !== null) as docx.Paragraph[],
          ],
        }],
      });

      const blob = await docx.Packer.toBlob(docObj);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTopic.title.replace(/\s+/g, '_')}.docx`;
      a.click();
      setDownloadSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setDownloading(null);
        setDownloadSuccess(false);
      }, 2000);
    }
  };

  const handleDownloadExcel = () => {
    if (!solution || !selectedTopic) return;
    setDownloading("Excel");
    setShowDownloadMenu(false);

    try {
      const data = [
        ["Topic", selectedTopic.title],
        ["Description", selectedTopic.description],
        [],
        ["Solution Content"],
        ...solution.split('\n').map(line => {
          const cleanLine = line.replace(/:::image.*?:::/g, '').replace(/[#*]/g, '').trim();
          return [cleanLine];
        }).filter(row => row[0].length > 0)
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Solution");
      XLSX.writeFile(wb, `${selectedTopic.title.replace(/\s+/g, '_')}.xlsx`);
      setDownloadSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setDownloading(null);
        setDownloadSuccess(false);
      }, 2000);
    }
  };

  const handleDownloadPPT = async () => {
    if (!solution || !selectedTopic) return;
    setDownloading("PPT");
    setShowDownloadMenu(false);

    try {
      const pres = new pptxgen();
      
      // Title Slide
      const slide1 = pres.addSlide();
      slide1.background = { color: "141414" };
      slide1.addText(selectedTopic.title, { x: 1, y: 2, w: 8, h: 2, fontSize: 44, color: "FFFFFF", bold: true, align: "center" });
      slide1.addText("Project Solution Guide", { x: 1, y: 4, w: 8, h: 1, fontSize: 24, color: "10B981", align: "center" });

      // Content Slides
      const sections = solution.split('\n\n').filter(s => s.trim().length > 20);
      
      for (const section of sections.slice(0, 5)) {
        const slide = pres.addSlide();
        const lines = section.split('\n');
        const title = lines[0].replace(/[#*]/g, '').replace(/:::image.*?:::/g, '').trim();
        const body = lines.slice(1).join('\n').replace(/[#*]/g, '').replace(/:::image.*?:::/g, '').trim();
        
        slide.addText(title, { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 28, color: "141414", bold: true });
        slide.addText(body, { x: 0.5, y: 1.5, w: 5, h: 3.5, fontSize: 14, color: "4B5563" });
        
        // Add Image to slide
        if (topicImage) {
          slide.addImage({ data: topicImage, x: 6, y: 1.5, w: 3.5, h: 3 });
        } else {
          try {
            const imageUrl = `https://picsum.photos/seed/${title.replace(/\s+/g, '')}/600/400`;
            slide.addImage({ path: imageUrl, x: 6, y: 1.5, w: 3.5, h: 3 });
          } catch (e) {
            console.error(e);
          }
        }
      }

      await pres.writeFile({ fileName: `${selectedTopic.title.replace(/\s+/g, '_')}.pptx` });
      setDownloadSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setDownloading(null);
        setDownloadSuccess(false);
      }, 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const history = chatMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      const response = await chatWithAssistant(history as any, userMsg);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response || "I'm sorry, I couldn't process that." }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to AI assistant." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-emerald-200">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#141414]/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedTopic(null); setSolution(null); }}>
          <div className="bg-emerald-600 p-2 rounded-lg text-white">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ProjectHub</h1>
        </div>
        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-2 bg-[#141414] text-white px-4 py-2 rounded-full hover:bg-[#141414]/90 transition-all active:scale-95"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-medium">AI Assistant</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <AnimatePresence mode="wait">
          {!selectedTopic ? (
            <motion.div 
              key="topic-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-serif italic mb-4">Final Project Solutions</h2>
                <p className="text-[#141414]/60 text-lg mb-8">
                  Select a topic below to generate a concise, high-impact single-page solution guide for your final project.
                </p>

                {/* Home Page Text Container */}
                <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm mb-10 space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">Global Project Preferences</label>
                    <textarea 
                      value={homeInstructions}
                      onChange={(e) => setHomeInstructions(e.target.value)}
                      placeholder="Add any global instructions for your solutions (e.g., 'Focus on sustainable practices' or 'Use a professional corporate tone')..."
                      className="w-full bg-[#F5F5F0] border border-emerald-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-emerald-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Target PDF Length</label>
                        <p className="text-[10px] text-[#141414]/40 italic">AI will fill these pages</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={targetPages}
                          onChange={(e) => setTargetPages(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-[#F5F5F0] border border-emerald-100 rounded-xl px-2 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                        />
                        <span className="text-xs font-bold text-emerald-700">Pages</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Content Depth</label>
                        <p className="text-[10px] text-[#141414]/40 italic">Level of detail in the solution</p>
                      </div>
                      <div className="flex bg-[#F5F5F0] p-1 rounded-xl border border-emerald-100">
                        <button
                          onClick={() => setGenerationDepth('minimal')}
                          className={clsx(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                            generationDepth === 'minimal' ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          Minimal
                        </button>
                        <button
                          onClick={() => setGenerationDepth('detailed')}
                          className={clsx(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                            generationDepth === 'detailed' ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          Detailed
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-[#141414]/40 mt-2 italic">These settings will be applied to any topic you select below.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TOPICS.map((topic) => (
                  <motion.div
                    key={topic.id}
                    whileHover={{ y: -4 }}
                    onClick={() => handleSelectTopic(topic)}
                    className="group bg-white p-6 rounded-2xl border border-[#141414]/5 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs font-mono text-emerald-600 mb-2">TOPIC #{topic.id.toString().padStart(2, '0')}</div>
                      <h3 className="text-xl font-bold mb-3 group-hover:text-emerald-700 transition-colors">{topic.title}</h3>
                      <p className="text-sm text-[#141414]/60 line-clamp-3">{topic.description}</p>
                    </div>
                    <div className="mt-6 flex items-center text-emerald-600 font-semibold text-sm">
                      Generate Solution <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="solution-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <button 
                onClick={() => { setSelectedTopic(null); setSolution(null); }}
                className="flex items-center gap-2 text-[#141414]/60 hover:text-[#141414] transition-colors mb-4"
              >
                <ArrowLeft size={18} />
                <span>Back to Topics</span>
              </button>

              <div className="bg-white rounded-3xl border border-[#141414]/10 overflow-hidden shadow-xl">
                <div className="bg-[#141414] text-white p-8 md:p-12">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="max-w-2xl">
                      <div className="text-emerald-400 font-mono text-sm mb-2">TOPIC #{selectedTopic.id.toString().padStart(2, '0')}</div>
                      <h2 className="text-3xl md:text-4xl font-bold mb-4">{selectedTopic.title}</h2>
                      <p className="text-white/60">{selectedTopic.description}</p>
                    </div>
                    <div className="flex gap-3 relative">
                      <div className="relative">
                        <button 
                          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                          disabled={loading || !solution}
                          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                          <Download size={18} />
                          <span>Download</span>
                        </button>
                        
                        <AnimatePresence>
                          {showDownloadMenu && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-[#141414]/10 overflow-hidden z-50 py-2"
                            >
                              <button onClick={handleDownloadPDF} className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-3 text-sm text-[#141414]">
                                <FileText size={18} className="text-red-500" /> PDF Document
                              </button>
                              <button onClick={handleDownloadWord} className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-3 text-sm text-[#141414]">
                                <FileCode size={18} className="text-blue-500" /> Word Document
                              </button>
                              <button onClick={handleDownloadExcel} className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-3 text-sm text-[#141414]">
                                <Table size={18} className="text-emerald-600" /> Excel Sheet
                              </button>
                              <button onClick={handleDownloadPPT} className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-3 text-sm text-[#141414]">
                                <Presentation size={18} className="text-orange-500" /> PPT Presentation
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recreate Container */}
                <div className="px-8 md:px-12 py-6 bg-emerald-50/50 border-b border-[#141414]/5">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">Recreate with custom instructions</label>
                      <textarea 
                        value={recreateInstructions}
                        onChange={(e) => setRecreateInstructions(e.target.value)}
                        placeholder="e.g., 'Make it more focused on digital tools' or 'Add a section about time management'..."
                        className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none min-h-[80px] resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700">Target Length</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={targetPages}
                          onChange={(e) => setTargetPages(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-white border border-emerald-200 rounded-xl px-2 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-center h-[50px]"
                        />
                        <span className="text-xs font-bold text-emerald-700">Pages</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700">Depth</label>
                      <div className="flex bg-white p-1 rounded-xl border border-emerald-200 h-[50px]">
                        <button
                          onClick={() => setGenerationDepth('minimal')}
                          className={clsx(
                            "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                            generationDepth === 'minimal' ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          Min
                        </button>
                        <button
                          onClick={() => setGenerationDepth('detailed')}
                          className={clsx(
                            "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                            generationDepth === 'detailed' ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          Det
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={handleRegenerate}
                      disabled={loading}
                      className="flex items-center gap-2 bg-[#141414] hover:bg-[#141414]/90 text-white px-6 py-3 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap h-[50px] mb-[2px]"
                    >
                      <RefreshCw size={18} className={cn(loading && "animate-spin")} />
                      <span>Recreate Solution</span>
                    </button>
                  </div>
                </div>

                <div className="p-8 md:p-12 min-h-[600px] relative">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                      <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
                      <p className="text-lg font-medium text-[#141414]/60">Crafting your solution in seconds...</p>
                      <p className="text-sm text-[#141414]/40 mt-2 italic">Our AI is preparing a focused {targetPages}-page guide for you.</p>
                    </div>
                  ) : (
                    <div className="max-w-none">
                      {solution ? (
                        <div className="space-y-8">
                          {/* Featured Image */}
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden border border-[#141414]/5 shadow-inner bg-emerald-50"
                          >
                            <img 
                              src={topicImage || `https://picsum.photos/seed/${selectedTopic.title.replace(/\s+/g, '')}/1200/600`}
                              alt={selectedTopic.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                              referrerPolicy="no-referrer"
                            />
                          </motion.div>

                          <div className="prose prose-emerald max-w-none prose-headings:font-serif prose-headings:italic prose-headings:text-[#141414] prose-p:text-[#141414]/80 prose-li:text-[#141414]/80 markdown-body">
                            <Markdown
                              components={{
                                p: ({ children }) => {
                                  if (typeof children === 'string' && children.startsWith(':::image') && children.endsWith(':::')) {
                                    const prompt = children.replace(':::image', '').replace(':::', '').trim();
                                    return <EmbeddedImage prompt={prompt} topicTitle={selectedTopic.title} />;
                                  }
                                  return <p>{children}</p>;
                                }
                              }}
                            >
                              {solution}
                            </Markdown>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-[#141414]/40">
                          <FileText size={64} className="mb-4 opacity-20" />
                          <p className="mb-8 text-lg">Ready to generate your project solution?</p>
                          <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/20 font-bold text-lg disabled:opacity-50"
                          >
                            <Sparkles size={24} />
                            <span>Generate Solution Now</span>
                          </button>
                          <p className="mt-4 text-xs italic">This will generate a {targetPages}-page guide based on your preferences.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Download Popup */}
      <AnimatePresence>
        {downloading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-[100] p-6"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative z-10 text-center">
              {!downloadSuccess ? (
                <>
                  <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="animate-spin text-emerald-600" size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Preparing your {downloading}</h3>
                  <p className="text-[#141414]/60 text-sm">We are arranging your content and adding relevant images. Please wait...</p>
                </>
              ) : (
                <>
                  <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-emerald-600" size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Download Started!</h3>
                  <p className="text-[#141414]/60 text-sm">Your {downloading} has been generated and is downloading now.</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant Sidebar */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-[#141414]/10 flex justify-between items-center bg-[#141414] text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 rounded-lg">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">Project Assistant</h3>
                    <p className="text-xs text-emerald-400">Online & Ready to help</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-white/60 hover:text-white transition-colors">
                  <ArrowLeft size={24} className="rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-10 space-y-4">
                    <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <Bot className="text-emerald-600" size={32} />
                    </div>
                    <p className="text-[#141414]/60 text-sm max-w-[200px] mx-auto">
                      Ask me anything about your project topics or for tips on your presentation!
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === 'user' ? "bg-emerald-100 text-emerald-700" : "bg-[#141414] text-white"
                    )}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-2xl text-sm",
                      msg.role === 'user' ? "bg-emerald-600 text-white rounded-tr-none" : "bg-[#F5F5F0] text-[#141414] rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#141414] text-white flex items-center justify-center shrink-0">
                      <Bot size={16} />
                    </div>
                    <div className="bg-[#F5F5F0] p-3 rounded-2xl rounded-tl-none">
                      <Loader2 size={16} className="animate-spin text-emerald-600" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 border-t border-[#141414]/10 bg-white">
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="w-full bg-[#F5F5F0] border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-[#141414]/5 py-12 px-6 text-center space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-[#141414] text-white px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase">
            Infinite Solutions
          </div>
          <p className="text-[#141414]/40 text-sm font-medium">© 2026 Student Project Solution Hub</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-widest text-[#141414]/30 font-bold">Contact Us</span>
          <a 
            href="mailto:infintesolutions07@gmail.com" 
            className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors border-b border-emerald-600/20 hover:border-emerald-600"
          >
            infintesolutions07@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}
