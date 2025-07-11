"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import Link from 'next/link';
import { 
  Calendar,
  Users,
  DollarSign,
  Phone,
  Mail,
  User,
  FileText,
  Clock,
  Save,
  X,
  MapPin,
  Plus,
  Trash2,
  Briefcase,
  Bus,
  Utensils,
  Camera,
  CheckCircle
} from 'lucide-react';

interface QuoteFormProps {
  onSuccess: (id: string) => void;
  onCancel: () => void;
  initialData?: any;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [tourProducts, setTourProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [journeyItems, setJourneyItems] = useState<any[]>([]);
  const [participantInfo, setParticipantInfo] = useState({
    group_name: '',
    leader_name: '',
    leader_phone: '',
    estimated_count: 0
  });
  const [form, setForm] = useState({
    title: '',
    tour_product_id: '',
    start_date: '',
    end_date: '',
    price: 0,
    max_participants: 40,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    quote_expires_at: '',
    quote_notes: '',
    status: 'quote'
  });
  
  const [includeExclude, setIncludeExclude] = useState({
    includes: [
      '왕복 전용버스',
      '그린피 및 카트비',
      '숙박',
      '조식 제공'
    ],
    excludes: [
      '개인 경비',
      '캐디피',
      '중식 및 석식',
      '여행자 보험'
    ]
  });

  useEffect(() => {
    fetchTourProducts();
    
    if (initialData) {
      setForm({
        ...form,
        ...initialData
      });
      
      // 저장된 일정과 참가자 정보 불러오기
      if (initialData.quote_data) {
        const quoteData = typeof initialData.quote_data === 'string' 
          ? JSON.parse(initialData.quote_data) 
          : initialData.quote_data;
        
        if (quoteData.schedules) setSchedules(quoteData.schedules);
        if (quoteData.participants) setParticipantInfo(quoteData.participants);
        if (quoteData.includeExclude) setIncludeExclude(quoteData.includeExclude);
      }
      
      // tour_journey_items 가져오기
      fetchJourneyItems(initialData.id);
    } else {
      // 기본 유효기간 설정 (30일)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      setForm({
        ...form,
        quote_expires_at: expiryDate.toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  // 일정 초기화
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // 일정이 변경되었을 때 기존 일정 재구성
      const newSchedules = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        
        // 기존 일정이 있으면 유지
        const existingSchedule = schedules.find(s => 
          new Date(s.date).toDateString() === date.toDateString()
        );
        
        newSchedules.push({
          day: i + 1,
          date: date.toISOString().split('T')[0],
          title: existingSchedule?.title || `Day ${i + 1}`,
          description: existingSchedule?.description || ''
        });
      }
      setSchedules(newSchedules);
    }
  }, [form.start_date, form.end_date]);

  const fetchTourProducts = async () => {
    const { data } = await supabase
      .from("tour_products")
      .select("*, included_items, excluded_items")
      .order("name");
    
    if (data) setTourProducts(data);
  };
  
  const fetchJourneyItems = async (tourId: string) => {
    const { data } = await supabase
      .from("tour_journey_items")
      .select(`
        *,
        spot:tourist_attractions!spot_id(*)
      `)
      .eq("tour_id", tourId)
      .gt("order_index", 0) // DAY_INFO 제외
      .order("day_number")
      .order("order_index");
    
    if (data) {
      setJourneyItems(data);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = tourProducts.find(p => p.id === productId);
    if (product) {
      setForm({
        ...form,
        tour_product_id: productId,
        title: `${product.name} - ${form.start_date || '날짜 미정'}`
      });
      
      // 여행상품의 포함/불포함 사항 가져오기
      if (product.included_items || product.excluded_items) {
        const includes = product.included_items ? product.included_items.split(',').map((item: string) => item.trim()) : includeExclude.includes;
        const excludes = product.excluded_items ? product.excluded_items.split(',').map((item: string) => item.trim()) : includeExclude.excludes;
        
        setIncludeExclude({
          includes: includes.filter((item: string) => item.length > 0),
          excludes: excludes.filter((item: string) => item.length > 0)
        });
      }
    }
  };

  const handleScheduleChange = (index: number, field: string, value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index] = {
      ...newSchedules[index],
      [field]: value
    };
    setSchedules(newSchedules);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 견적 데이터에 일정과 참가자 정보 포함
      const quoteData = {
        schedules,
        participants: participantInfo,
        includeExclude
      };

      const payload = {
        ...form,
        quoted_at: new Date().toISOString(),
        quoted_by: 'admin', // TODO: 실제 사용자 정보로 변경
        quote_data: JSON.stringify(quoteData), // jsonb 필드에 저장
        max_participants: participantInfo.estimated_count || form.max_participants
      };

      if (initialData?.id) {
        // 수정 모드
        const { error } = await supabase
          .from("singsing_tours")
          .update(payload)
          .eq("id", initialData.id);
        
        if (error) throw error;
        onSuccess(initialData.id);
      } else {
        // 생성 모드
        const { data, error } = await supabase
          .from("singsing_tours")
          .insert(payload)
          .select()
          .single();
        
        if (error) throw error;
        
      // 문서 링크 생성
      const expiresAt = new Date(data.quote_expires_at);
      expiresAt.setDate(expiresAt.getDate() + 30); // 만료일 + 30일
      
      await supabase
        .from("public_document_links")
        .insert({
          tour_id: data.id,
          document_type: 'quote',
          title: `견적서 - ${data.title}`,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });
      
      onSuccess(data.id);
      }
    } catch (error: any) {
      alert('저장 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return `${days - 1}박 ${days}일`;
    }
    return '';
  };

