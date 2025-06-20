"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FileText, MapPin, Users, Calendar, Lock, Printer } from 'lucide-react';
import TourSchedulePreview from '@/components/TourSchedulePreview';
import RoomAssignmentManager from '@/components/RoomAssignmentManager';

// 문서 타입 정의
interface Document {
  id: string;
  tour_id: string;
  type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Tour {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  golf_course?: string;
}

// 문서 타입별 설정
const documentTypes = {
  'tour-schedule': { name: '투어 일정표', icon: FileText },
  'boarding-guide': { name: '탑승지 안내', icon: MapPin },
  'room-assignment': { name: '객실 배정', icon: Users },
  'rounding-timetable': { name: '라운딩 시간표', icon: Calendar },
  'boarding-guide-staff': { name: '탑승지 배정 (스탭용)', icon: MapPin },
  'room-assignment-staff': { name: '객실 배정 (스탭용)', icon: Users },
};

export default function DocumentPage() {
  const params = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaffView, setIsStaffView] = useState(false);

  useEffect(() => {
    const checkStaffView = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsStaffView(session?.user?.user_metadata?.is_staff || false);
    };

    const fetchDocumentAndTour = async () => {
      try {
        setIsLoading(true);
        const [{ data: doc, error: docError }, { data: tourData }] = await Promise.all([
          supabase
          .from('documents')
          .select('*')
          .eq('tour_id', params.tourId)
          .eq('type', params.type)
            .single(),
          supabase
            .from('singsing_tours')
            .select('*')
            .eq('id', params.tourId)
            .single(),
        ]);
        if (docError) throw docError;
        setDocument(doc);
        setTour(tourData || null);
      } catch (err) {
        setError('문서를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    checkStaffView();
    fetchDocumentAndTour();
  }, [params.tourId, params.type]);

  // 스탭 전용 문서 체크
  const isStaffOnly = params.type?.toString().includes('-staff') ?? false;
  if (isStaffOnly && !isStaffView) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-600">이 문서는 스탭 전용입니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3">문서를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">오류 발생</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">문서를 찾을 수 없습니다</h1>
          <p className="text-gray-600">요청하신 문서가 존재하지 않습니다.</p>
        </div>
      </div>
    );
  }

  const documentType = documentTypes[params.type as keyof typeof documentTypes];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-full lg:max-w-4xl mx-auto p-2 sm:p-4 lg:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 sm:mb-6">
          <div>
            <div className="flex items-center mb-1">
              {documentType ? (
              <>
                {React.createElement(documentType.icon, { className: "w-6 h-6 text-blue-600 mr-2" })}
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{documentType.name}</h1>
              </>
              ) : (
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{params.type ? params.type.toString().replace(/-/g, ' ') : '문서 유형'}</h1>
              )}
            </div>
            {tour && (
              <p className="text-gray-600 text-xs sm:text-sm">{tour.title} / {tour.start_date} ~ {tour.end_date}{tour.golf_course ? ` / ${tour.golf_course}` : ''}</p>
            )}
          </div>
          <button
            type="button"
            className="flex items-center px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
            aria-label="문서 프린트"
            tabIndex={0}
            onClick={() => window.print()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') window.print(); }}
          >
            <Printer className="w-5 h-5 mr-1" />
            <span className="hidden sm:inline">프린트</span>
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
          <div className="prose max-w-none">
            {params.type === 'tour-schedule' ? (
              <TourSchedulePreview tourId={params.tourId as string} />
            ) : (
              document.content && document.content.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: document.content }} />
              ) : (
                <div className="text-gray-400 text-center py-12">안내문이 없습니다.</div>
              )
            )}
          </div>
          {(params.type === 'room-assignment' || params.type === 'room-assignment-staff') && (
            <div className="mt-10">
              <RoomAssignmentManager tourId={params.tourId as string} />
            </div>
          )}
          <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
            <p>최종 수정일: {new Date(document.updated_at).toLocaleString('ko-KR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 