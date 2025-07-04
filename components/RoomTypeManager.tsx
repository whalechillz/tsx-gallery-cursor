"use client";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, X } from "lucide-react";

type Room = {
  id: string;
  room_type: string;
  room_seq: number;
  room_number: string;
  capacity: number;
  tour_id: string;
  is_comp?: boolean;
  comp_note?: string;
};

type RoomForm = {
  room_type: string;
  capacity: string;
  is_comp?: boolean;
  comp_note?: string;
};

const initialForm: RoomForm = { room_type: "", capacity: "", is_comp: false, comp_note: "" };

type Props = { tourId: string; onDataChange?: () => void };

const RoomTypeManager: React.FC<Props> = ({ tourId, onDataChange }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomRows, setRoomRows] = useState([{ room_type: "", capacity: "", is_comp: false, comp_note: "" }]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ room_type: "", capacity: "", is_comp: false, comp_note: "" });

  const fetchRooms = async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.from("singsing_rooms").select("*").eq("tour_id", tourId).order("room_seq", { ascending: true });
    if (error) setError(error.message);
    else setRooms((data || []) as Room[]);
    setLoading(false);
  };

  useEffect(() => {
    if (tourId) fetchRooms();
  }, [tourId]);

  const handleRowChange = (idx: number, field: string, value: string) => {
    setRoomRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleAddRow = () => {
    setRoomRows(rows => [...rows, { room_type: "", capacity: "", is_comp: false, comp_note: "" }]);
  };

  const handleDeleteRow = (idx: number) => {
    setRoomRows(rows => rows.filter((_, i) => i !== idx));
  };

  const handleBulkAdd = async () => {
    setError("");
    // 유효성 검사
    if (roomRows.some(row => !row.room_type || !row.capacity)) {
      setError("모든 행의 객실 이름과 정원을 입력해 주세요.");
      return;
    }
    // 각 객실에 고유한 seq 할당 (항상 최대값 + 1 사용)
    const maxSeq = Math.max(0, ...rooms.map(r => r.room_seq || 0));
    const newRooms: any[] = [];
    let currentSeq = maxSeq;
    
    for (const row of roomRows) {
      currentSeq += 1;
      newRooms.push({
        tour_id: tourId,
        room_type: row.room_type,
        room_seq: currentSeq,
        room_number: `${row.room_type}-${String(currentSeq).padStart(2, '0')}`,
        capacity: Number(row.capacity),
      });
    }
    const { error } = await supabase.from("singsing_rooms").insert(newRooms);
    if (error) setError(error.message);
    else {
      setRoomRows([{ room_type: "", capacity: "", is_comp: false, comp_note: "" }]);
      await fetchRooms();
      if (onDataChange) onDataChange();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.room_type || !editForm.capacity) {
      setError("객실 이름과 정원을 입력해주세요.");
      return;
    }
    
    // 현재 객실 정보 가져오기
    const currentRoom = rooms.find(r => r.id === id);
    if (!currentRoom) return;
    
    // 항상 객실 번호를 타입명 기반으로 재생성
    const newRoomNumber = `${editForm.room_type}-${String(currentRoom.room_seq).padStart(2, '0')}`;
    
    // room_seq는 변경하지 않음 (고유 식별을 위해 유지)
    
    const { error } = await supabase
      .from("singsing_rooms")
      .update({ 
        room_type: editForm.room_type, 
        capacity: Number(editForm.capacity),
        room_number: newRoomNumber
      })
      .eq("id", id);
      
    if (error) setError(error.message);
    else {
      setEditingRoom(null);
      await fetchRooms();
      if (onDataChange) onDataChange();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까? 배정된 참가자들은 미배정 상태가 됩니다.")) return;
    
    try {
      // 먼저 해당 객실에 배정된 참가자들을 미배정으로 변경
      const { error: updateError } = await supabase
        .from("singsing_participants")
        .update({ room_id: null })
        .eq("room_id", id);
      
      if (updateError) throw updateError;
      
      // 그 다음 객실 삭제
      const { error: deleteError } = await supabase
        .from("singsing_rooms")
        .delete()
        .eq("id", id);
      
      if (deleteError) throw deleteError;
      
      await fetchRooms();
      if (onDataChange) onDataChange();
    } catch (error: any) {
      setError(`객실 삭제 중 오류 발생: ${error.message}`);
    }
  };

  // 통계 계산
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const totalRooms = rooms.length;
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">객실 관리</h2>
        <div className="text-sm text-gray-600">
          총 {totalRooms}개 객실 | 총 정원 {totalCapacity}명
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-4">
        {roomRows.map((row, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input name="room_type" value={row.room_type} onChange={e => handleRowChange(idx, "room_type", e.target.value)} placeholder="객실 이름 (예: 2인실, 온돌방)" className="border rounded px-2 py-1 flex-1" required aria-label="객실 이름" />
            <input name="capacity" value={row.capacity} onChange={e => handleRowChange(idx, "capacity", e.target.value)} placeholder="정원" type="number" min="1" className="border rounded px-2 py-1 flex-1" required aria-label="정원" />
            <button type="button" className="text-red-600 hover:text-red-800" onClick={() => handleDeleteRow(idx)} aria-label="행 삭제"><X size={18} /></button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <button type="button" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium" onClick={handleAddRow}>
            <Plus size={16} /> 행 추가
          </button>
          <button type="button" className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors" onClick={handleBulkAdd}>
            일괄 추가
          </button>
        </div>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </div>
      {loading ? (
        <div className="text-center py-4 text-gray-500">불러오는 중...</div>
      ) : (
        <table className="w-full bg-white dark:bg-gray-900 rounded shadow text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              <th className="py-2 px-2 text-left">객실 이름</th>
              <th className="py-2 px-2 text-left">정원</th>
              <th className="py-2 px-2 text-left">객실 번호</th>
              <th className="py-2 px-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-1 px-2">
                  {editingRoom === room.id ? (
                    <input
                      type="text"
                      value={editForm.room_type}
                      onChange={e => setEditForm({...editForm, room_type: e.target.value})}
                      className="border rounded px-1 py-0.5 w-full text-sm"
                    />
                  ) : (
                    room.room_type
                  )}
                </td>
                <td className="py-1 px-2">
                  {editingRoom === room.id ? (
                    <input
                      type="number"
                      value={editForm.capacity}
                      onChange={e => setEditForm({...editForm, capacity: e.target.value})}
                      className="border rounded px-1 py-0.5 w-20 text-sm"
                      min="1"
                    />
                  ) : (
                    room.capacity
                  )}
                </td>
                <td className="py-1 px-2">{room.room_number}</td>
                <td className="py-1 px-2">
                  <div className="flex justify-center items-center gap-2">
                    {editingRoom === room.id ? (
                      <>
                        <button
                          className="text-green-600 text-sm underline"
                          onClick={() => handleUpdate(room.id)}
                        >
                          저장
                        </button>
                        <button
                          className="text-gray-600 text-sm underline"
                          onClick={() => setEditingRoom(null)}
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="text-blue-700 underline" 
                          onClick={() => {
                            setEditingRoom(room.id);
                            setEditForm({ 
                              room_type: room.room_type, 
                              capacity: room.capacity.toString(),
                              is_comp: room.is_comp || false,
                              comp_note: room.comp_note || ""
                            });
                          }} 
                          aria-label="수정"
                        >
                          수정
                        </button>
                        <button className="text-red-600 underline" onClick={() => handleDelete(room.id)} aria-label="삭제">삭제</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RoomTypeManager; 