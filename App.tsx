import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, Search, Bell, Menu, Filter, MessageSquare, Briefcase, Settings, Plus, Upload, Download } from 'lucide-react';
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
  
  // State for patents (initialized with mock data)
  const [patents, setPatents] = useState<Patent[]>(MOCK_PATENTS);
  
  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedPatent, setSelectedPatent] = useState<Patent | null>(null);
  const [patentToDelete, setPatentToDelete] = useState<Patent | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  
  // Calculate alerts (3 months rule)
  useEffect(() => {
    const today = new Date();
    const count = patents.reduce((acc, patent) => {
        if (!patent.annuityDate) return acc;
        const due = new Date(patent.annuityDate);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Count if strictly within upcoming 3 months (90 days) and active
        if (diffDays > 0 && diffDays <= 90 && patent.status === PatentStatus.Active) {
            return acc + 1;
        }
        return acc;
    }, 0);
    setAlertCount(count);
  }, [patents]);

  // Filtering Logic
  const filteredPatents = patents.filter(patent => {
    const matchesSearch = 
        patent.name.includes(searchTerm) || 
        patent.appNumber.includes(searchTerm) ||
        patent.pubNumber.includes(searchTerm) ||
        patent.country.includes(searchTerm) ||
        patent.patentee.includes(searchTerm);
    
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

  // Modified to accept single Patent or array of Patents with Duplicate Check
  const handleImportPatent = (newData: Patent | Patent[]) => {
    const incomingPatents = Array.isArray(newData) ? newData : [newData];
    
    // 1. Get existing identifiers for duplicate checking
    // Use App Number as primary key, Name as secondary
    const existingAppNumbers = new Set(patents.map(p => p.appNumber ? p.appNumber.trim() : null).filter(Boolean));
    const existingNames = new Set(patents.map(p => p.name ? p.name.trim() : null).filter(Boolean));

    // 2. Filter out duplicates
    const uniquePatents = incomingPatents.filter(p => {
        // If App Number exists, check against existing App Numbers
        if (p.appNumber && p.appNumber.trim()) {
            if (existingAppNumbers.has(p.appNumber.trim())) return false;
            // Add to temp set to prevent duplicates within the same import batch
            existingAppNumbers.add(p.appNumber.trim()); 
            return true;
        }
        
        // If App Number is missing, check Name
        if (p.name && p.name.trim()) {
             if (existingNames.has(p.name.trim())) return false;
             existingNames.add(p.name.trim());
             return true;
        }

        // If both missing (rare), allow it but risk duplication
        return true;
    });

    const duplicateCount = incomingPatents.length - uniquePatents.length;

    // 3. Feedback and Update
    if (uniquePatents.length === 0) {
        alert(incomingPatents.length === 1 ? '此專利已存在 (申請號或名稱重複)。' : '所有匯入的資料均已存在，未新增任何項目。');
        return;
    }

    if (duplicateCount > 0) {
        alert(`系統已自動過濾 ${duplicateCount} 筆重複資料，並成功匯入 ${uniquePatents.length} 筆新資料。`);
    }

    setPatents(prev => [...uniquePatents, ...prev]);
    setViewMode('list'); // Switch to list view to see the new items
  };

  const handleUpdatePatent = (updatedPatent: Patent) => {
    setPatents(prev => prev.map(p => p.id === updatedPatent.id ? updatedPatent : p));
  };

  const handleExport = () => {
    // 1. Prepare data for export
    const exportData = filteredPatents.map(p => ({
      "專利名稱": p.name,
      "專利權人": p.patentee,
      "申請國家": p.country,
      "狀態": p.status,
      "類型": p.type,
      "申請號": p.appNumber,
      "公開/公告號": p.pubNumber,
      "申請日": p.appDate,
      "公開/公告日": p.pubDate,
      "專利期間": p.duration,
      "年費到期日": p.annuityDate,
      "年費有效年次": p.annuityYear,
      "通知信箱": p.notificationEmails || '',
      "發明人": p.inventor,
      "連結": p.link || ''
    }));

    // 2. Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 3. Set column widths (optional but looks better)
    const colWidths = [
      { wch: 30 }, // 名稱
      { wch: 20 }, // 專利權人
      { wch: 10 }, // 國家
      { wch: 10 }, // 狀態
      { wch: 10 }, // 類型
      { wch: 20 }, // 申請號
      { wch: 20 }, // 公開號
      { wch: 12 }, // 申請日
      { wch: 12 }, // 公開日
      { wch: 25 }, // 期間
      { wch: 12 }, // 年費日
      { wch: 12 }, // 年次
      { wch: 30 }, // 通知信箱
      { wch: 20 }, // 發明人
      { wch: 30 }, // 連結
    ];
    worksheet['!cols'] = colWidths;

    // 4. Create workbook and append sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "專利清單");

    // 5. Generate file name with date
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `PatentVault_Export_${dateStr}.xlsx`;

    // 6. Download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden lg:flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Briefcase size={20} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PatentVault</span>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          <button 
            onClick={() => setViewMode('dashboard')}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm transition-all ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800'}`}
          >
            <LayoutGrid size={18} className="mr-3" />
            總覽儀表板
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800'}`}
          >
            <List size={18} className="mr-3" />
            專利清單
          </button>
          <div className="my-4 border-t border-slate-800 mx-2"></div>
           <button className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm hover:bg-slate-800 text-slate-400">
            <Bell size={18} className="mr-3" />
            期限提醒
            {alertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{alertCount}</span>
            )}
          </button>
          <button className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm hover:bg-slate-800 text-slate-400">
             <Settings size={18} className="mr-3" />
             系統設定
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
             <div className="bg-slate-800/50 rounded-xl p-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => setIsChatOpen(true)}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full p-1.5 text-white">
                        <MessageSquare size={14} />
                    </div>
                    <span className="text-xs font-semibold text-white">AI 助手</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">有任何專利法規或期限問題? 隨時問我。</p>
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 lg:px-8">
            <div className="flex items-center lg:hidden gap-3">
                 <button className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                    <Menu size={20} />
                 </button>
                 <span className="font-bold text-gray-800">PatentVault</span>
            </div>

            <div className="flex-1 max-w-2xl mx-auto hidden md:block">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="搜尋專利名稱、申請號、國家..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg text-sm transition-all outline-none"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
                 <button 
                    onClick={handleExport}
                    className="hidden md:flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm"
                 >
                    <Download size={16} />
                    匯出 Excel
                 </button>
                 <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                 >
                    <Upload size={16} />
                    匯入專利
                 </button>
                 <div className="h-6 w-px bg-gray-200 hidden md:block mx-1"></div>
                 <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200">
                        JS
                    </span>
                    <div className="hidden md:block text-xs text-right">
                        <div className="font-medium text-gray-700">John Smith</div>
                        <div className="text-gray-400">專利工程師</div>
                    </div>
                 </div>
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Mobile Search & Filter */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <h1 className="text-2xl font-bold text-gray-800">
                        {viewMode === 'dashboard' ? '案件儀表板' : '專利清單管理'}
                    </h1>
                    
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {/* Mobile Action Buttons */}
                        <div className="md:hidden flex gap-2 w-full">
                            <button 
                                onClick={handleExport}
                                className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <Download size={16} />
                                匯出
                            </button>
                            <button 
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Upload size={16} />
                                匯入
                            </button>
                        </div>

                        {viewMode === 'list' && (
                            <>
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as PatentStatus | 'ALL')}
                                    className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none flex-1 md:flex-none"
                                >
                                    <option value="ALL">所有狀態</option>
                                    <option value={PatentStatus.Active}>存續中</option>
                                    <option value={PatentStatus.Expired}>已屆期</option>
                                </select>
                                <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                                    <Filter size={16} />
                                    <span className="hidden md:inline">進階篩選</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Dashboard Stats */}
                {viewMode === 'dashboard' && (
                     <>
                        <PatentStats patents={filteredPatents} />
                        <div className="mt-8">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">專利清單</h2>
                            <PatentTable 
                                patents={filteredPatents} 
                                onEdit={handleEditClick}
                                onPreviewEmail={handlePreviewEmail}
                                onDelete={handleDeleteClick}
                            />
                        </div>
                     </>
                )}

                {/* Full List View */}
                {viewMode === 'list' && (
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

      {/* Floating AI Chat */}
      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        contextPatents={filteredPatents}
        initialMessage={chatInitialMsg}
      />

      {/* Import Modal */}
      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportPatent}
      />

      {/* Edit Modal */}
      <EditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdatePatent}
        patent={selectedPatent}
      />

      {/* Email Preview Modal */}
      <EmailPreviewModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        patent={selectedPatent}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setPatentToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        patentName={patentToDelete?.name || ''}
      />
      
      {/* Floating Trigger Button (Mobile only or if closed) */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-40 flex items-center justify-center group"
        >
          <MessageSquare size={24} />
          <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            AI 助手
          </span>
        </button>
      )}

    </div>
  );
};

export default App;