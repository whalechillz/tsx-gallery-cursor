"use client";
import { X, Printer, Download } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  html: string;
  type: 'internal' | 'customer';
};

const TeeTimePreview: React.FC<Props> = ({ isOpen, onClose, html, type }) => {
  if (!isOpen) return null;

  // 인쇄 기능
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // 다운로드 기능
  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `티타임표_${type === 'internal' ? '내부용' : '고객용'}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            티타임표 미리보기 ({type === 'internal' ? '내부용' : '고객용'})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 미리보기 영역 - 상하 스크롤 개선 */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full w-full p-4">
            <iframe
              srcDoc={html}
              className="w-full h-full border border-gray-300 rounded-lg"
              style={{ 
                minHeight: 'calc(100vh - 180px)',
                height: 'calc(100vh - 180px)'
              }}
            />
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            인쇄
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            다운로드
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeeTimePreview;
