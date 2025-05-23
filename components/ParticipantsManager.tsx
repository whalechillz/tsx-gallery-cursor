"use client";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";

// 공통 ParticipantsManager Props
interface ParticipantsManagerProps {
  tourId?: string; // 있으면 해당 투어만, 없으면 전체
  showColumns?: string[]; // 표시할 컬럼 커스텀
  onChange?: () => void; // 외부에서 데이터 변경 감지
}

interface Participant {
  id: string;
  name: string;
  phone: string;
  team_name?: string;
  note?: string;
  status: string;
  tour_id: string;
  room_name?: string | null;
  singsing_rooms?: {
    room_type: string;
    room_number: string;
  };
  gender?: string;
  [key: string]: any;
}

interface ParticipantForm {
  name: string;
  phone: string;
  team_name?: string;
  note?: string;
  status: string;
  role: string;
  gender: string;
}

const DEFAULT_COLUMNS = ["이름", "연락처", "팀", "투어", "객실", "상태", "관리"];

const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({ tourId, showColumns = DEFAULT_COLUMNS, onChange }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<ParticipantForm>({ name: "", phone: "", team_name: "", note: "", status: "확정", role: "", gender: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof Participant | "">("created_at");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const roleOptions = ["총무", "회장", "회원", "부회장", "서기", "기타"];
  const [customRole, setCustomRole] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchParticipants = async () => {
    setLoading(true);
    setError("");
    let query = supabase.from("singsing_participants").select("*, singsing_rooms:room_id(room_type, room_number)");
    if (tourId) query = query.eq("tour_id", tourId);
    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setParticipants((data || []) as Participant[]);
    setLoading(false);
  };

  useEffect(() => { fetchParticipants(); }, [tourId]);

  const normalizePhone = (input: string) => {
    let phone = input.replace(/[^0-9]/g, "");
    if (phone.length === 10 && !phone.startsWith("0")) phone = "0" + phone;
    if (phone.length > 11) phone = phone.slice(0, 11);
    return phone;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    if (name === "phone") value = normalizePhone(value);
    if (name === "role" && value === "기타") setCustomRole("");
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.name) {
      setError("이름은 필수입니다.");
      return;
    }
    const phone = form.phone ? normalizePhone(form.phone) : "";
    const role = form.role === "기타" ? customRole : form.role;
    const isDuplicate = participants.some(
      (p) => p.name === form.name && p.phone === phone
    );
    if (!editingId && isDuplicate) {
      setError("이미 등록된 참가자입니다.");
      return;
    }
    const payload = { ...form, phone, role, tour_id: tourId };
    if (editingId) {
      const { error } = await supabase.from("singsing_participants").update(payload).eq("id", editingId);
      if (error) setError(error.message);
      else {
        setEditingId(null);
        setForm({ name: "", phone: "", team_name: "", note: "", status: "확정", role: "", gender: "" });
        setCustomRole("");
        fetchParticipants();
      }
    } else {
      const { error } = await supabase.from("singsing_participants").insert([payload]);
      if (error) setError(error.message);
      else {
        setForm({ name: "", phone: "", team_name: "", note: "", status: "확정", role: "", gender: "" });
        setCustomRole("");
        fetchParticipants();
      }
    }
  };

  const handleEdit = (p: Participant) => {
    setEditingId(p.id);
    setForm({ name: p.name, phone: p.phone, team_name: p.team_name || "", note: p.note || "", status: p.status || "확정", role: p.role || "", gender: p.gender || "" });
    if (p.role && !roleOptions.includes(p.role)) setCustomRole(p.role);
    else setCustomRole("");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("singsing_participants").delete().eq("id", id);
    if (error) setError(error.message);
    else fetchParticipants();
  };

  const filtered = participants
    .filter(p =>
      (!search ||
        p.name?.includes(search) ||
        p.phone?.includes(search) ||
        p.team_name?.includes(search) ||
        p.note?.includes(search)) &&
      (!teamFilter || p.team_name === teamFilter) &&
      (!roomFilter || p.room_name === roomFilter) &&
      (!statusFilter || p.status === statusFilter)
    )
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      if (aValue === bValue) return 0;
      if (sortAsc) return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });

  const handleDownloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participants.map((p, idx) => ({
      순번: idx + 1,
      이름: p.name,
      연락처: p.phone,
      팀명: p.team_name,
      메모: p.note,
      상태: p.status,
      직책: p.role || ""
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "참가자목록");
    XLSX.writeFile(wb, "참가자목록.xlsx");
  };

  const handleUploadExcel = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFileName(file ? file.name : "");
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      let added = 0, skipped = 0;
      for (const row of rows as any[]) {
        const name = row["이름"]?.toString().trim();
        const phone = row["연락처"] ? normalizePhone(row["연락처"].toString()) : "";
        const role = row["직책"]?.toString().trim() || "";
        if (!name) { skipped++; continue; }
        if (participants.some(p => p.name === name && p.phone === phone)) { skipped++; continue; }
        const { error } = await supabase.from("singsing_participants").insert([
          {
            name,
            phone,
            team_name: row["팀명"] || "",
            note: row["메모"] || "",
            status: row["상태"] || "확정",
            role,
            tour_id: tourId
          }
        ]);
        if (!error) added++;
        else skipped++;
      }
      fetchParticipants();
      alert(`업로드 완료: ${added}명 추가, ${skipped}명 건너뜀`);
    };
    reader.readAsBinaryString(file);
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filtered.map(p => p.id) : []);
  };

  // 개별 선택
  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("singsing_participants").delete().in("id", selectedIds);
    setSelectedIds([]);
    fetchParticipants();
  };

  // 일괄 객실 배정
  const [bulkRoomId, setBulkRoomId] = useState("");
  const handleBulkAssignRoom = async () => {
    if (!bulkRoomId) return;
    await supabase.from("singsing_participants").update({ room_id: bulkRoomId }).in("id", selectedIds);
    setSelectedIds([]);
    setBulkRoomId("");
    fetchParticipants();
  };

  // 일괄 미배정
  const handleBulkUnassign = async () => {
    await supabase.from("singsing_participants").update({ room_id: null }).in("id", selectedIds);
    setSelectedIds([]);
    fetchParticipants();
  };

  // 일괄 상태변경
  const [bulkStatus, setBulkStatus] = useState("");
  const handleBulkStatus = async () => {
    if (!bulkStatus) return;
    await supabase.from("singsing_participants").update({ status: bulkStatus }).in("id", selectedIds);
    setSelectedIds([]);
    setBulkStatus("");
    fetchParticipants();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="px-3 py-1 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition">
          엑셀 업로드
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleUploadExcel}
            className="hidden"
          />
        </label>
        <span className={selectedFileName ? "text-gray-700 text-sm max-w-[180px] truncate" : "text-gray-400 text-sm italic max-w-[180px] truncate"}>
          {selectedFileName || "선택된 파일 없음"}
        </span>
        <button
          type="button"
          onClick={handleDownloadExcel}
          className="ml-4 px-3 py-1 bg-gray-100 text-blue-700 rounded hover:bg-gray-200 transition"
        >
          엑셀 다운로드
        </button>
      </div>
      <form className="flex flex-col md:flex-row gap-2 mb-4" onSubmit={handleSubmit}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="이름" className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800" required />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="연락처(숫자만)" className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800" maxLength={11} />
        <input name="team_name" value={form.team_name} onChange={handleChange} placeholder="팀명" className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800" />
        <input name="note" value={form.note} onChange={handleChange} placeholder="메모" className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800" />
        <select name="gender" value={form.gender} onChange={handleChange} className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800" aria-label="성별" required>
          <option value="">성별</option>
          <option value="남">남</option>
          <option value="여">여</option>
        </select>
        <select name="status" value={form.status} onChange={handleChange} className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800" aria-label="상태">
          <option value="확정">확정</option>
          <option value="대기">대기</option>
          <option value="취소">취소</option>
        </select>
        <select name="role" value={form.role} onChange={handleChange} className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800" aria-label="직책">
          <option value="">직책 선택</option>
          {roleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {form.role === "기타" && (
          <input name="customRole" value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="직접입력" className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800" />
        )}
        <button type="submit" className="bg-blue-800 text-white px-4 py-1 rounded min-w-[60px] font-semibold hover:bg-blue-900 transition-colors">{editingId ? "수정" : "추가"}</button>
        {editingId && <button type="button" className="bg-gray-300 text-gray-800 px-4 py-1 rounded min-w-[60px] font-semibold hover:bg-gray-400 transition-colors" onClick={() => { setEditingId(null); setForm({ name: "", phone: "", team_name: "", note: "", status: "확정", role: "", gender: "" }); }}>취소</button>}
      </form>
      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름, 연락처, 팀, 메모 검색"
          className="border border-gray-300 rounded px-2 py-1 flex-1 text-gray-800"
        />
      </div>
      {/* 다중 필터 UI */}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">팀 전체</option>
          {Array.from(new Set(participants.map(p => p.team_name).filter(Boolean))).map(team => (
            <option key={team} value={team as string}>{team}</option>
          ))}
        </select>
        <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">객실 전체</option>
          {Array.from(new Set(participants.map(p => p.room_name).filter(Boolean))).map(room => (
            <option key={room} value={room as string}>{room}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">상태 전체</option>
          <option value="확정">확정</option>
          <option value="대기">대기</option>
          <option value="취소">취소</option>
        </select>
      </div>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {loading ? (
        <div className="text-center py-4 text-gray-500">불러오는 중...</div>
      ) : (
        <div className="mb-2 text-right text-gray-700 font-semibold">총 {filtered.length}명</div>
      )}
      {/* 일괄 액션 UI */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <span className="text-blue-700 font-semibold">{selectedIds.length}명 선택됨</span>
          <button type="button" onClick={handleBulkDelete} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">일괄 삭제</button>
          <select value={bulkRoomId} onChange={e => setBulkRoomId(e.target.value)} className="border rounded px-2 py-1">
            <option value="">객실 일괄 배정</option>
            {Array.from(new Set(participants.map(p => p.room_name).filter(Boolean))).map(room => (
              <option key={room} value={room as string}>{room}</option>
            ))}
          </select>
          <button type="button" onClick={handleBulkAssignRoom} className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">적용</button>
          <button type="button" onClick={handleBulkUnassign} className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">일괄 미배정</button>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="border rounded px-2 py-1">
            <option value="">상태 일괄 변경</option>
            <option value="확정">확정</option>
            <option value="대기">대기</option>
            <option value="취소">취소</option>
          </select>
          <button type="button" onClick={handleBulkStatus} className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">적용</button>
        </div>
      )}
      {loading ? (
        <div className="text-center py-4 text-gray-500">불러오는 중...</div>
      ) : (
        <table className="w-full bg-white dark:bg-gray-900 rounded shadow text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              <th className="py-2 px-2"><input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={e => handleSelectAll(e.target.checked)} /></th>
              {showColumns.map(col => <th key={col} className="py-2 px-2">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-1 px-2"><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={e => handleSelectOne(p.id, e.target.checked)} /></td>
                {showColumns.includes("이름") && <td className="py-1 px-2">{p.name}{p.gender ? <span className="ml-1 text-xs text-gray-500">({p.gender})</span> : null}</td>}
                {showColumns.includes("연락처") && <td className="py-1 px-2">{p.phone ? p.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3') : ""}</td>}
                {showColumns.includes("팀") && <td className="py-1 px-2">{p.team_name}</td>}
                {showColumns.includes("투어") && <td className="py-1 px-2">{p.tour_id}</td>}
                {showColumns.includes("객실") && <td className="py-1 px-2">{p.singsing_rooms?.room_number || "미배정"}</td>}
                {showColumns.includes("상태") && <td className="py-1 px-2">
                  <span className={
                    p.status === "확정"
                      ? "bg-green-100 text-green-800 px-2 py-1 rounded"
                      : p.status === "대기"
                      ? "bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
                      : "bg-gray-200 text-gray-700 px-2 py-1 rounded"
                  }>
                    {p.status || "확정"}
                  </span>
                </td>}
                {showColumns.includes("관리") && <td className="py-1 px-2 flex gap-1">
                  <button className="text-blue-700 underline" onClick={() => handleEdit(p)}>수정</button>
                  <button className="text-red-600 underline" onClick={() => handleDelete(p.id)}>삭제</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ParticipantsManager; 