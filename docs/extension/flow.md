# JobTrack 크롬 확장 프로그램 — 사용자 플로우

> **문서 역할**: 확장 프로그램의 전체 사용자 플로우를 Mermaid 다이어그램으로 정의한다.
> **요구사항**: `docs/extension/requirements.md` 참조

---

## 1. 전체 플로우 (메인)

확장 프로그램 아이콘 클릭부터 공고 저장 완료까지의 전체 흐름.

```mermaid
flowchart TD
    Start([사용자: 툴바 확장 아이콘 클릭]) --> PopupOpen[팝업 열림]
    PopupOpen --> CheckToken{토큰 존재 + 유효?}

    %% ── 인증 분기 ──
    CheckToken -- 없음/만료 --> ShowLogin[/로그인 화면 표시/]
    ShowLogin --> ClickLogin([사용자: JobTrack 로그인 클릭])
    ClickLogin --> OpenTab[새 탭: /auth?from=extension]
    OpenTab --> LoginFlow[[인증 플로우 — §2 참조]]
    LoginFlow --> TokenStored[토큰 저장 완료]
    TokenStored --> CheckToken

    %% ── 사이트 확인 ──
    CheckToken -- 유효 --> GetURL[현재 탭 URL 확인]
    GetURL --> CheckSite{지원 사이트?}

    CheckSite -- "아님" --> Unsupported[/미지원 사이트 안내/]
    Unsupported --> End1([종료])

    %% ── 저장 준비 ──
    CheckSite -- "saramin / jobkorea" --> ShowReady[/저장 준비 화면\n현재 URL 표시\n'이 공고 저장하기' 버튼/]
    ShowReady --> ClickSave([사용자: 저장하기 클릭])

    %% ── HTML 추출 ──
    ClickSave --> ExtractHTML[[HTML 추출 — §3 참조]]
    ExtractHTML --> ShowLoading[/파싱 중...\n스피너 표시/]

    %% ── 서버 파싱 ──
    ShowLoading --> CallParse[POST /api/applications/parse-html\nURL + 추출된 HTML 전송]
    CallParse --> ParseResult{파싱 성공?}

    ParseResult -- 실패 --> ShowError[/오류 표시\n재시도 버튼/]
    ShowError --> ClickRetry([사용자: 재시도 클릭])
    ClickRetry --> ClickSave

    %% ── 공고 확인 ──
    ParseResult -- 성공 --> ShowConfirm[/감지된 공고 제목 표시\n'이 공고가 맞나요?'/]
    ShowConfirm --> ConfirmCorrect{맞나요?}

    ConfirmCorrect -- "맞아요" --> ShowForm[/편집 폼 표시/]
    ConfirmCorrect -- "다른 공고" --> ShowOtherList[[다른 공고 선택 — §4 참조]]
    ShowOtherList --> ClickSave

    %% ── 편집 & 저장 ──
    ShowForm --> EditFields([사용자: 필드 확인/수정\n회사명, 포지션, 경력구분\n마감일, 출처])
    EditFields --> ClickFinalSave([사용자: 저장 클릭])
    ClickFinalSave --> CallCreate[POST /api/applications\n지원서 생성 요청]
    CallCreate --> CreateResult{저장 성공?}

    CreateResult -- 실패 --> ShowSaveError[/저장 오류 토스트\n재시도 안내/]
    ShowSaveError --> ClickFinalSave

    CreateResult -- 성공 --> ShowSuccess[/성공 토스트\n'JobTrack에서 보기' 링크/]
    ShowSuccess --> End2([종료])

    %% ── 스타일 ──
    style Start fill:#4f46e5,color:#fff
    style End1 fill:#6b7280,color:#fff
    style End2 fill:#16a34a,color:#fff
    style ShowLoading fill:#fbbf24,color:#000
    style ShowError fill:#ef4444,color:#fff
    style ShowSaveError fill:#ef4444,color:#fff
    style ShowSuccess fill:#16a34a,color:#fff
```

---

## 2. 인증 플로우 (서브)

