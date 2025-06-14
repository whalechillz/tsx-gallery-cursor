"use client";
import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Plus, X, Users, Phone, FileText, Settings } from "lucide-react";

type StaffMember = {
  name: string;
  phone: string;
  role: string;
};

type TourForm = {
  title: string;
  start_date: string;
  end_date: string;
  price: string;
  max_participants: string;
  tour_product_id: string;
  
  // 일정 관련 필드
  departure_location: string;
  itinerary: string;
  included_items: string;
  notes: string;
  
  other_notices: string;
};

const TourNewPage: React.FC = () => {
  const router = useRouter();
  const [form, setForm] = useState<TourForm>({
    title: "",
    start_date: "",
    end_date: "",
    price: "",
    max_participants: "",
    tour_product_id: "",
    
    // 일정 관련 필드
    departure_location: "서울 강남 신논현역 9번 출구", // 기본값
    itinerary: "",
    included_items: "",
    notes: "",
    
    other_notices: ""
  });
  
  const [staff, setStaff] = useState<StaffMember[]>([
    { name: "", phone: "", role: "기사" }
  ]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"basic" | "staff">("basic");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("tour_products")
      .select("*")
      .order("name");
    
    if (!error && data) {
      setProducts(data);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleProductChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedProductId = e.target.value;
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    
    if (selectedProduct) {
      setForm({
        ...form,
        tour_product_id: selectedProductId,
      });
    }
  };

  const handleStaffChange = (index: number, field: 'name' | 'phone' | 'role', value: string) => {
    const newStaff = [...staff];
    newStaff[index][field] = value;
    setStaff(newStaff);
  };

  const addStaff = () => {
    setStaff([...staff, { name: "", phone: "", role: "가이드" }]);
  };

  const removeStaff = (index: number) => {
    setStaff(staff.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // 1. 투어 생성 - 타입 체크 무시하고 실제 DB 스키마에 맞게 수정
      const { data: tourData, error: tourError } = await supabase
        .from("singsing_tours")
        .insert([{
          title: form.title,
          start_date: form.start_date,
          end_date: form.end_date,
          price: form.price ? Number(form.price) : 0,
          max_participants: form.max_participants ? Number(form.max_participants) : 0,
          tour_product_id: form.tour_product_id || null,
          
          // 일정 관련 필드
          departure_location: form.departure_location,
          itinerary: form.itinerary,
          included_items: form.included_items,
          notes: form.notes,
          
          other_notices: form.other_notices || null,
        }])  // types.ts를 수정했으므로 타입 에러 해결
        .select()
        .single();
      
      if (tourError) throw tourError;
      
      // 2. 스텝진 추가
      const validStaff = staff.filter(s => s.name.trim() !== "");
      if (validStaff.length > 0 && tourData) {
        const staffRecords = validStaff.map((s, index) => ({
          tour_id: tourData.id,
          name: s.name,
          phone: s.phone || "",
          role: s.role,
          display_order: index + 1
        }));
        
        const { error: staffError } = await supabase
          .from("singsing_tour_staff")
          .insert(staffRecords);
        
        if (staffError) throw staffError;
      }
      
      router.push("/admin/tours");
    } catch (error: any) {
      console.error("Error creating tour:", error);
      setError(error.message || "투어 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow p-8">
      <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">투어 스케쥴 생성</h2>
      
      {/* 탭 네비게이션 */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          type="button"
          className={`pb-2 px-1 font-medium ${activeTab === "basic" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
          onClick={() => setActiveTab("basic")}
        >
          기본 정보
        </button>
        <button
          type="button"
          className={`pb-2 px-1 font-medium ${activeTab === "staff" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
          onClick={() => setActiveTab("staff")}
        >
          <Users className="w-4 h-4 inline mr-1" />
          스텝진 관리
        </button>
      </div>
      
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* 기본 정보 탭 */}
        {activeTab === "basic" && (
          <>
            <label className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
              <span className="font-medium">제목</span>
              <input 
                name="title" 
                type="text" 
                className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                value={form.title} 
                onChange={handleChange} 
                required 
              />
            </label>
            
            <div className="flex gap-2">
              <label className="flex flex-col gap-1 flex-1 text-gray-700 dark:text-gray-300">
                <span className="font-medium">시작일</span>
                <input 
                  name="start_date" 
                  type="date" 
                  className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                  value={form.start_date} 
                  onChange={handleChange} 
                  required 
                />
              </label>
              <label className="flex flex-col gap-1 flex-1 text-gray-700 dark:text-gray-300">
                <span className="font-medium">종료일</span>
                <input 
                  name="end_date" 
                  type="date" 
                  className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                  value={form.end_date} 
                  onChange={handleChange} 
                  required 
                />
              </label>
            </div>
            
            <label className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
              <span className="font-medium">여행상품 선택</span>
              <select 
                name="tour_product_id" 
                className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                value={form.tour_product_id} 
                onChange={handleProductChange}
                required
              >
                <option value="">여행상품을 선택하세요</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.golf_course && `(${p.golf_course})`}
                  </option>
                ))}
              </select>
            </label>
            
            <div className="bg-blue-50 p-4 rounded-lg mt-2">
              <p className="text-sm text-blue-700">
                <strong>참고:</strong> 골프장과 숙소 정보는 여행상품에서 자동으로 가져옵니다.
              </p>
            </div>

            
            <div className="flex gap-2">
              <label className="flex flex-col gap-1 flex-1 text-gray-700 dark:text-gray-300">
                <span className="font-medium">가격</span>
                <input 
                  name="price" 
                  type="number" 
                  className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                  value={form.price} 
                  onChange={handleChange} 
                  required 
                />
              </label>
              <label className="flex flex-col gap-1 flex-1 text-gray-700 dark:text-gray-300">
                <span className="font-medium">최대 인원</span>
                <input 
                  name="max_participants" 
                  type="number" 
                  className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                  value={form.max_participants} 
                  onChange={handleChange} 
                  required 
                />
              </label>
            </div>
            
            {/* 일정 관련 필드 추가 */}
            <label className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
              <span className="font-medium">출발 장소</span>
              <input 
                name="departure_location" 
                type="text" 
                className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                value={form.departure_location} 
                onChange={handleChange} 
                placeholder="예: 서울 강남 신논현역 9번 출구"
              />
            </label>
            
            <label className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
              <span className="font-medium">상세 일정</span>
              <textarea 
                name="itinerary" 
                className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[120px]" 
                value={form.itinerary} 
                onChange={handleChange}
                placeholder="1일차:\n- 06:00 출발\n- 12:00 골프장 도착\n..."
              />
            </label>
            
            <label className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
              <span className="font-medium">포함 사항</span>
              <textarea 
                name="included_items" 
                className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[80px]" 
                value={form.included_items} 
                onChange={handleChange}
                placeholder="- 왕복 리무진 버스\n- 숙박 (2인 1실)\n- 식사\n- 그린피..."
              />
            </label>
            
            <label className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
              <span className="font-medium">기타 안내 사항</span>
              <textarea 
                name="notes" 
                className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[60px]" 
                value={form.notes} 
                onChange={handleChange}
                placeholder="추가 안내 사항을 입력하세요 (선택사항)"
              />
            </label>
            
            <label className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
              <span className="font-medium">일정표 하단 공지사항</span>
              <textarea 
                name="other_notices" 
                className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                value={form.other_notices} 
                onChange={handleChange}
                placeholder="이 투어만의 특별한 공지사항이 있다면 입력하세요 (선택사항)"
                rows={3}
              />
            </label>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>참고:</strong> 여행상품에서 설정한 라운딩 주의사항 및 이용 안내가 고객 문서에 자동으로 표시됩니다.
              </p>
            </div>
          </>
        )}
        
        {/* 스텝진 관리 탭 */}
        {activeTab === "staff" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">스텝진 정보</h3>
              <button
                type="button"
                onClick={addStaff}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-4 h-4" />
                스텝 추가
              </button>
            </div>
            
            {staff.map((member, index) => (
              <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <select
                  value={member.role}
                  onChange={(e) => handleStaffChange(index, "role", e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-700"
                >
                  <option value="기사">기사</option>
                  <option value="가이드">가이드</option>
                  <option value="인솔자">인솔자</option>
                  <option value="매니저">매니저</option>
                </select>
                
                <input
                  type="text"
                  placeholder="이름"
                  value={member.name}
                  onChange={(e) => handleStaffChange(index, "name", e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-700"
                />
                
                <input
                  type="text"
                  placeholder="연락처 (선택사항)"
                  value={member.phone}
                  onChange={(e) => handleStaffChange(index, "phone", e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-700"
                />
                
                {staff.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStaff(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {error && <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 rounded">{error}</div>}
        
        <div className="flex gap-2 mt-4">
          <button 
            type="submit" 
            className="bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-700 focus:bg-blue-700" 
            disabled={loading}
          >
            {loading ? "저장 중..." : "투어 생성"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/tours")}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
};

export default TourNewPage;
