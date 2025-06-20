# 카카오 알림톡 설정 가이드

## 현재 상태
- 모든 메시지가 SMS/LMS로 발송됩니다.
- 카카오 알림톡을 사용하려면 템플릿 등록이 필요합니다.

## 카카오 알림톡 활성화 방법

### 1. Solapi에서 템플릿 등록
1. [Solapi 콘솔](https://console.solapi.com) 접속
2. 카카오 채널 > 템플릿 관리로 이동
3. 새 템플릿 등록:
   - 템플릿 이름: `싱싱골프 문서 안내` (예시)
   - 템플릿 내용:
   ```
   [싱싱골프] #{이름}님, #{투어명} 관련 문서를 안내드립니다.

   📄 문서 확인하기:
   #{문서링크}

   궁금하신 점은 언제든 문의주세요.
   ☎ 031-215-3990
   ```
4. 템플릿 검수 완료 후 템플릿 ID 확인

### 2. 코드 수정
`/app/api/messages/send-document/route.ts` 파일에서:

1. 주석 처리된 카카오 알림톡 코드 활성화
2. `templateId: "실제_템플릿_ID"` 부분을 실제 템플릿 ID로 변경
3. SMS 전용 코드 주석 처리

### 3. 템플릿 변수 매핑
현재 코드에서 사용하는 변수:
- `#{이름}`: 참가자 이름

추가 가능한 변수:
- `#{투어명}`: 투어 제목
- `#{문서링크}`: 문서 URL
- `#{출발일}`: 투어 출발일

## 장점
- **비용 절감**: SMS(20원) → 카카오 알림톡(9원)
- **높은 도달률**: 카카오톡 알림으로 확인률 증가
- **브랜드 이미지**: 공식 채널로 신뢰도 향상

## 주의사항
- 템플릿은 심사를 통과해야 사용 가능
- 템플릿에 없는 내용은 발송 불가
- 실패 시 자동으로 SMS로 대체 발송 가능 (disableSms: false)
