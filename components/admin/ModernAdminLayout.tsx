"use client"

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import ModernAdminSidebar from './ModernAdminSidebar';
import ModernAdminHeader from './ModernAdminHeader';

interface ModernAdminLayoutProps {
  children: React.ReactNode;
}

export default function ModernAdminLayout({ children }: ModernAdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 모바일에서는 기본적으로 닫힘
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  
  // 모바일 감지
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 경로에 따른 페이지 제목 매핑
  const getPageTitle = () => {
    if (pathname === '/admin') return '대시보드';
    if (pathname.includes('/room-assignment')) return '투어별 객실 배정';
    if (pathname.includes('/tee-time')) return '투어별 티오프시간 관리';
    if (pathname.startsWith('/admin/tour-products')) return '여행상품 관리';
    if (pathname.startsWith('/admin/marketing-content')) return '마케팅 콘텐츠';
    if (pathname.startsWith('/admin/tours')) return '투어 스케줄 관리';
    if (pathname.startsWith('/admin/participants')) return '참가자 목록';
    if (pathname.startsWith('/admin/payments')) return '결제 관리';
    if (pathname.startsWith('/admin/tour-documents')) return '투어별 문서 링크';
    // if (pathname.startsWith('/admin/documents')) return '문서 관리'; // 삭제됨
    if (pathname.startsWith('/admin/attractions')) return '스팟 관리';
    if (pathname.startsWith('/admin/memos')) return '참가자 메모';
    if (pathname.startsWith('/admin/work-memos')) return '업무 메모';
    if (pathname.startsWith('/admin/memo-templates')) return '메모 템플릿';
    if (pathname.startsWith('/admin/tour-staff')) return '투어 운영진';
    if (pathname.startsWith('/admin/staff')) return '투어 운영진'; // 기존 URL 호환성
    if (pathname.startsWith('/admin/users')) return '사용자 관리';
    if (pathname.startsWith('/admin/roles')) return '권한 관리';
    if (pathname.startsWith('/admin/password-reset')) return '비밀번호 초기화';
    if (pathname.startsWith('/admin/customers')) return '고객 데이터베이스';
    if (pathname.startsWith('/admin/messages')) return '메시지 발송';
    if (pathname.startsWith('/admin/campaigns')) return '마케팅 캠페인';
    if (pathname.startsWith('/admin/promotions')) return '홍보 페이지';
    if (pathname.startsWith('/admin/quotes')) return '견적 관리';
    if (pathname.startsWith('/admin/color-test')) return 'color-test';
    if (pathname.startsWith('/admin/design-templates')) return '디자인 템플릿';
    if (pathname.startsWith('/admin/font-styles')) return '폰트 스타일';
    if (pathname.startsWith('/admin/schedule-templates')) return '일정표 템플릿';
    if (pathname.startsWith('/admin/statistics')) return '통계';
    if (pathname.startsWith('/admin/settings')) return '설정';
    return '대시보드';
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* 모바일 오버레이 */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${
        isMobile 
          ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : ''
      }`}>
        <ModernAdminSidebar 
          isCollapsed={!isSidebarOpen && !isMobile} 
          onCollapse={(collapsed) => setIsSidebarOpen(!collapsed)}
        />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - 모바일에서 햄버거 메뉴 추가 */}
        <ModernAdminHeader 
          activeNav={getPageTitle()} 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          showMenuButton={isMobile}
        />
        
        {/* Main content area */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}