  const tabs = [
    { id: 'basic', label: '기본 정보', icon: FileText },
    { id: 'schedule', label: '일정 관리', icon: Calendar },
    { id: 'participants', label: '참가자 정보', icon: Users },
    { id: 'includeExclude', label: '포함/불포함', icon: CheckCircle }
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
      {/* 탭 메뉴 */}
      <div className="border-b">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* 기본 정보 탭 */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* 고객 정보 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                고객 정보
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    고객명 *
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처 *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      className="w-full border rounded-lg pl-10 pr-3 py-2"
                      value={form.customer_phone}
                      onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                      placeholder="010-0000-0000"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      className="w-full border rounded-lg pl-10 pr-3 py-2"
                      value={form.customer_email}
                      onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 투어 정보 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                투어 정보
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      투어 상품 *
                    </label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.tour_product_id}
                      onChange={(e) => handleProductChange(e.target.value)}
                      required
                    >
                      <option value="">선택하세요</option>
                      {tourProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.golf_course}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      견적 제목 *
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="2박3일 순천버스핑 - 홍길동님"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      출발일 *
                    </label>
                    <input
                      type="date"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      도착일 *
                    </label>
                    <input
                      type="date"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      min={form.start_date}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      일정
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                      value={calculateDays()}
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      1인 금액 *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        className="w-full border rounded-lg pl-10 pr-3 py-2"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      견적 유효기간 *
                    </label>
                    <input
                      type="date"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.quote_expires_at}
                      onChange={(e) => setForm({ ...form, quote_expires_at: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 추가 메모 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                추가 정보
              </h3>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={4}
                value={form.quote_notes}
                onChange={(e) => setForm({ ...form, quote_notes: e.target.value })}
                placeholder="고객 요청사항이나 특이사항을 입력하세요..."
              />
            </div>
          </div>
        )}

        {/* 일정 관리 탭 */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">일정 정보</h3>
            {schedules.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                먼저 기본 정보에서 출발일과 도착일을 선택해주세요.
              </p>
            ) : (
              <div className="space-y-6">
                {/* 일자별로 표시 */}
                {Array.from({ length: schedules.length }, (_, dayIndex) => {
                  const dayNumber = dayIndex + 1;
                  const schedule = schedules[dayIndex];
                  const dayJourneyItems = journeyItems.filter(item => item.day_number === dayNumber);
                  
                  return (
                    <div key={dayIndex} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-lg">
                          Day {dayNumber} - {new Date(schedule.date).toLocaleDateString('ko-KR')}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {dayJourneyItems.length}개 일정
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            일정 제목
                          </label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={schedule.title}
                            onChange={(e) => handleScheduleChange(dayIndex, 'title', e.target.value)}
                            placeholder="예: 서울 출발 → 순천 도착"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            상세 일정
                          </label>
                          <textarea
                            className="w-full border rounded-lg px-3 py-2"
                            rows={3}
                            value={schedule.description}
                            onChange={(e) => handleScheduleChange(dayIndex, 'description', e.target.value)}
                            placeholder="주요 일정을 입력하세요..."
                          />
                        </div>
                        
                        {/* 실제 일정 항목 표시 */}
                        {dayJourneyItems.length > 0 ? (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Day {dayNumber} 등록된 일정 항목
                            </label>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                              {dayJourneyItems.map((item, idx) => (
                                <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border">
                                  <span className="text-sm font-medium text-gray-500 w-6">{idx + 1}</span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {item.spot?.category === 'boarding' && <Bus className="w-4 h-4 text-blue-500" />}
                                      {item.spot?.category === 'golf_round' && <MapPin className="w-4 h-4 text-green-500" />}
                                      {item.spot?.category === 'restaurant' && <Utensils className="w-4 h-4 text-orange-500" />}
                                      {item.spot?.category === 'tourist_spot' && <Camera className="w-4 h-4 text-purple-500" />}
                                      <span className="font-medium">{item.spot?.name || '알 수 없음'}</span>
                                      {item.arrival_time && (
                                        <span className="text-sm text-gray-500">({item.arrival_time})</span>
                                      )}
                                    </div>
                                    {item.spot?.address && (
                                      <p className="text-sm text-gray-600 mt-1">{item.spot.address}</p>
                                    )}
                                    {item.meal_type && item.meal_menu && (
                                      <p className="text-sm text-orange-600 mt-1">
                                        {item.meal_type}: {item.meal_menu}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">
                                * 일정 항목은 '일정 관리' 메뉴에서 수정할 수 있습니다.
                              </p>
                              {initialData?.id && (
                                <Link 
                                  href={`/admin/tours/${initialData.id}/schedule`} 
                                  target="_blank"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  일정 관리 바로가기
                                </Link>
                              )}
                            </div>
                          </div>
                        ) : initialData?.id ? (
                          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-600 mb-2">
                              Day {dayNumber}에 등록된 일정이 없습니다.
                            </p>
                            <Link 
                              href={`/admin/tours/${initialData.id}/schedule`} 
                              target="_blank"
                              className="text-sm text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              일정 관리에서 추가하기
                            </Link>
                          </div>
                        ) : !initialData?.id ? (
                          <div className="mt-4 bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                              견적을 저장한 후 '일정 관리' 메뉴에서 상세한 일정을 추가할 수 있습니다.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 참가자 정보 탭 */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">참가자 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  모임명
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  value={participantInfo.group_name}
                  onChange={(e) => setParticipantInfo({ ...participantInfo, group_name: e.target.value })}
                  placeholder="예: ○○동호회"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  예상 인원
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    className="w-full border rounded-lg pl-10 pr-3 py-2"
                    value={participantInfo.estimated_count}
                    onChange={(e) => setParticipantInfo({ ...participantInfo, estimated_count: Number(e.target.value) })}
                    min="1"
                    placeholder="40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  총무 성명
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  value={participantInfo.leader_name}
                  onChange={(e) => setParticipantInfo({ ...participantInfo, leader_name: e.target.value })}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  총무 연락처
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    className="w-full border rounded-lg pl-10 pr-3 py-2"
                    value={participantInfo.leader_phone}
                    onChange={(e) => setParticipantInfo({ ...participantInfo, leader_phone: e.target.value })}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>안내:</strong> 견적이 확정되어 투어로 전환되면, 여기에 입력한 정보를 바탕으로 
                상세한 참가자 명단을 추가할 수 있습니다.
              </p>
            </div>
          </div>
        )}
        
        {/* 포함/불포함 사항 탭 */}
        {activeTab === 'includeExclude' && (
          <div className="space-y-6">
            {/* 포함 사항 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  포함 사항
                </h3>
                <button
                  type="button"
                  onClick={() => setIncludeExclude({
                    ...includeExclude,
                    includes: [...includeExclude.includes, '']
                  })}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
              <div className="space-y-2">
                {includeExclude.includes.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <input
                      type="text"
                      className="flex-1 border rounded-lg px-3 py-2"
                      value={item}
                      onChange={(e) => {
                        const newIncludes = [...includeExclude.includes];
                        newIncludes[index] = e.target.value;
                        setIncludeExclude({ ...includeExclude, includes: newIncludes });
                      }}
                      placeholder="포함 사항을 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newIncludes = includeExclude.includes.filter((_, i) => i !== index);
                        setIncludeExclude({ ...includeExclude, includes: newIncludes });
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 불포함 사항 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <X className="w-5 h-5 text-gray-600" />
                  불포함 사항
                </h3>
                <button
                  type="button"
                  onClick={() => setIncludeExclude({
                    ...includeExclude,
                    excludes: [...includeExclude.excludes, '']
                  })}
                  className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
              <div className="space-y-2">
                {includeExclude.excludes.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      className="flex-1 border rounded-lg px-3 py-2"
                      value={item}
                      onChange={(e) => {
                        const newExcludes = [...includeExclude.excludes];
                        newExcludes[index] = e.target.value;
                        setIncludeExclude({ ...includeExclude, excludes: newExcludes });
                      }}
                      placeholder="불포함 사항을 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newExcludes = includeExclude.excludes.filter((_, i) => i !== index);
                        setIncludeExclude({ ...includeExclude, excludes: newExcludes });
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>안내:</strong> 견적서에 표시될 포함/불포함 사항을 관리할 수 있습니다. 
                여행상품 선택 시 자동으로 해당 상품의 포함/불포함 사항이 불러와집니다.
                필요에 따라 수정하거나 새로운 항목을 추가할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="border-t px-6 py-4 flex justify-end gap-3">
        <button
          type="button"
          className="px-4 py-2 bg-white text-gray-700 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="w-4 h-4" />
          취소
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          disabled={loading}
        >
          <Save className="w-4 h-4" />
          {loading ? '저장 중...' : '견적 저장'}
        </button>
      </div>
    </form>
  );
};

export default QuoteForm;