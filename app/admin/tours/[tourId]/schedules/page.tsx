"use client";
import React from "react";
import ScheduleManager from "@/components/ScheduleManager";
// ... 필요한 fetch 함수 import ...

const AdminTourSchedulesPage = async ({ params }: { params: { tourId: string } }) => {
  // 투어/일정 fetch (예시, 실제 fetch 함수로 대체)
  const tour = await fetchTour(params.tourId);
  const schedules = await fetchSchedules(params.tourId);
  return (
    <div className="max-w-3xl mx-auto p-4">
      <ScheduleManager tour={tour} schedules={schedules} />
    </div>
  );
};

export default AdminTourSchedulesPage; 