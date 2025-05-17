"use client";
import React from "react";
import SchedulePreview from "@/components/SchedulePreview";
// ... 필요한 fetch 함수 import ...

const ScheduleDocumentPage = async ({ params }: { params: { tourId: string } }) => {
  // 투어/일정 fetch (예시, 실제 fetch 함수로 대체)
  const tour = await fetchTour(params.tourId);
  const schedules = await fetchSchedules(params.tourId);
  return (
    <div className="max-w-2xl mx-auto p-4">
      <SchedulePreview tour={tour} schedules={schedules} />
    </div>
  );
};

export default ScheduleDocumentPage; 