팝업 → JobTrack 웹 로그인 → 토큰 전달까지의 상세 흐름.

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Popup as 팝업
    participant Web as JobTrack 웹
    participant CS as auth-callback.js<br/>(Content Script)
    participant API as JobTrack API

    User->>Popup: 로그인 버튼 클릭
    Popup->>Web: 새 탭 열기<br/>/auth?from=extension
    Note over Popup: 새 탭이 열리면서<br/>팝업 자동 닫힘

    User->>Web: 이메일/비밀번호 입력
    User->>Web: 로그인 버튼 클릭
    Web->>API: POST /api/auth/login
    API-->>Web: 로그인 성공 + 세션 쿠키

    Web->>Web: /auth/extension-callback 리다이렉트
    Note over CS: content_script 실행 (document_idle)<br/>MutationObserver 등록하고 대기
    Note over Web: 클라이언트 컴포넌트 마운트
    Web->>API: fetch POST /api/auth/extension-token<br/>(세션 쿠키 자동 첨부)
    API-->>Web: { token, expiresAt } (30일)

    Web->>Web: data-extension-token 속성으로<br/>DOM에 토큰 삽입
    CS->>CS: MutationObserver가 속성 감지<br/>chrome.storage.local에 직접 저장

    Web-->>User: "로그인 완료!<br/>확장 프로그램 아이콘을 다시 클릭해주세요"

    User->>Popup: 확장 아이콘 재클릭
    Popup->>Popup: Init → storage 토큰 확인<br/>→ 메인 UI로 전환
