import React from "react";

type Tour = {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  // 기타 필요한 필드
};

type Schedule = {
  id: string;
  date: string;
  title: string;
  description?: string;
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
  // 기타 필요한 필드
};

type Props = {
  tour: Tour;
  schedules: Schedule[];
};

const SchedulePreview: React.FC<Props> = ({ tour, schedules }) => {
  return (
    <div className="">
      <h1 className="text-2xl font-bold mb-2">{tour.title}</h1>
      <div className="mb-4 text-gray-600">{tour.start_date} ~ {tour.end_date}</div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">일정 안내</h2>
        <ul className="space-y-2">
          {schedules.map(s => (
            <li key={s.id} className="border rounded p-3 bg-gray-50">
              <div className="font-bold">{s.date} {s.title}</div>
              <div className="text-sm text-gray-700">{s.description}</div>
              <div className="flex gap-2 mt-1 text-xs">
                <span>조식: {s.breakfast ? 'O' : 'X'}</span>
                <span>중식: {s.lunch ? 'O' : 'X'}</span>
                <span>석식: {s.dinner ? 'O' : 'X'}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SchedulePreview; 