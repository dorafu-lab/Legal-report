import React from 'react';
import { X, Mail, Send, Copy } from 'lucide-react';
import { Patent } from '../types';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patent: Patent | null;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ isOpen, onClose, patent }) => {
  if (!isOpen || !patent) return null;

  const today = new Date().toISOString().split('T')[0];
  
  // Subject template: 【專利繳費提醒】XXX專利
  const subject = `【專利繳費提醒】${patent.name}專利`;
  
  // Body template provided by user
  const body = `
以下專利請於${patent.annuityDate}(即年費到期日)前繳納年費，避免專利失效。

專利名稱：${patent.name}
申請國家：${patent.country}
專利權人：${patent.patentee}
申請號/公開號：${patent.appNumber} / ${patent.pubNumber}
專利期間：${patent.duration}
年費到期日/年次：${patent.annuityDate}，第${patent.annuityYear}年
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    alert('信件內容已複製到剪貼簿');
  };

  const handleSendSimulation = () => {
    alert(`模擬發送成功！\n已將信件寄送至：${patent.notificationEmails || '未設定信箱'}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">通知信件預覽</h3>
              <p className="text-xs text-gray-500">預覽系統自動發送的提醒內容</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white space-y-4">
            
            {/* Metadata Fields */}
            <div className="space-y-3 text-sm bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="flex gap-3">
                    <span className="w-16 text-gray-500 font-medium text-right shrink-0">寄件者：</span>
                    <span className="text-gray-800">PatentVault System &lt;no-reply@patentvault.com&gt;</span>
                </div>
                <div className="flex gap-3">
                    <span className="w-16 text-gray-500 font-medium text-right shrink-0">收件者：</span>
                    <span className={`${patent.notificationEmails ? 'text-blue-600' : 'text-gray-400 italic'} font-medium`}>
                        {patent.notificationEmails || '尚未設定 (請至編輯頁面新增)'}
                    </span>
                </div>
                <div className="flex gap-3">
                    <span className="w-16 text-gray-500 font-medium text-right shrink-0">日期：</span>
                    <span className="text-gray-800">{today}</span>
                </div>
                <div className="flex gap-3 items-start">
                    <span className="w-16 text-gray-500 font-medium text-right shrink-0 pt-0.5">主旨：</span>
                    <span className="font-bold text-gray-900">{subject}</span>
                </div>
            </div>

            {/* Email Content Box */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <pre className="font-mono text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {body}
                </pre>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Copy size={16} />
            複製內容
          </button>
          <button 
            onClick={handleSendSimulation}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Send size={16} />
            模擬發送
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;