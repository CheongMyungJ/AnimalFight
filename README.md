# AnimalFight - 동물 배팅 게임

실시간 멀티플레이어 동물 배팅 게임입니다. 8마리의 동물이 경기장에서 싸우고, 마지막까지 살아남는 동물에 배팅하세요!

## 게임 화면

### 게임 규칙
- 8마리의 동물이 2D 경기장에서 돌아다닙니다
- 동물끼리 충돌하면 서로 데미지를 입습니다 (15~35 랜덤)
- 체력이 0이 되면 탈락합니다
- 마지막 1마리가 남으면 게임 종료!
- 게임은 50초~1분 내에 종료됩니다

### 배팅 시스템
- 시작 코인: 500
- 배팅 범위: 10~100 코인
- 승리 보상: 배팅액 × 참가자수 × 0.95
- 코인이 0이 되면 게임 오버

## 기술 스택

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **Real-time**: WebSocket (Socket.io)

## 설치 및 실행

### 요구사항
- Node.js 16.0 이상

### 설치
```bash
git clone https://github.com/CheongMyungJ/AnimalFight.git
cd AnimalFight
npm install
```

### 실행
```bash
npm start
```

서버가 실행되면 브라우저에서 접속:
- 로컬: http://localhost:3000
- LAN: http://[내 IP]:3000

## 기능

### 방 시스템
- 방 생성 및 참가
- 방 목록에서 참가 가능한 방 확인
- 방 코드로 직접 참가
- 최소 3명, 최대 8명

### 게임
- 8종류의 동물 (사자, 호랑이, 곰, 늑대, 독수리, 상어, 뱀, 악어)
- 실시간 체력바 표시
- 데미지 애니메이션
- 충돌 시 튕김 효과

### 채팅
- 실시간 채팅
- 이모지 피커 지원 (40개 이모지)
- 동물 이모지 포함

### 응원 시스템
- 게임 중 응원 버튼 클릭
- 내가 배팅한 동물 체력 +1 회복
- 1초 쿨다운
- 응원 사운드 효과
- 채팅에 응원 메시지 표시

## 프로젝트 구조

```
AnimalFight/
├── package.json
├── server/
│   ├── index.js              # 서버 진입점
│   ├── config/gameConfig.js  # 게임 설정
│   ├── game/
│   │   ├── Animal.js         # 동물 클래스
│   │   ├── GameEngine.js     # 게임 엔진
│   │   ├── GameRoom.js       # 방 관리
│   │   ├── CollisionManager.js # 충돌 처리
│   │   └── TimingController.js # 게임 타이밍
│   ├── managers/
│   │   └── RoomManager.js    # 방 목록 관리
│   └── socket/
│       ├── socketHandler.js  # 소켓 이벤트
│       └── events.js         # 이벤트 상수
├── public/
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── main.js           # 클라이언트 메인
│   │   ├── SocketClient.js   # 소켓 클라이언트
│   │   ├── GameRenderer.js   # 캔버스 렌더링
│   │   └── UIManager.js      # UI 관리
│   └── assets/images/animals/
│       └── *.svg             # 동물 이미지
```

## 동물 목록

| 이모지 | 이름 | 영문 |
|--------|------|------|
| 🦁 | 사자 | Lion |
| 🐯 | 호랑이 | Tiger |
| 🐻 | 곰 | Bear |
| 🐺 | 늑대 | Wolf |
| 🦅 | 독수리 | Eagle |
| 🦈 | 상어 | Shark |
| 🐍 | 뱀 | Snake |
| 🐊 | 악어 | Crocodile |

## 라이선스

MIT License
