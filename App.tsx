import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, Search, Bell, Menu, Filter, MessageSquare, Briefcase, Settings, Plus, Upload, Download, Activity, ChevronRight } from 'lucide-react';
import { MOCK_PATENTS } from './constants';
import PatentTable from './components/PatentTable';
import PatentStats from './components/PatentStats';
import AIChat from './components/AIChat';
import ImportModal from './components/ImportModal';
import EditModal from './components/EditModal';
import EmailPreviewModal from './components/EmailPreviewModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { Patent, PatentStatus } from './types';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatentStatus | 'ALL'>('ALL');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialMsg, setChatInitialMsg] = useState<string | undefined>(undefined);
  
  const [patents, setPatents] = useState<Patent[]>(MOCK_PATENTS || []);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedPatent, setSelectedPatent] = useState<Patent | null>(null);
  const [patentToDelete, setPatentToDelete] = useState<Patent | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!patents) return;
    const today = new Date();
    const count = patents.reduce((acc, patent) => {
        if (!patent.annuityDate) return acc;
        const due = new Date(patent.annuityDate);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays <= 90 && patent.status === PatentStatus.Active) {
            return acc + 1;
        }
        return acc;
    }, 0);
    setAlertCount(count);
  }, [patents]);

  const filteredPatents = (patents || []).filter(patent => {
    const matchesSearch = 
        patent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        patent.appNumber.includes(searchTerm) ||
        patent.country.includes(searchTerm) ||
        patent.patentee.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || patent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEditClick = (patent: Patent) => {
    setSelectedPatent(patent);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (patent: Patent) => {
    setPatentToDelete(patent);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (patentToDelete) {
        setPatents(prev => prev.filter(p => String(p.id) !== String(patentToDelete.id)));
        setPatentToDelete(null);
        setIsDeleteModalOpen(false);
    }
  };

  const handlePreviewEmail = (patent: Patent) => {
    setSelectedPatent(patent);
    setIsEmailModalOpen(true);
  };

  const handleImportPatent = (newData: Patent | Patent[]) => {
    const incomingPatents = Array.isArray(newData) ? newData : [newData];
    setPatents(prev => [...incomingPatents, ...prev]);
    setViewMode('list');
  };

  const handleUpdatePatent = (updatedPatent: Patent) => {
    setPatents(prev => prev.map(p => p.id === updatedPatent.id ? updatedPatent : p));
  };

  const handleExport = () => {
    const exportData = filteredPatents.map(p => ({
      "專利名稱": p.name,
      "專利權人": p.patentee,
      "申請國家": p.country,
      "狀態": p.status,
      "類型": p.type,
      "申請號": p.appNumber,
      "公告號": p.pubNumber,
      "年費到期日": p.annuityDate,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "專利清單");
    XLSX.writeFile(workbook, `Patent_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden lg:flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-500/20">
            <Briefcase size={20} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PatentVault</span>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          <button 
            onClick={() => setViewMode('dashboard')}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm transition-all ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800'}`}
          >
            <LayoutGrid size={18} className="mr-3" />
            總覽儀表板
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800'}`}
          >
            <List size={18} className="mr-3" />
            專利清單
          </button>
          <div className="my-4 border-t border-slate-800 mx-2"></div>
          <button className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm hover:bg-slate-800 text-slate-400 group">
            <Bell size={18} className="mr-3 group-hover:text-blue-400" />
            期限提醒
            {alertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{alertCount}</span>
            )}
          </button>
        </nav>

        {/* System Status Widget */}
        <div className="p-4 px-6 mb-4">
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-3 text-slate-400">
                    <Activity size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">系統摘要</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">專利總數</span>
                        <span className="text-white font-mono">{patents?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">存續率</span>
                        <span className="text-green-400 font-mono">
                            {patents?.length > 0 ? Math.round((patents.filter(p => p.status === PatentStatus.Active).length / patents.length) * 100) : 0}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-slate-800">
             <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 cursor-pointer hover:bg-blue-600/20 transition-all group" onClick={() => setIsChatOpen(true)}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg p-1.5 text-white">
                        <MessageSquare size={14} />
                    </div>
                    <span className="text-xs font-semibold text-white group-hover:text-blue-400">AI 智慧助手</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">有任何法律問題？即刻詢問專利 AI。</p>
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 lg:px-8 shadow-sm z-10">
            <div className="flex items-center lg:hidden gap-3">
                 <button className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                    <Menu size={20} />
                 </button>
                 <span className="font-bold text-gray-800">PatentVault</span>
            </div>

            <div className="flex-1 max-w-xl mx-auto hidden md:block">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="搜尋專利名稱、號碼、國家或權人..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
                 <button 
                    onClick={handleExport}
                    className="hidden md:flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all active:scale-95"
                 >
                    <Download size={16} />
                    匯出清單
                 </button>
                 <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                 >
                    <Upload size={16} />
                    新增專利
                 </button>
                 <div className="h-6 w-px bg-gray-200 hidden md:block mx-1"></div>
                 <div className="flex items-center gap-3 pl-2">
                    <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        JD
                    </span>
                 </div>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-10 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {viewMode === 'dashboard' ? '智慧管理儀表板' : '專利組合清單'}
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {viewMode === 'dashboard' ? '即時監控專利分佈、法律狀態與屆期風險' : '管理、編輯並追蹤您的所有智慧財產權案件'}
                        </p>
                    </div>
                    {viewMode === 'list' && (
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                            <button 
                                onClick={() => setStatusFilter('ALL')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'ALL' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                全部
                            </button>
                            <button 
                                onClick={() => setStatusFilter(PatentStatus.Active)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === PatentStatus.Active ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                存續中
                            </button>
                            <button 
                                onClick={() => setStatusFilter(PatentStatus.Expired)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === PatentStatus.Expired ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                已屆期
                            </button>
                        </div>
                    )}
                </div>

                {viewMode === 'dashboard' ? (
                    <PatentStats patents={patents} />
                ) : (
                    <PatentTable 
                        patents={filteredPatents} 
                        onEdit={handleEditClick}
                        onPreviewEmail={handlePreviewEmail}
                        onDelete={handleDeleteClick}
                    />
                )}
            </div>
        </div>
      </main>

      {/* Modals & AI Chat */}
      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        contextPatents={patents}
        initialMessage={chatInitialMsg}
      />
      
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportPatent}
      />

      <EditModal 
        isOpen={isEditModalOpen}
        onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPatent(null);
        }}
        onSave={handleUpdatePatent}
        patent={selectedPatent}
      />

      <EmailPreviewModal 
        isOpen={isEmailModalOpen}
        onClose={() => {
            setIsEmailModalOpen(false);
            setSelectedPatent(null);
        }}
        patent={selectedPatent}
      />

      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setPatentToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        patentName={patentToDelete?.name || ''}
      />
    </div>
  );
};

export default App;