```

---

## 3. HTML 추출 플로우 (서브) — 뷰포트 감지

페이지에서 "사용자가 보고 있는 공고"를 자동 판별하여 HTML을 추출하는 흐름.

> 구현 메모: 뷰포트 계산은 실제 페이지 DOM에서 수행한다. `cloneNode(true)`로 분리된 DOM은 레이아웃 정보가 없어 `getBoundingClientRect()`가 유효하지 않을 수 있으므로, 후보 선택 후 선택된 컨테이너와 alternatives만 clone하여 노이즈/속성을 제거한다.

```mermaid
flowchart TD
    Start([저장하기 클릭]) --> Inject[Popup: chrome.scripting.executeScript<br/>extractor.js 실행]

    Inject --> FindContainers[실제 DOM에서<br/>content 셀렉터로 컨테이너 검색]
    FindContainers --> CountCheck{매칭된 컨테이너 수?}

    %% ── 0개: fallback ──
    CountCheck -- "0개" --> GenericFallback[generic fallback 시도<br/>main → article → #content → body]
    GenericFallback --> CloneSelected[선택된 컨테이너 cloneNode]

    %% ── 1개: 바로 추출 ──
    CountCheck -- "1개" --> SingleExtract[해당 컨테이너 선택]
    SingleExtract --> CloneSelected

    %% ── 2개 이상: 뷰포트 감지 ──
    CountCheck -- "2개+" --> ViewportDetect[각 컨테이너의<br/>getBoundingClientRect 계산]
    ViewportDetect --> CalcRatio[뷰포트 내 노출 비율 계산<br/>visibleHeight / viewportHeight]
    CalcRatio --> SelectBest[가장 높은 비율의 컨테이너 선택]
    SelectBest --> CloneSelected

    CloneSelected --> RemoveNoise[clone에서 remove 셀렉터로 불필요 요소 제거<br/>script, style, noscript, iframe, svg<br/>+ 사이트별 추가 제거]
    RemoveNoise --> StripAttrs[style, class, id, data-* 속성 제거]
    StripAttrs --> ReturnHTML[추출된 HTML 반환]

    ReturnHTML --> SendToPopup[Popup으로 HTML 전달]
    SendToPopup --> End([파싱 API 호출로 진행])

    %% ── 스타일 ──
    style Start fill:#4f46e5,color:#fff
    style End fill:#4f46e5,color:#fff
    style ViewportDetect fill:#fbbf24,color:#000
    style CalcRatio fill:#fbbf24,color:#000
    style SelectBest fill:#fbbf24,color:#000
    style GenericFallback fill:#f97316,color:#fff
```

---

## 4. 다른 공고 선택 플로우 (서브)

뷰포트 감지 결과가 틀렸을 때, 사용자가 수동으로 공고를 선택하는 흐름.

```mermaid
flowchart TD
    Start(["사용자: '다른 공고' 클릭"]) --> FetchList[이미 추출한 컨테이너 목록에서<br/>각 공고의 제목 추출]
    FetchList --> ShowList[/공고 목록 표시\n① 삼성전자 - 프론트엔드\n② LG CNS - 백엔드\n③ 카카오 - 데이터/]

    ShowList --> UserSelect([사용자: 원하는 공고 선택])
    UserSelect --> ReExtract[선택된 컨테이너의 HTML 추출]
    ReExtract --> ReParse[해당 HTML로 파싱 API 재호출]
    ReParse --> End([편집 폼 표시로 진행])

    style Start fill:#4f46e5,color:#fff
    style End fill:#4f46e5,color:#fff
```

---

## 5. 팝업 UI 상태 전이

팝업이 가질 수 있는 모든 상태와 전이를 정의한다.

```mermaid
stateDiagram-v2
    [*] --> Init: 팝업 열림

    Init --> Login: 토큰 없음/만료
    Init --> SiteCheck: 토큰 유효

    Login --> SiteCheck: 로그인 완료

    SiteCheck --> Unsupported: 미지원 사이트
    SiteCheck --> Ready: 지원 사이트

    Ready --> Loading: 저장하기 클릭
    Loading --> Confirm: 파싱 성공
    Loading --> Error: 파싱 실패

    Confirm --> Form: 공고 확인 (맞아요)
    Confirm --> OtherSelect: 다른 공고 클릭
    OtherSelect --> Loading: 공고 선택 후 재파싱

    Error --> Loading: 재시도

    Form --> Saving: 저장 클릭
    Saving --> Success: 저장 성공
    Saving --> SaveError: 저장 실패
    SaveError --> Saving: 재시도

    Success --> [*]
    Unsupported --> [*]

    state Login {
        [*] --> ShowLoginButton
        ShowLoginButton --> WaitingAuth: 로그인 클릭 (새 탭 열림)
        Note right of WaitingAuth: 팝업은 포커스를 잃어 자동 닫힘\n사용자가 웹에서 로그인 완료 후\n아이콘 재클릭 시 Init에서 토큰 확인
        WaitingAuth --> [*]: 아이콘 재클릭 → Init → 토큰 유효
    }

    state Form {
        [*] --> EditFields
        EditFields --> EditFields: 필드 수정
        EditFields --> [*]: 저장 클릭
    }
```

---

## 6. 컴포넌트 간 통신 흐름

팝업, Content Script, 서버 간의 메시지 흐름 전체를 시간순으로 정리.

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Popup as 팝업 UI
    participant CS as Content Script<br/>(extractor.js)
    participant API as JobTrack API

    Note over User,API: 공고 저장 플로우

    User->>Popup: 툴바 아이콘 클릭
    Popup->>Popup: chrome.storage.local에서<br/>토큰 조회 + 유효성 확인
    Popup->>Popup: chrome.tabs.query로<br/>현재 탭 URL 확인
    Popup->>Popup: 사이트 판별 (sites.js)
    Popup-->>User: "이 공고 저장하기" 표시

    User->>Popup: 저장하기 클릭
    Popup->>CS: chrome.scripting.executeScript<br/>(siteConfig 전달)

    Note over CS: DOM 클론 → 노이즈 제거 → 컨테이너 검색

    alt 컨테이너 1개
        CS-->>Popup: { html, title }
    else 컨테이너 2개+
        Note over CS: 뷰포트 감지<br/>getBoundingClientRect
        CS-->>Popup: { html, title, alternatives[] }
    end

    Popup->>API: POST /api/applications/parse-html<br/>{ url, html }
    API->>API: HTML 정제 → OpenAI 파싱
    API-->>Popup: { company_name, position, ... }

    Popup-->>User: 공고 확인 화면<br/>"삼성전자 - 프론트엔드, 맞나요?"

    alt 맞아요
        User->>Popup: 확인
    else 다른 공고
        User->>Popup: 다른 공고 선택
        Popup-->>User: 공고 목록 표시 (alternatives)
        User->>Popup: 공고 선택
        Popup->>API: 선택된 HTML로 재파싱<br/>POST /api/applications/parse-html
        API-->>Popup: 파싱 결과
    end

    Popup-->>User: 편집 폼 표시

    User->>Popup: 필드 수정 후 저장 클릭
    Popup->>API: POST /api/applications<br/>{ company_name, position, ... }
    API-->>Popup: 201 Created { id }

    Popup-->>User: 성공 토스트<br/>"JobTrack에서 보기" 링크
```
