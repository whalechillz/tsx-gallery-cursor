# 투어 스케줄 관리 개선 방안

## 현재 상황
- 투어 스케줄 관리에서 출발 장소, 상세 일정을 입력
- 문서 미리보기에서 해당 내용이 표시됨

## 권장사항

### 1. "(영업용?)" 표시 대신 실제 DB 사용 ✅
- 출발 장소, 상세 일정은 이미 DB에 저장되고 있음
- 관리자가 입력한 실제 내용이 문서에 반영되므로 별도 표시 불필요

### 2. 문서 미리보기 개선 방안
현재 시스템은 이미 DB의 실제 데이터를 사용하고 있습니다:

- **일정표**: tour_journey_items 테이블의 실제 일정
- **탑승지 안내**: tour_boarding_places의 실제 탑승 장소
- **객실 배정**: room_assignments의 실제 배정 정보
- **티타임표**: tee_time_assignments의 실제 티타임

### 3. 데이터 통합 구조
```
singsing_tours (기본 정보)
  ├── tour_journey_items (일정 상세)
  ├── tour_boarding_places (탑승지)
  ├── room_assignments (객실)
  └── tee_time_assignments (티타임)
```

## 결론
현재 시스템이 이미 실제 DB 데이터를 사용하고 있으므로:
- "(영업용?)" 같은 별도 표시는 불필요
- 관리자가 입력한 내용이 그대로 문서에 반영
- 각 문서는 해당하는 DB 테이블의 데이터를 실시간으로 표시
